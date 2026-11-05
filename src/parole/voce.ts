// Interpretazione dei comandi vocali, senza DOM. main.ts riceve il testo dal
// riconoscimento vocale del browser e applica il comando restituito.

import type { Consapevolezza, TipoDisfluenza, ZonaDiTensione } from './types';

export type Comando =
  | { azione: 'avanti' }
  | { azione: 'apri'; disfluenze: TipoDisfluenza[] }
  | { azione: 'annota'; disfluenze?: TipoDisfluenza[]; consapevolezza?: Consapevolezza; zone?: ZonaDiTensione[] }
  | { azione: 'conferma' }
  | { azione: 'annulla' };

/** Minuscole e senza accenti, così "sì" vale come "si". */
function normalizza(testo: string): string {
  return testo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Tutti i tipi nominati nella frase, nell'ordine canonico. */
function rilevaDisfluenze(t: string): TipoDisfluenza[] {
  const trovati: TipoDisfluenza[] = [];
  if (/\bripet\w*/.test(t)) trovati.push('ripetizione');
  if (/\bblocc\w*/.test(t)) trovati.push('blocco');
  if (/\bprolung\w*/.test(t)) trovati.push('prolungamento');
  return trovati;
}

function rilevaConsapevolezza(t: string): Consapevolezza | null {
  if (/\b(prima|anticip)\w*/.test(t)) return 'prima';
  if (/\b(durante|nel|mentre)\b/.test(t)) return 'durante';
  if (/\b(dopo|poi|successiv)\w*/.test(t)) return 'dopo';
  return null;
}

/** Tutte le zone nominate nella frase, nell'ordine canonico. */
function rilevaZone(t: string): ZonaDiTensione[] {
  const trovate: ZonaDiTensione[] = [];
  if (/\blabbr\w*/.test(t)) trovate.push('labbra');
  if (/\blingua\b/.test(t)) trovate.push('lingua');
  if (/\b(palato|velo)\b/.test(t)) trovate.push('palato');
  if (/\bgola\b/.test(t)) trovate.push('gola');
  if (/\b(petto|diaframma)\b/.test(t)) trovate.push('petto');
  return trovate;
}

/**
 * Il comando contenuto in una frase, oppure null.
 * Con il pannello chiuso si riconoscono la parola fluente e l'apertura del
 * pannello; con il pannello aperto le annotazioni, la conferma e l'annullamento.
 */
export function interpretaComando(testo: string, pannelloAperto: boolean): Comando | null {
  const t = normalizza(testo);

  if (!pannelloAperto) {
    if (/\b(avanti|bene|ok|okay|bravo|fluente|benissimo|perfetto)\b/.test(t)) return { azione: 'avanti' };
    const disfluenze = rilevaDisfluenze(t);
    if (disfluenze.length > 0) return { azione: 'apri', disfluenze };
    if (/\bbalbuzie\b/.test(t)) return { azione: 'apri', disfluenze: [] };
    return null;
  }

  const disfluenze = rilevaDisfluenze(t);
  const consapevolezza = rilevaConsapevolezza(t);
  const zone = rilevaZone(t);
  if (disfluenze.length > 0 || consapevolezza || zone.length > 0) {
    return {
      azione: 'annota',
      ...(disfluenze.length > 0 && { disfluenze }),
      ...(consapevolezza && { consapevolezza }),
      ...(zone.length > 0 && { zone }),
    };
  }
  if (/\b(conferma|si|vai|ok|okay|bene|giusto|esatto)\b/.test(t)) return { azione: 'conferma' };
  if (/\b(annulla|no|stop|indietro|cancella)\b/.test(t)) return { azione: 'annulla' };
  return null;
}
