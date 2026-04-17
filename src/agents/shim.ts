import { getDb } from "../state/sqlite.js";
import { join } from "node:path";

export interface ToolMapping {
  legacy: string;
  native: string;
}

const TOOL_MAPPINGS: Record<string, string> = {
  "ReplaceText": "replace",
  "ReadFile": "read_file",
  "WriteFile": "write_file",
  "ListDirectory": "list_directory",
  "GrepSearch": "grep_search",
  "RunShellCommand": "run_shell_command",
  "AskUser": "ask_user",
  "SaveMemory": "save_memory",
};

export function translateToolName(legacyName: string): string {
  return TOOL_MAPPINGS[legacyName] || legacyName;
}

export function logToolCall(
  legacyName: string,
  nativeName: string,
  args: any,
  status: string,
  result: any = null
) {
  try {
    const db = getDb(join(process.cwd(), ".omg"));
    // Find the latest event for the current session to associate with
    // For now, we'll just log it. We might need a better way to find the event_id.
    const stmt = db.prepare(`
      INSERT INTO tool_calls (legacy_name, native_name, arguments, status, result)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      legacyName,
      nativeName,
      JSON.stringify(args),
      status,
      result ? JSON.stringify(result) : null
    );
  } catch (err) {
    // Silent fail for logging to avoid breaking execution
    console.error("[shim] failed to log tool call:", err);
  }
}

export function getUnmappedTools(): string[] {
  try {
    const db = getDb(join(process.cwd(), ".omg"));
    const stmt = db.prepare(`
      SELECT DISTINCT legacy_name 
      FROM tool_calls 
      WHERE legacy_name = native_name 
      AND legacy_name NOT IN (${Object.values(TOOL_MAPPINGS).map(() => "?").join(",")})
    `);
    
    return stmt.all(...Object.values(TOOL_MAPPINGS)).map((r: any) => r.legacy_name);
  } catch {
    return [];
  }
}
