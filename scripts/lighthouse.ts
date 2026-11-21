// Measures the site with Lighthouse on mobile (ADR 0006 and 0007): builds
// it, serves dist/ with `wrangler dev` (the Worker's own headers, as in the
// end-to-end tests), runs Lighthouse several times on each page of
// scripts/lighthouse-pages.ts in a fresh headless Chromium each time, and keeps the
// median of each category per page.
//
// Usage (from the project's root):
//   npm run lighthouse              writes src/data/lighthouse.json
//   npm run lighthouse -- --check   writes nothing; fails when a page's median
//                                   is below the minimum in any category (CI)
//
// Chromium is Playwright's, in .tools/ms-playwright: run `npm run e2e:install`
// once per checkout.

import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import type { BrowserType } from "@playwright/test";
import lighthouse from "lighthouse";
import {
  categories,
  failures,
  localDay,
  type Measurement,
  measurementOf,
  minimumScore,
  reportCategoryIds,
  reportScore,
  type Scores,
} from "../src/lib/lighthouse.ts";
import { lighthousePort, measuredPages, measurementFile, runsPerPage } from "./lighthouse-pages.ts";
import { browsersPath } from "./playwright-browsers.ts";

const { values: options } = parseArgs({ options: { check: { type: "boolean", default: false } } });
const require = createRequire(import.meta.url);
const baseUrl = `http://localhost:${lighthousePort}`;

/** How long the local server may take to answer its first request. */
const serverStartTimeout = 60_000;

/** Runs a Node.js script to its end, with its output shown; a failure throws. */
function runNode(script: string, args: string[]): void {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) throw new Error(`${script} exited with ${result.status}`);
}

/** The path of a package's file, from its folder in node_modules. */
function packageFile(name: string, file: string): string {
  return join(dirname(require.resolve(`${name}/package.json`)), file);
}

/**
 * Ends the server and the processes it started (workerd): the whole tree on
 * Windows, the whole process group elsewhere, so none is left running.
 */
function stopServer(server: ChildProcess): void {
  if (server.pid === undefined || server.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // The group has already ended.
    }
  }
}

/** Whether a server answers at an address with a success. */
async function answers(url: string): Promise<boolean> {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(5_000) })).ok;
  } catch {
    return false;
  }
}

/**
 * Starts `wrangler dev` on dist/ and resolves once it answers; rejects if it
 * exits first or does not answer in time.
 */
async function startServer(): Promise<ChildProcess> {
  // A server already on the port would answer for this one, and be measured
  // instead of this build.
  if (await answers(baseUrl)) {
    throw new Error(`${baseUrl} already answers: stop the server on port ${lighthousePort} first`);
  }
  const server = spawn(
    process.execPath,
    [packageFile("wrangler", "bin/wrangler.js"), "dev", "--port", String(lighthousePort)],
    {
      // Its own process group outside Windows, so stopServer ends its children too.
      detached: process.platform !== "win32",
      stdio: ["ignore", "ignore", "inherit"],
      // No usage data is sent from the local Worker server.
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  const exited = new Promise<never>((_, reject) => {
    server.once("error", reject);
    server.once("exit", (code) => reject(new Error(`wrangler dev exited with ${code}`)));
  });
  const answered = (async () => {
    const deadline = Date.now() + serverStartTimeout;
    while (Date.now() < deadline) {
      if (await answers(baseUrl)) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`${baseUrl} did not answer within ${serverStartTimeout / 1000} s`);
  })();
  try {
    await Promise.race([answered, exited]);
  } catch (error) {
    stopServer(server);
    throw error;
  }
  // Once it answers, a later exit is reported by the failing measurements.
  exited.catch(() => {});
  return server;
}

/** How long Chromium may take to write the port of its DevTools server. */
const devToolsPortTimeout = 15_000;

/**
 * The port of Chromium's DevTools server: Chromium, started with
 * `--remote-debugging-port=0`, picks a free port and writes it on the first
 * line of DevToolsActivePort in its profile folder once it listens.
 */
async function devToolsPort(profile: string): Promise<number> {
  const file = join(profile, "DevToolsActivePort");
  const deadline = Date.now() + devToolsPortTimeout;
  while (Date.now() < deadline) {
    const port = Number.parseInt(
      (await readFile(file, "utf8").catch(() => "")).split("\n")[0] ?? "",
      10,
    );
    if (Number.isInteger(port) && port > 0) return port;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Chromium did not write ${file} within ${devToolsPortTimeout / 1000} s`);
}

/**
 * One mobile Lighthouse run of a page, in a fresh headless Chromium with an
 * empty profile, launched by Playwright; a failed run throws.
 */
async function measure(
  url: string,
  chromium: BrowserType,
): Promise<{ scores: Scores; version: string }> {
  const profile = await mkdtemp(join(tmpdir(), "sekoya-lighthouse-"));
  try {
    const context = await chromium.launchPersistentContext(profile, {
      headless: true,
      args: ["--remote-debugging-port=0"],
    });
    try {
      const result = await lighthouse(url, {
        port: await devToolsPort(profile),
        logLevel: "error",
        output: "json",
        onlyCategories: categories.map((category) => reportCategoryIds[category]),
      });
      if (result === undefined) throw new Error(`Lighthouse returned no result for ${url}`);
      const { lhr } = result;
      if (lhr.runtimeError !== undefined) {
        throw new Error(`Lighthouse failed on ${url}: ${lhr.runtimeError.message}`);
      }
      // Lighthouse's defaults: a phone, with simulated throttling.
      const { formFactor, throttlingMethod } = lhr.configSettings;
      if (formFactor !== "mobile" || throttlingMethod !== "simulate") {
        throw new Error(`${url} was measured as ${formFactor} with ${throttlingMethod} throttling`);
      }
      const scores = Object.fromEntries(
        categories.map((category) => [
          category,
          reportScore(lhr.categories[reportCategoryIds[category]]?.score, category),
        ]),
      ) as Record<(typeof categories)[number], number>;
      return { scores, version: lhr.lighthouseVersion };
    } finally {
      await context.close();
    }
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}

/** The medians of each page, as a table. */
function printTable(measurement: Measurement): void {
  console.table(
    Object.fromEntries([
      ...Object.entries(measurement.pages),
      ["lowest (the site's figure)", measurement.summary],
    ]),
  );
}

async function main(): Promise<void> {
  // Playwright reads the variable when it loads, so it is loaded afterwards.
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  const { chromium } = await import("@playwright/test");

  runNode(packageFile("astro", "bin/astro.mjs"), ["build"]);

  const server = await startServer();
  const stopOnSignal = () => {
    stopServer(server);
    process.exit(130);
  };
  process.once("SIGINT", stopOnSignal);
  process.once("SIGTERM", stopOnSignal);
  try {
    const runsByPage: Record<string, Scores[]> = {};
    const versions = new Set<string>();
    for (const path of measuredPages) {
      runsByPage[path] = [];
      for (let run = 1; run <= runsPerPage; run += 1) {
        const { scores, version } = await measure(`${baseUrl}${path}`, chromium);
        runsByPage[path].push(scores);
        versions.add(version);
        console.log(
          `${path} run ${run}/${runsPerPage}: ${categories.map((c) => scores[c]).join(" ")}`,
        );
      }
    }

    const measurement = measurementOf(runsByPage, {
      measuredOn: localDay(new Date()),
      lighthouse: [...versions].join(", "),
      runs: runsPerPage,
    });
    printTable(measurement);

    if (options.check) {
      const below = failures(measurement);
      if (below.length > 0) {
        console.error(`Below ${minimumScore} (page, category, median):\n${below.join("\n")}`);
        process.exitCode = 1;
      } else {
        console.log(`Every page's median is at least ${minimumScore} in every category.`);
      }
    } else {
      mkdirSync(dirname(measurementFile), { recursive: true });
      writeFileSync(measurementFile, `${JSON.stringify(measurement, null, 2)}\n`);
      console.log(`Wrote ${measurementFile}.`);
    }
  } finally {
    process.off("SIGINT", stopOnSignal);
    process.off("SIGTERM", stopOnSignal);
    stopServer(server);
  }
}

await main();
