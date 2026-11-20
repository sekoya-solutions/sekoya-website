import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { changedFiles, decide, isDocumentationOnly } from "./changes.ts";

describe("isDocumentationOnly", () => {
  it("is true when every path is Markdown", () => {
    expect(isDocumentationOnly(["README.md", "docs/adr/0001-framework-and-rendering.md"])).toBe(
      true,
    );
  });

  it("is false when any path is not Markdown", () => {
    expect(isDocumentationOnly(["README.md", "src/pages/index.astro"])).toBe(false);
  });

  it("is false for an empty list, so that every job runs", () => {
    expect(isDocumentationOnly([])).toBe(false);
  });

  it("does not treat other extensions ending in md as Markdown", () => {
    expect(isDocumentationOnly(["notes.mdx", "page.cmd"])).toBe(false);
  });
});

describe("changedFiles and decide, on a real repository", () => {
  let repo = "";
  const commits = new Map<string, string>();

  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();

  const commit = (name: string) => {
    git("add", "--all");
    git("commit", "--quiet", "--message", name);
    commits.set(name, git("rev-parse", "HEAD"));
  };

  const id = (name: string) => {
    const value = commits.get(name);
    if (value === undefined) {
      throw new Error(`No commit named ${name}`);
    }
    return value;
  };

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), "changes-test-"));
    git("init", "--quiet");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Test");
    git("config", "commit.gpgsign", "false");
    git("config", "core.autocrlf", "false");
    writeFileSync(join(repo, "code.ts"), "export const value = 1;\n");
    writeFileSync(join(repo, "README.md"), "# Test\n");
    commit("initial");
    writeFileSync(join(repo, "README.md"), "# Test\n\nMore.\n");
    commit("docs");
    git("mv", "code.ts", "code.md");
    commit("rename");
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("lists a Markdown-only change as documentation only", () => {
    expect(changedFiles(id("initial"), id("docs"), repo)).toEqual(["README.md"]);
    expect(decide(id("initial"), id("docs"), repo)).toBe(true);
  });

  it("lists both sides of a rename, so renaming code to Markdown is not documentation only", () => {
    expect(changedFiles(id("docs"), id("rename"), repo).sort()).toEqual(["code.md", "code.ts"]);
    expect(decide(id("docs"), id("rename"), repo)).toBe(false);
  });

  it("runs every job when there is no base commit", () => {
    expect(decide(undefined, id("docs"), repo)).toBe(false);
    expect(decide("", id("docs"), repo)).toBe(false);
    expect(decide("0000000000000000000000000000000000000000", id("docs"), repo)).toBe(false);
  });

  it("fails rather than guessing when a commit is unknown", () => {
    expect(() => decide("1234567", id("docs"), repo)).toThrow();
  });
});
