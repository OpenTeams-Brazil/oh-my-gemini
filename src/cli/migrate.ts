import { join } from "node:path";
import { getBaseStateDir } from "../mcp/state-paths.js";
import { migrateJsonToSqlite } from "../state/migrate.js";

export async function migrateCommand(args: string[]) {
  const workingDir = process.cwd();
  const omgStateDir = join(workingDir, ".omg", "state");
  
  console.log(`Checking for legacy state in ${omgStateDir}...`);
  
  try {
    await migrateJsonToSqlite(omgStateDir);
    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}
