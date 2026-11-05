// Pagina dello storico: una scheda per giorno e modalità, e l'esportazione CSV.

import '../shared/style.css';
import '../shared/pagina.css';
import './storico.css';
import { mostraAvviso } from '../shared/avviso';
import { $, el } from '../shared/dom';
import { scarica, timbroData } from '../shared/download';
import { montaMenu } from '../shared/menu';
import { elencaSessioni } from '../parole/archivio';
import { NOMI_DOVE, buildCSV } from '../parole/esportazione';
import { dataEstesa } from '../parole/sessione';
import { perGiorno, unita } from '../parole/storico';
import { DOVE_NELLA_FRASE, TIPI_DISFLUENZA, ZONE_DI_TENSIONE, inOrdine } from '../parole/types';

montaMenu('storico');

function chip(nome: string, n: number): HTMLElement {
  const c = el('span', 'day-chip', nome + ' ');
  c.append(el('b', undefined, String(n)));
  return c;
}

function gruppoChip(titolo: string, conteggi: Record<string, number>): HTMLElement | null {
  const voci = Object.entries(conteggi).filter(([, n]) => n > 0);
  if (voci.length === 0) return null;
  const g = el('div', 'day-group');
  const chips = el('div', 'day-chips');
  for (const [k, n] of voci) chips.append(chip(k, n));
  g.append(el('div', 'day-group-title', titolo), chips);
  return g;
}

function renderStorico(): void {
  const sessioni = elencaSessioni();
  const list = $('storico-list');
  list.replaceChildren();
  const vuoto = sessioni.length === 0;
  $('btn-csv').hidden = vuoto;
  if (vuoto) {
    $('storico-subtitle').textContent = 'Nessuna sessione registrata su questo dispositivo.';
    return;
  }

  const giorni = perGiorno(sessioni).reverse();
  const nSess = sessioni.length;
  $('storico-subtitle').textContent =
    `${giorni.length} giorn${giorni.length === 1 ? 'o' : 'i'}, ${nSess} session${nSess === 1 ? 'e' : 'i'}`;

  for (const g of giorni) {
    const card = el('article', 'day-card');
    const head = el('div', 'day-head');
    const info = el('div', 'day-info');
    info.append(
      el('div', 'day-date', dataEstesa(new Date(g.ts))),
      el('div', 'day-sub', `${g.total} ${unita(g.modalita, g.total)}, ${g.ok} fluent${g.ok === 1 ? 'e' : 'i'}, ${g.diff} con balbuzie`),
    );
    head.append(el('div', 'day-pct', g.pct + '%'), info);

    const nota =
      (g.modalita === 'frase' ? 'Parola in una frase, ' : 'Parola singola, ') +
      (g.sessioni > 1 ? `${g.sessioni} sessioni` : '1 sessione') +
      (g.suoniDifficili ? ', suoni difficili' : '');

    const detail = el('div', 'day-detail');
    if (g.diff > 0) {
      for (const gruppo of [
        gruppoChip('Tipo di disfluenza', g.tipo),
        gruppoChip('Consapevolezza', g.consapevolezza),
        gruppoChip('Zona di tensione', g.zona),
        g.modalita === 'frase' ? gruppoChip('Dove nella frase', { [NOMI_DOVE.estratta]: g.inFrase.estratta, [NOMI_DOVE.altra]: g.inFrase.altra }) : null,
      ]) {
        if (gruppo) detail.append(gruppo);
      }
      const gp = el('div', 'day-group');
      gp.append(el('div', 'day-group-title', g.modalita === 'frase' ? 'Frasi con balbuzie (parola estratta)' : 'Parole con balbuzie'));
      const pills = el('div');
      for (const w of g.conBalbuzie) {
        const pill = el('span', 'word-pill');
        pill.append(el('strong', undefined, w.word));
        const ann = [
          ...inOrdine(w.type, TIPI_DISFLUENZA),
          ...(w.when ? [w.when] : []),
          ...inOrdine(w.where, ZONE_DI_TENSIONE),
          ...inOrdine(w.inFrase, DOVE_NELLA_FRASE).map((d) => NOMI_DOVE[d]),
        ].join(', ');
        if (ann) pill.append(el('span', 'pill-ann', ann));
        pills.append(pill);
      }
      gp.append(pills);
      detail.append(gp);
    } else {
      detail.append(el('p', 'nota', 'Nessun episodio di balbuzie annotato.'));
    }

    card.append(head, el('div', 'day-note', nota), detail);
    list.append(card);
  }
}

$('btn-csv').onclick = () => {
  const csv = buildCSV(elencaSessioni());
  if (!csv) {
    mostraAvviso($('storico-status'), 'Non ci sono sessioni da esportare.');
    return;
  }
  scarica(`storico-parole-${timbroData()}.csv`, csv, 'text/csv;charset=utf-8');
};

renderStorico();
