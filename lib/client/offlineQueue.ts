"use client";

import { api, ApiError } from "./api";

// File d'attente hors ligne des Courses (section 10.7) : les écritures faites sans réseau sont gardées
// sur le téléphone (IndexedDB) puis rejouées dans l'ordre au retour du réseau.

export interface QueuedOp {
  key?: number;
  path: string;
  method: string;
  body?: string;
}

const DB = "casa";
const STORE = "queue";

let memory: QueuedOp[] = []; // si IndexedDB est indisponible (navigation privée)
let memoryKey = 0;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "key", autoIncrement: true });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function all(): Promise<QueuedOp[]> {
  const rows = await tx("readonly", (s) => s.getAll() as IDBRequest<QueuedOp[]>);
  return rows ? rows.sort((a, b) => a.key! - b.key!) : [...memory];
}

async function push(op: QueuedOp): Promise<void> {
  const ok = await tx("readwrite", (s) => s.add(op));
  if (ok === null) memory.push({ ...op, key: ++memoryKey });
}

async function drop(key: number): Promise<void> {
  const ok = await tx("readwrite", (s) => s.delete(key));
  if (ok === null) memory = memory.filter((o) => o.key !== key);
}

// ---------- Compteur partagé avec l'interface ----------

let pending = 0;
const listeners = new Set<(n: number) => void>();
const setPending = (n: number) => {
  pending = n;
  listeners.forEach((l) => l(n));
};
export const pendingCount = () => pending;
export function onPendingChange(l: (n: number) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export async function refreshPending(): Promise<void> {
  setPending((await all()).length);
}

/**
 * Envoie tout de suite si possible ; sinon garde l'écriture pour plus tard.
 * Une écriture passe aussi en file s'il en reste d'autres en attente, pour garder l'ordre.
 */
export async function sendOrQueue(path: string, init: { method: string; body?: string }): Promise<void> {
  const op: QueuedOp = { path, method: init.method, body: init.body };
  if (!navigator.onLine || pending > 0) {
    await push(op);
    setPending(pending + 1);
    if (navigator.onLine) void flush();
    return;
  }
  try {
    await api(path, init);
  } catch (err) {
    if (err instanceof ApiError) throw err; // refus du serveur : l'interface revient en arrière
    await push(op); // réseau coupé en cours de route
    setPending(pending + 1);
  }
}

let flushing: Promise<boolean> | null = null;

/** Rejoue la file dans l'ordre. Renvoie vrai si elle est vide à la fin. */
export function flush(): Promise<boolean> {
  flushing ??= (async () => {
    try {
      for (const op of await all()) {
        try {
          await api(op.path, { method: op.method, body: op.body });
        } catch (err) {
          if (!(err instanceof ApiError)) return false; // toujours pas de réseau : on réessaiera
          if (err.status === 401) return false;
          // Refusée (article déjà supprimé par l'autre…) : on l'abandonne et on continue.
        }
        await drop(op.key!);
        setPending(Math.max(0, pending - 1));
      }
      return true;
    } finally {
      flushing = null;
      await refreshPending();
    }
  })();
  return flushing;
}
