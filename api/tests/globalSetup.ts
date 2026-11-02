import { execSync } from "child_process";

// Non-destructive: applies pending migrations and idempotently seeds reference data in the test database.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL || "postgresql://truck:truck@localhost:5432/truckmarket_test?schema=public";
  const env = { ...process.env, DATABASE_URL: url, NODE_ENV: "test" };
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
}
