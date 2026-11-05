// Archivio delle sessioni nel browser (localStorage). Senza account lo
// storico sta sotto una chiave comune; con l'account Google sotto una chiave
// per account, così due persone sullo stesso browser non si mescolano
// (ADR 0002). La copia su Drive la gestisce src/shared/sincronizza.ts.

import { CONSAPEVOLEZZE, DOVE_NELLA_FRASE, MODALITA, TIPI_DISFLUENZA, ZONE_DI_TENSIONE, inOrdine } from './types';
import type { ParolaLetta, Sessione } from './types';

const CHIAVE_SENZA_ACCOUNT = 'novedecimi.sessions';
const CHIAVE_ACCOUNT = 'novedecimi.account';

export interface Account {
  /** Identificativo stabile dell'account Google. */
  sub: string;
  email: string;
}

/** L'account con cui la persona è entrata in questo browser, oppure null. */
export function accountAttivo(): Account | null {
  try {
    const a = JSON.parse(localStorage.getItem(CHIAVE_ACCOUNT) ?? 'null') as Account | null;
    return a && typeof a.sub === 'string' && typeof a.email === 'string' ? a : null;
  } catch {
    return null;
  }
}

/** Prefisso delle chiavi dell'account attivo, per gli altri dati che gli appartengono. */
export function prefissoAccount(): string | null {
  const a = accountAttivo();
  return a ? `novedecimi.${a.sub}.` : null;
}

function chiave(): string {
  const p = prefissoAccount();
  return p ? p + 'sessions' : CHIAVE_SENZA_ACCOUNT;
}

function leggi(da = chiave()): Sessione[] {
  try {
    const grezzo = localStorage.getItem(da);
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
    localStorage.setItem(chiave(), JSON.stringify(sessioni));
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

/** Sostituisce lo storico con quello dato, per esempio dopo la sincronizzazione. */
export function sostituisciSessioni(sessioni: Sessione[]): boolean {
  return scrivi(sessioni);
}

/**
 * Entra nell'account: da qui in poi lo storico è quello dell'account. Le
 * sessioni fatte senza account si uniscono al suo storico e la chiave comune
 * si svuota.
 */
export function entraNellAccount(a: Account): void {
  const senzaAccount = leggi(CHIAVE_SENZA_ACCOUNT);
  localStorage.setItem(CHIAVE_ACCOUNT, JSON.stringify({ sub: a.sub, email: a.email }));
  if (senzaAccount.length > 0) {
    const { sessioni } = unisciSessioni(leggi(), senzaAccount);
    if (scrivi(sessioni)) localStorage.removeItem(CHIAVE_SENZA_ACCOUNT);
  }
}

/** Esce dall'account e toglie dal browser tutti i suoi dati. Su Drive restano. */
export function esciDallAccount(): void {
  const p = prefissoAccount();
  if (p) {
    for (const k of Object.keys(localStorage)) if (k.startsWith(p)) localStorage.removeItem(k);
  }
  localStorage.removeItem(CHIAVE_ACCOUNT);
}

/**
 * Unisce allo storico presente le sessioni valide di un elenco esterno, per
 * istante di fine sessione e senza doppioni. `aggiunte` conta le nuove.
 */
export function unisciSessioni(presenti: Sessione[], esterne: unknown[]): { sessioni: Sessione[]; aggiunte: number } {
  const giaPresenti = new Set(presenti.map((s) => s.ts));
  const nuove: Sessione[] = [];
  for (const grezza of esterne) {
    const s = sessioneValida(grezza);
    if (s && !giaPresenti.has(s.ts)) {
      nuove.push(s);
      giaPresenti.add(s.ts);
    }
  }
  return { sessioni: [...presenti, ...nuove].sort((a, b) => a.ts - b.ts), aggiunte: nuove.length };
}

const VERSIONE_BACKUP = 2;

interface Backup {
  app: 'novedecimi';
  versione: number;
  sessioni: Sessione[];
}

/** Copia completa di uno storico nel formato del backup, che è anche quello del file su Drive. */
export function serializzaStorico(sessioni: Sessione[]): string {
  const backup: Backup = { app: 'novedecimi', versione: VERSIONE_BACKUP, sessioni };
  return JSON.stringify(backup, null, 2);
}

/** Copia completa dello storico, da salvare come file JSON. */
export function esportaBackup(): string {
  return serializzaStorico(elencaSessioni());
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

/** Le sessioni grezze di un backup; lancia BackupNonValido se il file non lo è. */
export function leggiBackup(json: string): { sessioni: unknown[] } {
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
  const { sessioni, aggiunte } = unisciSessioni(leggi(), backup.sessioni);
  scrivi(sessioni);
  return { aggiunte, ignorate: backup.sessioni.length - aggiunte };
}
