import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // cjs for the Nest backend (require), esm for the Next frontend (import) —
  // keeps tree-shaking available to whichever consumer bundles with ESM.
  format: ['cjs', 'esm'],
  dts: false,
  sourcemap: false,
  clean: true,
});
