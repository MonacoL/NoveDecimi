// Esportazione dello storico in CSV, per chi vuole fare analisi con un foglio
// di calcolo. Ogni riga dice la modalità: parole e frasi non si sommano mai
// (ADR 0004). Il BOM iniziale serve a Excel per leggere l'UTF-8.

import { aggregaPerModalita, perGiorno, type Aggregato } from './storico';
import { DOVE_NELLA_FRASE, TIPI_DISFLUENZA, ZONE_DI_TENSIONE, inOrdine, type DoveNellaFrase, type Sessione } from './types';

export const NOMI_DOVE: Record<DoveNellaFrase, string> = { estratta: 'parola estratta', altra: 'altra parola' };

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
  const totali = Object.entries(aggregaPerModalita(sessioni)) as [string, Aggregato][];
  const righe: string[] = [];
  const riga = (celle: unknown[]) => righe.push(celle.map(escCSV).join(','));
  const sezione = (titolo: string) => {
    righe.push('');
    righe.push(escCSV(titolo.toUpperCase()));
  };

  riga(['Data', 'Modalità', 'Sessioni', 'Parole o frasi', 'Fluenti', 'Con balbuzie', 'Fluenti %']);
  for (const g of giorni) riga([g.chiave, g.modalita, g.sessioni, g.total, g.ok, g.diff, g.pct + '%']);
  for (const [m, t] of totali) riga(['TOTALE PERIODO', m, t.sessioni, t.total, t.ok, t.diff, t.pct + '%']);

  sezione('Tipo di disfluenza');
  riga(['Un episodio può avere più tipi: la somma può superare le parole con balbuzie.']);
  riga(['Data', 'Modalità', 'Ripetizione', 'Blocco', 'Prolungamento']);
  for (const { chiave, modalita, tipo: t } of giorni) riga([chiave, modalita, t.ripetizione, t.blocco, t.prolungamento]);
  for (const [m, { tipo: t }] of totali) riga(['TOTALE', m, t.ripetizione, t.blocco, t.prolungamento]);

  sezione('Consapevolezza');
  riga(['Data', 'Modalità', 'Prima', 'Durante', 'Dopo']);
  for (const { chiave, modalita, consapevolezza: c } of giorni) riga([chiave, modalita, c.prima, c.durante, c.dopo]);
  for (const [m, { consapevolezza: c }] of totali) riga(['TOTALE', m, c.prima, c.durante, c.dopo]);

  sezione('Zona di tensione');
  riga(['Un episodio può avere più zone: la somma può superare le parole con balbuzie.']);
  riga(['Data', 'Modalità', 'Labbra', 'Lingua', 'Palato', 'Gola', 'Petto']);
  for (const { chiave, modalita, zona: z } of giorni) riga([chiave, modalita, z.labbra, z.lingua, z.palato, z.gola, z.petto]);
  for (const [m, { zona: z }] of totali) riga(['TOTALE', m, z.labbra, z.lingua, z.palato, z.gola, z.petto]);

  const giorniFrase = giorni.filter((g) => g.modalita === 'frase');
  if (giorniFrase.length > 0) {
    sezione('Dove nella frase');
    riga(['Data', 'Modalità', 'Parola estratta', 'Altra parola']);
    for (const { chiave, modalita, inFrase: d } of giorniFrase) riga([chiave, modalita, d.estratta, d.altra]);
  }

  const parole = giorni.flatMap((g) => g.conBalbuzie.map((w) => ({ giorno: g.chiave, modalita: g.modalita, ...w })));
  if (parole.length > 0) {
    sezione('Parole con balbuzie');
    riga(['Data', 'Modalità', 'Parola', 'Tipo', 'Consapevolezza', 'Zona di tensione', 'Dove nella frase']);
    for (const w of parole) {
      riga([
        w.giorno,
        w.modalita,
        w.word,
        inOrdine(w.type, TIPI_DISFLUENZA).join('; '),
        w.when ?? '',
        inOrdine(w.where, ZONE_DI_TENSIONE).join('; '),
        inOrdine(w.inFrase, DOVE_NELLA_FRASE).map((d) => NOMI_DOVE[d]).join('; '),
      ]);
    }
  }

  return '﻿' + righe.join('\r\n');
}
