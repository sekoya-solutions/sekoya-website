import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { publicFileExists } from "./public-files";

const root = mkdtempSync(join(tmpdir(), "public-files-"));
mkdirSync(join(root, "public"));
writeFileSync(join(root, "public", "cv.pdf"), "");

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("publicFileExists", () => {
  it("finds a file of public/ by the path the site serves it at", () => {
    expect(publicFileExists("/cv.pdf", root)).toBe(true);
    expect(publicFileExists("/other.pdf", root)).toBe(false);
  });

  it("rejects a path that does not start at the site's root", () => {
    expect(() => publicFileExists("cv.pdf", root)).toThrow("cv.pdf must start with /");
  });
});
