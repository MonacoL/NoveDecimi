// Riepilogo di una sessione come documento: RTF da scaricare, HTML per Drive.

import { documentoHTML, documentoRTF, type Blocco, type Documento } from '../shared/documento';
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

export const NOTA_CONTEGGI = 'Un episodio può avere più tipi e più zone: la somma può superare le parole con balbuzie.';

const maiuscola = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** Le annotazioni di una parola con balbuzie, nell'ordine tipo, consapevolezza, zona, dove nella frase. */
export function annotazioni(r: ParolaLetta): string[] {
  return [
    ...inOrdine(r.type, TIPI_DISFLUENZA),
    ...(r.when ? [r.when] : []),
    ...inOrdine(r.where, ZONE_DI_TENSIONE).map((z) => NOMI_ZONA[z]),
    ...inOrdine(r.inFrase, DOVE_NELLA_FRASE).map((d) => NOMI_DOVE_FRASE[d]),
  ];
}

export function costruisciRiepilogo(parole: ParolaLetta[], modalita: Modalita, adesso: Date): Documento {
  const frase = modalita === 'frase';
  const okN = parole.filter((r) => r.ok).length;
  const diffN = parole.length - okN;
  const pct = parole.length ? Math.round((okN / parole.length) * 100) : 0;
  const conBalbuzie = parole.filter((r) => !r.ok);
  const { tipo, consapevolezza, zona, inFrase } = contaAnnotazioni(conBalbuzie);

  const b: Blocco[] = [];
  const p = (testo: string) => b.push({ tipo: 'paragrafo', testo });
  const sezione = (testo: string) => b.push({ tipo: 'sezione', testo });

  b.push({ tipo: 'paragrafo', testo: [{ grassetto: 'Esercizio parole' }, ', ' + (frase ? 'modalità frase, ' : '') + dataEstesa(adesso)] });
  sezione('Risultati');
  p((frase ? 'Frasi dette: ' : 'Parole lette: ') + parole.length);
  p('Fluenti: ' + okN + ' (' + pct + '%)');
  p('Con balbuzie: ' + diffN);

  if (diffN > 0) {
    p('');
    p(NOTA_CONTEGGI);
    if (frase) {
      sezione('Dove nella frase');
      p('Parola estratta: ' + inFrase.estratta);
      p('Altra parola: ' + inFrase.altra);
    }
    sezione('Tipo di disfluenza');
    p('Ripetizione: ' + tipo.ripetizione);
    p('Blocco: ' + tipo.blocco);
    p('Prolungamento: ' + tipo.prolungamento);
    sezione('Consapevolezza');
    p('Prima: ' + consapevolezza.prima);
    p('Durante: ' + consapevolezza.durante);
    p('Dopo: ' + consapevolezza.dopo);
    const zone = ZONE_DI_TENSIONE.filter((k) => zona[k] > 0);
    if (zone.length > 0) {
      sezione('Zona di tensione');
      for (const k of zone) p(NOMI_ZONA[k] + ': ' + zona[k]);
    }
    sezione(frase ? 'Frasi con balbuzie (parola estratta)' : 'Parole con balbuzie');
    conBalbuzie.forEach((r, i) => {
      b.push({ tipo: 'paragrafo', testo: [`${i + 1}. `, { grassetto: r.word }, ': ' + annotazioni(r).map(maiuscola).join(', ')] });
    });
  } else {
    p('');
    p('Nessun episodio di balbuzie annotato.');
  }

  return { titolo: `Riepilogo ${frase ? 'frasi' : 'parole'}, ${dataEstesa(adesso)}`, mostraTitolo: false, blocchi: b };
}

export function buildRTF(parole: ParolaLetta[], modalita: Modalita, adesso: Date): string {
  return documentoRTF(costruisciRiepilogo(parole, modalita, adesso));
}

export function riepilogoHTML(parole: ParolaLetta[], modalita: Modalita, adesso: Date): string {
  return documentoHTML(costruisciRiepilogo(parole, modalita, adesso));
}
