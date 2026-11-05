// Esportazione dello storico in CSV, per la logopedista. Cinque sezioni:
// dati generali, tipo di disfluenza, consapevolezza, zona di tensione,
// parole con balbuzie. Il BOM iniziale serve a Excel per leggere l'UTF-8.

import { aggrega, perGiorno } from './storico';
import type { Sessione } from './types';

/**
 * Le celle che iniziano con = + - @ vanno tra virgolette: senza, Excel le
 * legge come formule e mostra #ERROR!.
 */
export function escCSV(v: unknown): string {
  const s = String(v);
  const tra = s.includes(',') || s.includes('"') || s.includes('\n') || /^[=+\-@]/.test(s);
  return tra ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function buildCSV(sessioni: Sessione[]): string {
  if (sessioni.length === 0) return '';

  const giorni = perGiorno(sessioni);
  const tot = aggrega(sessioni);
  const righe: string[] = [];
  const riga = (celle: unknown[]) => righe.push(celle.map(escCSV).join(','));
  const sezione = (titolo: string) => {
    righe.push('');
    righe.push(escCSV(titolo.toUpperCase()));
  };

  riga(['Data', 'Sessioni', 'Parole totali', 'Fluenti', 'Con balbuzie', 'Parole fluenti %']);
  for (const g of giorni) riga([g.chiave, g.sessioni, g.total, g.ok, g.diff, g.pct + '%']);
  riga(['TOTALE PERIODO', tot.sessioni, tot.total, tot.ok, tot.diff, tot.pct + '%']);

  sezione('Tipo di disfluenza');
  riga(['Data', 'Ripetizione', 'Blocco', 'Prolungamento']);
  for (const { chiave, tipo: t } of giorni) riga([chiave, t.ripetizione, t.blocco, t.prolungamento]);
  riga(['TOTALE', tot.tipo.ripetizione, tot.tipo.blocco, tot.tipo.prolungamento]);

  sezione('Consapevolezza');
  riga(['Data', 'Prima', 'Durante', 'Dopo']);
  for (const { chiave, consapevolezza: c } of giorni) riga([chiave, c.prima, c.durante, c.dopo]);
  riga(['TOTALE', tot.consapevolezza.prima, tot.consapevolezza.durante, tot.consapevolezza.dopo]);

  sezione('Zona di tensione');
  riga(['Data', 'Labbra', 'Lingua', 'Palato', 'Gola', 'Petto']);
  for (const { chiave, zona: z } of giorni) riga([chiave, z.labbra, z.lingua, z.palato, z.gola, z.petto]);
  const z = tot.zona;
  riga(['TOTALE', z.labbra, z.lingua, z.palato, z.gola, z.petto]);

  const parole = giorni.flatMap((g) => g.conBalbuzie.map((w) => ({ giorno: g.chiave, ...w })));
  if (parole.length > 0) {
    sezione('Parole con balbuzie');
    riga(['Data', 'Parola', 'Tipo', 'Consapevolezza', 'Zona di tensione']);
    for (const w of parole) riga([w.giorno, w.word, w.type ?? '', w.when ?? '', w.where ?? '']);
  }

  return '﻿' + righe.join('\r\n');
}
