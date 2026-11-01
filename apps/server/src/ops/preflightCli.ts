import { config as loadDotEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { productionPreflight } from "./preflight.js";

loadDotEnv({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
});
const report = productionPreflight(process.env);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.valid ? 0 : 1;
