// Local storage. Cases, documents and district profiles live in this browser's IndexedDB and nowhere else.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Override } from '../core/evaluate.ts';
import type { DistrictProfile, DocTokens, Extraction } from '../core/types.ts';

export type CaseStatus = 'uploaded' | 'extracted' | 'reviewed' | 'finalised';
export const STATUS_ORDER: CaseStatus[] = ['uploaded', 'extracted', 'reviewed', 'finalised'];
export const STATUS_LABEL: Record<CaseStatus, string> = { uploaded: 'Uploaded', extracted: 'Extracted', reviewed: 'Reviewed', finalised: 'Finalised' };

export interface Note {
  id: string;
  at: string;
  by: string;
  text: string;
}

export interface LogEntry {
  at: string;
  by: string;
  action: string;
  detail?: string;
}

export interface CaseRecord {
  id: string;
  /** Sequential register number, shown as EV-0007. */
  number: number;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  fileName: string;
  fileType: string;
  engine: string;
  districtId: string;
  extraction: Extraction | null;
  overrides: Record<string, Override>;
  /** Ids of "items to verify" a person has checked off. */
  resolved: string[];
  notes: Note[];
  log: LogEntry[];
  error?: string;
}

export interface StoredFile {
  name: string;
  type: string;
  blob: Blob;
}

export interface CaseDoc {
  caseId: string;
  files: StoredFile[];
  /** Script hint chosen at upload ("auto" by default). */
  hint: string;
  tokens: DocTokens | null;
  previews: (Blob | null)[];
}

export interface Settings {
  counselor: string;
  districtId: string;
  ollamaUrl: string;
  ollamaModel: string;
  aiEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = { counselor: '', districtId: 'generic-22', ollamaUrl: 'http://localhost:11434', ollamaModel: '', aiEnabled: false };

interface Schema extends DBSchema {
  cases: { key: string; value: CaseRecord; indexes: { updatedAt: string } };
  docs: { key: string; value: CaseDoc };
  districts: { key: string; value: DistrictProfile };
  settings: { key: string; value: Settings };
}

let dbp: Promise<IDBPDatabase<Schema>> | null = null;
function db() {
  dbp ??= openDB<Schema>('evalua', 1, {
    upgrade(d) {
      const cases = d.createObjectStore('cases', { keyPath: 'id' });
      cases.createIndex('updatedAt', 'updatedAt');
      d.createObjectStore('docs', { keyPath: 'caseId' });
      d.createObjectStore('districts', { keyPath: 'id' });
      d.createObjectStore('settings');
    },
  });
  return dbp;
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
export const now = () => new Date().toISOString();

export async function listCases(): Promise<CaseRecord[]> {
  const all = await (await db()).getAll('cases');
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export const getCase = async (id: string) => (await db()).get('cases', id);
export async function putCase(c: CaseRecord) {
  c.updatedAt = now();
  await (await db()).put('cases', c);
}
export const getDoc = async (caseId: string) => (await db()).get('docs', caseId);
export const putDoc = async (d: CaseDoc) => void (await (await db()).put('docs', d));
export async function deleteCase(id: string) {
  const d = await db();
  await d.delete('cases', id);
  await d.delete('docs', id);
}
export async function nextNumber(): Promise<number> {
  const all = await (await db()).getAll('cases');
  return all.reduce((m, c) => Math.max(m, c.number), 0) + 1;
}

export const listDistricts = async () => (await db()).getAll('districts');
export const putDistrict = async (p: DistrictProfile) => void (await (await db()).put('districts', p));
export const deleteDistrict = async (id: string) => (await db()).delete('districts', id);

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await (await db()).get('settings', 'main')) ?? {}) };
}
export const putSettings = async (s: Settings) => void (await (await db()).put('settings', s, 'main'));

/** Removes everything evalua has stored in this browser. */
export async function wipeAll() {
  const d = await db();
  await Promise.all([d.clear('cases'), d.clear('docs'), d.clear('districts'), d.clear('settings')]);
}

export const caseLabel = (c: CaseRecord) => `EV-${String(c.number).padStart(4, '0')}`;
