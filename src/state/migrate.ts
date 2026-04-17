import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { getDb } from "./sqlite.js";

export async function migrateJsonToSqlite(omgStateDir: string) {
  const db = getDb(join(omgStateDir, ".."));
  const files = await readdir(omgStateDir);
  const stateFiles = files.filter(f => f.endsWith("-state.json"));

  const insertTask = db.prepare(`
    INSERT OR REPLACE INTO tasks (id, slug, status, data)
    VALUES (?, ?, ?, ?)
  `);

  for (const file of stateFiles) {
    try {
      const content = await readFile(join(omgStateDir, file), "utf-8");
      const data = JSON.parse(content);
      const mode = file.replace("-state.json", "");
      
      // Basic migration: treat each mode state as a task for now
      // This can be refined as we understand more mode structures
      insertTask.run(
        mode,
        mode,
        data.active ? "active" : "complete",
        content
      );
      
      console.log(`Migrated ${file} to SQLite`);
    } catch (err) {
      console.error(`Failed to migrate ${file}:`, err);
    }
  }
}
