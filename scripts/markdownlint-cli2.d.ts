// markdownlint-cli2 ships no type declarations; this covers the one function
// scripts/markdown.ts uses (its `main`, which resolves to the exit code).
declare module "markdownlint-cli2" {
  export function main(params: {
    argv: string[];
    logMessage?: (message: string) => void;
    logError?: (message: string) => void;
  }): Promise<number>;
}
