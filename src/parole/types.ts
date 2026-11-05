// Tipi del dominio dell'esercizio parole. I termini seguono GLOSSARY.md;
// i nomi dei campi restano quelli dell'artefatto, così i dati salvati e i
// backup hanno la stessa forma.

export const TIPI_DISFLUENZA = ['ripetizione', 'blocco', 'prolungamento'] as const;
export const CONSAPEVOLEZZE = ['prima', 'durante', 'dopo'] as const;
export const ZONE_DI_TENSIONE = ['labbra', 'lingua', 'palato', 'gola', 'petto'] as const;

export type TipoDisfluenza = (typeof TIPI_DISFLUENZA)[number];
export type Consapevolezza = (typeof CONSAPEVOLEZZE)[number];
export type ZonaDiTensione = (typeof ZONE_DI_TENSIONE)[number];

/**
 * Una parola letta in una sessione: fluente (ok) o con balbuzie (ok false).
 * Tipo e zona sono liste (ADR 0003); per una parola fluente sono vuote.
 */
export interface ParolaLetta {
  word: string;
  ok: boolean;
  type: TipoDisfluenza[];
  when: Consapevolezza | null;
  where: ZonaDiTensione[];
}

/** I valori scelti, senza doppioni e nell'ordine canonico di `ammessi`. */
export function inOrdine<T extends string>(valori: Iterable<T>, ammessi: readonly T[]): T[] {
  const scelti = new Set(valori);
  return ammessi.filter((v) => scelti.has(v));
}

export interface Sessione {
  /** Istante di fine sessione in millisecondi; identifica la sessione. */
  ts: number;
  date: string;
  total: number;
  ok: number;
  diff: number;
  pct: number;
  /** true se la sessione usava la lista dei suoni difficili. */
  focusMode: boolean;
  words: ParolaLetta[];
}
