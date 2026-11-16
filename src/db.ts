import * as SQLite from "expo-sqlite";
import type { NewScanInput, ScanRecord } from "./types";

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync("nfc_defteri.db");
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      kind TEXT NOT NULL,
      uidHex TEXT NOT NULL,
      techTypes TEXT NOT NULL,
      ndefHex TEXT,
      ndefPreview TEXT,
      writable INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
  `);
  dbInstance = db;
  return db;
}

export async function insertScan(input: NewScanInput): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO scans (label, kind, uidHex, techTypes, ndefHex, ndefPreview, writable, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.label,
      input.kind,
      input.uidHex,
      JSON.stringify(input.techTypes),
      input.ndefHex,
      input.ndefPreview,
      input.writable ? 1 : 0,
      new Date().toISOString(),
    ]
  );
  return result.lastInsertRowId;
}

export async function listScans(): Promise<ScanRecord[]> {
  const db = await getDb();
  return db.getAllAsync<ScanRecord>(
    `SELECT * FROM scans ORDER BY createdAt DESC`
  );
}

export async function getScan(id: number): Promise<ScanRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ScanRecord>(
    `SELECT * FROM scans WHERE id = ?`,
    [id]
  );
  return row ?? null;
}

export async function updateScanContent(
  id: number,
  ndefHex: string,
  ndefPreview: string | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE scans SET ndefHex = ?, ndefPreview = ?, writable = 1 WHERE id = ?`,
    [ndefHex, ndefPreview, id]
  );
}

export async function renameScan(id: number, label: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE scans SET label = ? WHERE id = ?`, [label, id]);
}

export async function deleteScan(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM scans WHERE id = ?`, [id]);
}

export async function setActiveScan(id: number): Promise<void> {
  const db = await getDb();
  await db.execAsync(`UPDATE scans SET isActive = 0`);
  await db.runAsync(`UPDATE scans SET isActive = 1 WHERE id = ?`, [id]);
}

export async function clearActiveScan(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`UPDATE scans SET isActive = 0`);
}
