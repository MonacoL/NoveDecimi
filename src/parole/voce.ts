// Interpretazione dei comandi vocali, senza DOM. main.ts riceve il testo dal
// riconoscimento vocale del browser e applica il comando restituito.

import type { Consapevolezza, TipoDisfluenza, ZonaDiTensione } from './types';

export type Comando =
  | { azione: 'avanti' }
  | { azione: 'apri'; disfluenza: TipoDisfluenza | null }
  | { azione: 'annota'; disfluenza?: TipoDisfluenza; consapevolezza?: Consapevolezza; zona?: ZonaDiTensione }
  | { azione: 'conferma' }
  | { azione: 'annulla' };

/** Minuscole e senza accenti, così "sì" vale come "si". */
function normalizza(testo: string): string {
  return testo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function rilevaDisfluenza(t: string): TipoDisfluenza | null {
  if (/\bripet\w*/.test(t)) return 'ripetizione';
  if (/\bblocc\w*/.test(t)) return 'blocco';
  if (/\bprolung\w*/.test(t)) return 'prolungamento';
  return null;
}

function rilevaConsapevolezza(t: string): Consapevolezza | null {
  if (/\b(prima|anticip)\w*/.test(t)) return 'prima';
  if (/\b(durante|nel|mentre)\b/.test(t)) return 'durante';
  if (/\b(dopo|poi|successiv)\w*/.test(t)) return 'dopo';
  return null;
}

function rilevaZona(t: string): ZonaDiTensione | null {
  if (/\blabbr\w*/.test(t)) return 'labbra';
  if (/\blingua\b/.test(t)) return 'lingua';
  if (/\b(palato|velo)\b/.test(t)) return 'palato';
  if (/\bgola\b/.test(t)) return 'gola';
  if (/\b(petto|diaframma)\b/.test(t)) return 'petto';
  return null;
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
    const disfluenza = rilevaDisfluenza(t);
    if (disfluenza) return { azione: 'apri', disfluenza };
    if (/\bbalbuzie\b/.test(t)) return { azione: 'apri', disfluenza: null };
    return null;
  }

  const disfluenza = rilevaDisfluenza(t);
  const consapevolezza = rilevaConsapevolezza(t);
  const zona = rilevaZona(t);
  if (disfluenza || consapevolezza || zona) {
    return {
      azione: 'annota',
      ...(disfluenza && { disfluenza }),
      ...(consapevolezza && { consapevolezza }),
      ...(zona && { zona }),
    };
  }
  if (/\b(conferma|si|vai|ok|okay|bene|giusto|esatto)\b/.test(t)) return { azione: 'conferma' };
  if (/\b(annulla|no|stop|indietro|cancella)\b/.test(t)) return { azione: 'annulla' };
  return null;
}
