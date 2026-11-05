// Archivio delle sessioni sul dispositivo della persona (localStorage).
// Sostituisce il db del runtime degli artefatti Claude.

import { CONSAPEVOLEZZE, TIPI_DISFLUENZA, ZONE_DI_TENSIONE } from './types';
import type { ParolaLetta, Sessione } from './types';

const CHIAVE = 'novedecimi.sessions';

function leggi(): Sessione[] {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return [];
    const dati: unknown = JSON.parse(grezzo);
    return Array.isArray(dati) ? (dati as Sessione[]) : [];
  } catch {
    return [];
  }
}

function scrivi(sessioni: Sessione[]): boolean {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(sessioni));
    return true;
  } catch {
    return false;
  }
}

/** Tutte le sessioni salvate, dalla meno recente alla più recente. */
export function elencaSessioni(): Sessione[] {
  return leggi().sort((a, b) => a.ts - b.ts);
}

/** Salva la sessione; false se il browser non permette di salvare. */
export function aggiungiSessione(s: Sessione): boolean {
  return scrivi([...leggi(), s]);
}

const VERSIONE_BACKUP = 1;

interface Backup {
  app: 'novedecimi';
  versione: number;
  sessioni: Sessione[];
}

/** Copia completa dello storico, da salvare come file JSON. */
export function esportaBackup(): string {
  const backup: Backup = { app: 'novedecimi', versione: VERSIONE_BACKUP, sessioni: elencaSessioni() };
  return JSON.stringify(backup, null, 2);
}

export interface EsitoImport {
  aggiunte: number;
  ignorate: number;
}

function numero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** null se assente, il valore se ammesso, undefined se non ammesso. */
function valoreAmmesso<T extends string>(v: unknown, ammessi: readonly T[]): T | null | undefined {
  if (v === null || v === undefined) return null;
  return ammessi.includes(v as T) ? (v as T) : undefined;
}

function parolaValida(v: unknown): ParolaLetta | null {
  if (typeof v !== 'object' || v === null) return null;
  const p = v as Record<string, unknown>;
  if (typeof p.word !== 'string' || typeof p.ok !== 'boolean') return null;
  const type = valoreAmmesso(p.type, TIPI_DISFLUENZA);
  const when = valoreAmmesso(p.when, CONSAPEVOLEZZE);
  const where = valoreAmmesso(p.where, ZONE_DI_TENSIONE);
  if (type === undefined || when === undefined || where === undefined) return null;
  return { word: p.word, ok: p.ok, type, when, where };
}

/** Ricostruisce una sessione da dati esterni; null se qualcosa non è ammesso. */
function sessioneValida(v: unknown): Sessione | null {
  if (typeof v !== 'object' || v === null) return null;
  const s = v as Record<string, unknown>;
  if (![s.ts, s.total, s.ok, s.diff, s.pct].every(numero)) return null;
  if (typeof s.date !== 'string' || typeof s.focusMode !== 'boolean' || !Array.isArray(s.words)) return null;
  const words = s.words.map(parolaValida);
  if (words.some((w) => w === null)) return null;
  return {
    ts: s.ts as number,
    date: s.date,
    total: s.total as number,
    ok: s.ok as number,
    diff: s.diff as number,
    pct: s.pct as number,
    focusMode: s.focusMode,
    words: words as ParolaLetta[],
  };
}

/** Il file scelto non è un backup di Novedecimi. */
export class BackupNonValido extends Error {
  constructor() {
    super('Il file non è un backup di Novedecimi.');
    this.name = 'BackupNonValido';
  }
}

function leggiBackup(json: string): { sessioni: unknown[] } {
  let dati: unknown;
  try {
    dati = JSON.parse(json);
  } catch {
    throw new BackupNonValido();
  }
  const b = dati as Partial<Record<keyof Backup, unknown>> | null;
  if (typeof b !== 'object' || b === null || b.app !== 'novedecimi' || !Array.isArray(b.sessioni)) {
    throw new BackupNonValido();
  }
  return { sessioni: b.sessioni };
}

/**
 * Unisce allo storico le sessioni valide di un backup, senza duplicarle.
 * Lancia BackupNonValido se il file non è un backup di Novedecimi.
 */
export function importaBackup(json: string): EsitoImport {
  const backup = leggiBackup(json);
  const presenti = leggi();
  const giaPresenti = new Set(presenti.map((s) => s.ts));
  const nuove: Sessione[] = [];
  for (const grezza of backup.sessioni) {
    const s = sessioneValida(grezza);
    if (s && !giaPresenti.has(s.ts)) {
      nuove.push(s);
      giaPresenti.add(s.ts);
    }
  }
  scrivi([...presenti, ...nuove]);
  return { aggiunte: nuove.length, ignorate: backup.sessioni.length - nuove.length };
}
