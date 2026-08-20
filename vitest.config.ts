import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws on import outside Next's react-server condition.
      // Every src/lib/db/* module imports it -- that import is what stops a
      // client bundle pulling in better-sqlite3, so it stays in the source and
      // is stubbed here instead. Without this alias no data-access module can
      // be imported by a test at all.
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
});
