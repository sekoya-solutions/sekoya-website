/**
 * This site's Lighthouse measurement, read at build time from
 * src/data/lighthouse.json, which `npm run lighthouse` writes (ADR 0007).
 * A glob, unlike an import, finds no file instead of failing the build, so a
 * checkout without the file builds, and its pages say the measurement is
 * pending.
 */
import { type Measurement, measurementFromFiles } from "./lighthouse";

export const siteMeasurement: Measurement | undefined = measurementFromFiles(
  import.meta.glob<unknown>("../data/lighthouse.json", { eager: true, import: "default" }),
);
