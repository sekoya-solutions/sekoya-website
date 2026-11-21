/**
 * Helpers for the content tests: comparing the entries of a collection
 * across languages, field by field.
 */

/** Every leaf of a JSON value, by its dotted path, array items included. */
export function leaves(value: unknown, path = ""): Map<string, unknown> {
  if (typeof value !== "object" || value === null) return new Map([[path, value]]);
  const result = new Map<string, unknown>();
  for (const [key, item] of Object.entries(value)) {
    for (const entry of leaves(item, path === "" ? key : `${path}.${key}`)) result.set(...entry);
  }
  return result;
}

/** The leaves whose last field name matches `fields`: the values every language shares. */
export function sharedLeaves(entry: unknown, fields: RegExp): [string, unknown][] {
  return [...leaves(entry)].filter(([path]) => fields.test(path));
}
