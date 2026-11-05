// Aggregazioni dello storico, usate dalla schermata dello storico,
// dall'esportazione CSV e dal resoconto. Parole e frasi non si sommano mai
// (ADR 0004): ogni aggregato riguarda una sola modalità.

import { MODALITA } from './types';
import type { Consapevolezza, DoveNellaFrase, Modalita, ParolaLetta, Sessione, TipoDisfluenza, ZonaDiTensione } from './types';

export interface Conteggi {
  tipo: Record<TipoDisfluenza, number>;
  consapevolezza: Record<Consapevolezza, number>;
  zona: Record<ZonaDiTensione, number>;
  inFrase: Record<DoveNellaFrase, number>;
}

export interface Aggregato extends Conteggi {
  sessioni: number;
  total: number;
  ok: number;
  diff: number;
  pct: number;
  /** Le parole con balbuzie, nell'ordine in cui sono state lette. */
  conBalbuzie: ParolaLetta[];
}

export interface Giorno extends Aggregato {
  /** Data locale nel formato AAAA-MM-GG. */
  chiave: string;
  modalita: Modalita;
  /** Istante della prima sessione del giorno in questa modalità. */
  ts: number;
  /** true se almeno una sessione usava i suoni difficili. */
  suoniDifficili: boolean;
}

export function contaAnnotazioni(parole: ParolaLetta[]): Conteggi {
  const tipo = { ripetizione: 0, blocco: 0, prolungamento: 0 };
  const consapevolezza = { prima: 0, durante: 0, dopo: 0 };
  const zona = { labbra: 0, lingua: 0, palato: 0, gola: 0, petto: 0 };
  const inFrase = { estratta: 0, altra: 0 };
  for (const p of parole) {
    if (p.ok) continue;
    // Ogni tipo e ogni zona contano una volta per parola (ADR 0003).
    for (const t of p.type) tipo[t]++;
    if (p.when) consapevolezza[p.when]++;
    for (const z of p.where) zona[z]++;
    for (const d of p.inFrase) inFrase[d]++;
  }
  return { tipo, consapevolezza, zona, inFrase };
}

/** Aggrega sessioni di una sola modalità. */
export function aggrega(sessioni: Sessione[]): Aggregato {
  const total = sessioni.reduce((a, s) => a + s.total, 0);
  const ok = sessioni.reduce((a, s) => a + s.ok, 0);
  const conBalbuzie = sessioni.flatMap((s) => (s.words ?? []).filter((w) => !w.ok));
  return {
    sessioni: sessioni.length,
    total,
    ok,
    diff: total - ok,
    pct: total ? Math.round((ok / total) * 100) : 0,
    conBalbuzie,
    ...contaAnnotazioni(conBalbuzie),
  };
}

/** Un aggregato per ciascuna modalità presente, nell'ordine parola, frase. */
export function aggregaPerModalita(sessioni: Sessione[]): Partial<Record<Modalita, Aggregato>> {
  const risultato: Partial<Record<Modalita, Aggregato>> = {};
  for (const m of MODALITA) {
    const gruppo = sessioni.filter((s) => s.modalita === m);
    if (gruppo.length > 0) risultato[m] = aggrega(gruppo);
  }
  return risultato;
}

export function chiaveGiorno(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Le sessioni raggruppate per giorno locale e per modalità, dal giorno meno
 * recente; nello stesso giorno prima le parole, poi le frasi.
 */
export function perGiorno(sessioni: Sessione[]): Giorno[] {
  const gruppi = new Map<string, Sessione[]>();
  for (const s of [...sessioni].sort((a, b) => a.ts - b.ts)) {
    const k = `${chiaveGiorno(s.ts)}|${MODALITA.indexOf(s.modalita)}`;
    const g = gruppi.get(k);
    if (g) g.push(s);
    else gruppi.set(k, [s]);
  }
  return [...gruppi.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, gruppo]) => ({
      chiave: k.split('|')[0]!,
      modalita: gruppo[0]!.modalita,
      ts: gruppo[0]!.ts,
      suoniDifficili: gruppo.some((s) => s.focusMode),
      ...aggrega(gruppo),
    }));
}
