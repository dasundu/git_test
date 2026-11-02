import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["tests/globalSetup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL || "postgresql://truck:truck@localhost:5432/truckmarket_test?schema=public",
      DIRECT_URL: process.env.TEST_DATABASE_URL || "postgresql://truck:truck@localhost:5432/truckmarket_test?schema=public",
    },
    testTimeout: 20000,
    fileParallelism: false,
  },
});
