// Riepilogo di una sessione come documento RTF, apribile con Word,
// LibreOffice o TextEdit.

import { dataEstesa } from './sessione';
import { contaAnnotazioni } from './storico';
import { DOVE_NELLA_FRASE, TIPI_DISFLUENZA, ZONE_DI_TENSIONE, inOrdine, type DoveNellaFrase, type Modalita, type ParolaLetta } from './types';

export const NOMI_ZONA = {
  labbra: 'Labbra',
  lingua: 'Lingua',
  palato: 'Palato / velo',
  gola: 'Gola',
  petto: 'Petto',
} as const;

export const NOMI_DOVE_FRASE: Record<DoveNellaFrase, string> = { estratta: 'Parola estratta', altra: 'Altra parola' };

/** Codifica per RTF: Latin-1 come \'xx, il resto come \uN?. */
export function rtfEscape(s: string): string {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/[^\x00-\x7E]/g, (c) => {
      const code = c.charCodeAt(0);
      return code <= 0xff ? `\\'${code.toString(16).padStart(2, '0')}` : `\\u${code}?`;
    });
}

const maiuscola = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function buildRTF(parole: ParolaLetta[], modalita: Modalita, adesso: Date): string {
  const frase = modalita === 'frase';
  const okN = parole.filter((r) => r.ok).length;
  const diffN = parole.length - okN;
  const pct = parole.length ? Math.round((okN / parole.length) * 100) : 0;
  const conBalbuzie = parole.filter((r) => !r.ok);
  const { tipo, consapevolezza, zona, inFrase } = contaAnnotazioni(conBalbuzie);

  let body = '';
  const R = rtfEscape;
  const bold = (s: string) => `{\\b ${R(s)}}`;
  const par = (riga = '') => {
    body += riga + '\\par\n';
  };

  par(bold('Esercizio parole') + ', ' + R((frase ? 'modalità frase, ' : '') + dataEstesa(adesso)));
  par();
  par(bold('Risultati'));
  par((frase ? 'Frasi dette: ' : 'Parole lette: ') + parole.length);
  par('Fluenti: ' + okN + ' (' + pct + '%)');
  par('Con balbuzie: ' + diffN);
  par();

  if (diffN > 0) {
    par(R('Un episodio può avere più tipi e più zone: la somma può superare le parole con balbuzie.'));
    par();
    if (frase) {
      par(bold('Dove nella frase'));
      par('Parola estratta: ' + inFrase.estratta);
      par('Altra parola: ' + inFrase.altra);
      par();
    }
    par(bold('Tipo di disfluenza'));
    par('Ripetizione: ' + tipo.ripetizione);
    par('Blocco: ' + tipo.blocco);
    par('Prolungamento: ' + tipo.prolungamento);
    par();
    par(bold('Consapevolezza'));
    par('Prima: ' + consapevolezza.prima);
    par('Durante: ' + consapevolezza.durante);
    par('Dopo: ' + consapevolezza.dopo);
    par();
    const zone = Object.entries(zona).filter(([, n]) => n > 0);
    if (zone.length > 0) {
      par(bold('Zona di tensione'));
      for (const [k, n] of zone) par(R(NOMI_ZONA[k as keyof typeof NOMI_ZONA]) + ': ' + n);
      par();
    }
    par(bold(frase ? 'Frasi con balbuzie (parola estratta)' : 'Parole con balbuzie'));
    conBalbuzie.forEach((r, i) => {
      const annotazioni = [
        ...inOrdine(r.type, TIPI_DISFLUENZA),
        ...(r.when ? [r.when] : []),
        ...inOrdine(r.where, ZONE_DI_TENSIONE).map((z) => NOMI_ZONA[z]),
        ...inOrdine(r.inFrase, DOVE_NELLA_FRASE).map((d) => NOMI_DOVE_FRASE[d]),
      ].map(maiuscola);
      par(`${i + 1}. {\\b ${R(r.word)}}: ${R(annotazioni.join(', '))}`);
    });
  } else {
    par(R('Nessun episodio di balbuzie annotato.'));
  }

  return `{\\rtf1\\ansi\\ansicpg1252\\deff0\n{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}}\n\\f0\\fs22\\widowctrl\\sa120\n${body}}`;
}
