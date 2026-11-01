import { config as loadDotEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { maintainData } from "./retention.js";

loadDotEnv({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
});
let pool: Pool | undefined;
try {
  const args = process.argv.slice(2);
  let apply = false;
  let eraseAccount: string | undefined;
  while (args.length) {
    const argument = args.shift();
    if (argument === "--apply" && !apply) apply = true;
    else if (argument === "--erase-account" && eraseAccount === undefined) {
      eraseAccount = args.shift();
      if (!eraseAccount || !/^[A-Za-z0-9-]{1,128}$/.test(eraseAccount))
        throw new Error("arguments");
    } else throw new Error("arguments");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("database_configuration");
  let target: URL;
  try {
    target = new URL(connectionString);
  } catch {
    throw new Error("database_configuration");
  }
  if (!["postgres:", "postgresql:"].includes(target.protocol))
    throw new Error("database_configuration");
  pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5000,
    query_timeout: 30_000,
  });
  const result = await maintainData(pool, {
    apply,
    ...(eraseAccount ? { eraseAccount } : {}),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const reason =
    error instanceof Error &&
    ["arguments", "database_configuration"].includes(error.message)
      ? error.message
      : "transaction_failed_or_account_protected";
  process.stderr.write(
    `${JSON.stringify({ error: "maintenance_failed", reason })}\n`,
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}
