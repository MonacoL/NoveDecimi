// Aggregazioni dello storico, usate sia dalla schermata dello storico sia
// dall'esportazione CSV. Nell'artefatto lo stesso calcolo era ripetuto in
// renderStorico() e buildCSV().

import type { Consapevolezza, ParolaLetta, Sessione, TipoDisfluenza, ZonaDiTensione } from './types';

export interface Conteggi {
  tipo: Record<TipoDisfluenza, number>;
  consapevolezza: Record<Consapevolezza, number>;
  zona: Record<ZonaDiTensione, number>;
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
  /** Istante della prima sessione del giorno. */
  ts: number;
}

export function contaAnnotazioni(parole: ParolaLetta[]): Conteggi {
  const tipo = { ripetizione: 0, blocco: 0, prolungamento: 0 };
  const consapevolezza = { prima: 0, durante: 0, dopo: 0 };
  const zona = { labbra: 0, lingua: 0, palato: 0, gola: 0, petto: 0 };
  for (const p of parole) {
    if (p.ok) continue;
    if (p.type) tipo[p.type]++;
    if (p.when) consapevolezza[p.when]++;
    if (p.where) zona[p.where]++;
  }
  return { tipo, consapevolezza, zona };
}

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

function chiaveGiorno(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Le sessioni raggruppate per giorno locale, dal giorno meno recente. */
export function perGiorno(sessioni: Sessione[]): Giorno[] {
  const gruppi = new Map<string, Sessione[]>();
  for (const s of [...sessioni].sort((a, b) => a.ts - b.ts)) {
    const k = chiaveGiorno(s.ts);
    const g = gruppi.get(k);
    if (g) g.push(s);
    else gruppi.set(k, [s]);
  }
  return [...gruppi.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([chiave, gruppo]) => ({ chiave, ts: gruppo[0]!.ts, ...aggrega(gruppo) }));
}
