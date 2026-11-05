// Archivio delle sessioni sul dispositivo della persona (localStorage).
// Sostituisce il db del runtime degli artefatti Claude.

import { CONSAPEVOLEZZE, DOVE_NELLA_FRASE, MODALITA, TIPI_DISFLUENZA, ZONE_DI_TENSIONE, inOrdine } from './types';
import type { ParolaLetta, Sessione } from './types';

const CHIAVE = 'novedecimi.sessions';

function leggi(): Sessione[] {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return [];
    const dati: unknown = JSON.parse(grezzo);
    if (!Array.isArray(dati)) return [];
    // I dati salvati prima delle scelte multiple si convertono alla lettura.
    return dati.map(sessioneValida).filter((s): s is Sessione => s !== null);
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

const VERSIONE_BACKUP = 2;

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

/**
 * Una lista di valori ammessi. Accetta anche la forma della versione 1, con un
 * valore solo o null; undefined se c'è un valore non ammesso.
 */
function listaAmmessa<T extends string>(v: unknown, ammessi: readonly T[]): T[] | undefined {
  if (v === null || v === undefined) return [];
  const valori = Array.isArray(v) ? v : [v];
  if (!valori.every((x) => ammessi.includes(x as T))) return undefined;
  return inOrdine(valori as T[], ammessi);
}

/** Ricostruisce una parola da dati salvati o esterni; null se qualcosa non è ammesso. */
export function normalizzaParola(v: unknown): ParolaLetta | null {
  if (typeof v !== 'object' || v === null) return null;
  const p = v as Record<string, unknown>;
  if (typeof p.word !== 'string' || typeof p.ok !== 'boolean') return null;
  const type = listaAmmessa(p.type, TIPI_DISFLUENZA);
  const when = valoreAmmesso(p.when, CONSAPEVOLEZZE);
  const where = listaAmmessa(p.where, ZONE_DI_TENSIONE);
  const inFrase = listaAmmessa(p.inFrase, DOVE_NELLA_FRASE);
  if (type === undefined || when === undefined || where === undefined || inFrase === undefined) return null;
  return { word: p.word, ok: p.ok, type, when, where, inFrase };
}

/** Ricostruisce una sessione da dati salvati o esterni; null se qualcosa non è ammesso. */
export function sessioneValida(v: unknown): Sessione | null {
  if (typeof v !== 'object' || v === null) return null;
  const s = v as Record<string, unknown>;
  if (![s.ts, s.total, s.ok, s.diff, s.pct].every(numero)) return null;
  if (typeof s.date !== 'string' || typeof s.focusMode !== 'boolean' || !Array.isArray(s.words)) return null;
  // Le sessioni salvate prima delle modalità sono in modalità parola.
  const modalita = valoreAmmesso(s.modalita, MODALITA);
  if (modalita === undefined) return null;
  const words = s.words.map(normalizzaParola);
  if (words.some((w) => w === null)) return null;
  return {
    ts: s.ts as number,
    date: s.date,
    total: s.total as number,
    ok: s.ok as number,
    diff: s.diff as number,
    pct: s.pct as number,
    focusMode: s.focusMode,
    modalita: modalita ?? 'parola',
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
