import { existsSync, readFileSync } from "node:fs";
import { measurementFile } from "../scripts/lighthouse-pages";
import { type Measurement, parseMeasurement } from "../src/lib/lighthouse";

/** This site's Lighthouse measurement, as committed, or `undefined` when it has none yet. */
export function committedMeasurement(): Measurement | undefined {
  const file = new URL(`../${measurementFile}`, import.meta.url);
  return existsSync(file) ? parseMeasurement(JSON.parse(readFileSync(file, "utf8"))) : undefined;
}
