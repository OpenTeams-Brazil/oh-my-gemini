import { getDb } from "../state/sqlite.js";
import { join } from "node:path";

export interface HudEvent {
  id: number;
  type: string;
  payload: any;
  created_at: string;
}

export function getLatestHudEvents(limit: number = 10): HudEvent[] {
  try {
    const db = getDb(join(process.cwd(), ".omg"));
    const stmt = db.prepare(`
      SELECT id, type, payload, created_at 
      FROM events 
      ORDER BY id DESC 
      LIMIT ?
    `);
    
    return stmt.all(limit).map((r: any) => ({
      ...r,
      payload: JSON.parse(r.payload)
    }));
  } catch {
    return [];
  }
}

export function getActiveTasks() {
  try {
    const db = getDb(join(process.cwd(), ".omg"));
    const stmt = db.prepare(`
      SELECT id, slug, status, updated_at 
      FROM tasks 
      WHERE status = 'active'
      ORDER BY updated_at DESC
    `);
    
    return stmt.all();
  } catch {
    return [];
  }
}
