// Pagina del resoconto: si sceglie il periodo, si vede l'anteprima e si
// scarica il documento. Il periodo predefinito parte dal giorno dopo la fine
// dell'ultimo resoconto scaricato.

import '../shared/style.css';
import '../shared/pagina.css';
import './resoconto.css';
import { mostraAvviso } from '../shared/avviso';
import { $, el } from '../shared/dom';
import { caricaOra, conAccount, sincronizzaInSilenzio } from '../shared/collegamento';
import { documentoHTML, documentoRTF, type Documento } from '../shared/documento';
import { scarica, timbroData } from '../shared/download';
import { montaMenu } from '../shared/menu';
import { elencaSessioni } from '../parole/archivio';
import { costruisciResoconto, sessioniDelPeriodo } from '../parole/resoconto';

montaMenu('resoconto');

const CHIAVE_ULTIMO = 'novedecimi.resoconto.fine';

/** AAAA-MM-GG letto come giorno locale, non UTC. */
const daInput = (v: string) => {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

function leggiUltimo(): string | null {
  try {
    return localStorage.getItem(CHIAVE_ULTIMO);
  } catch {
    return null;
  }
}

function periodoPredefinito(): { da: string; a: string } {
  const oggi = timbroData();
  const ultimo = leggiUltimo();
  if (ultimo) {
    const giorno = daInput(ultimo);
    giorno.setDate(giorno.getDate() + 1);
    const dopo = timbroData(giorno);
    return { da: dopo < oggi ? dopo : oggi, a: oggi };
  }
  const prima = elencaSessioni()[0];
  return { da: prima ? timbroData(new Date(prima.ts)) : oggi, a: oggi };
}

function mostraAnteprima(doc: Documento): void {
  const art = $('anteprima');
  art.replaceChildren(el('h2', undefined, doc.titolo));
  for (const b of doc.blocchi) {
    if (b.tipo === 'sezione') art.append(el('h3', undefined, b.testo));
    else if (b.tipo === 'paragrafo') {
      const p = el('p');
      for (const parte of typeof b.testo === 'string' ? [b.testo] : b.testo) {
        p.append(typeof parte === 'string' ? document.createTextNode(parte) : el('strong', undefined, parte.grassetto));
      }
      art.append(p);
    } else {
      const contenitore = el('div', 'tabella');
      const t = el('table');
      const testa = el('tr');
      for (const c of b.intestazione) testa.append(el('th', undefined, c));
      t.append(testa);
      for (const r of b.righe) {
        const tr = el('tr');
        for (const c of r) tr.append(el('td', undefined, c));
        t.append(tr);
      }
      contenitore.append(t);
      art.append(contenitore);
    }
  }
}

const inputDa = $<HTMLInputElement>('da');
const inputA = $<HTMLInputElement>('a');

function aggiorna(): Documento | null {
  if (!inputDa.value || !inputA.value) return null;
  if (inputDa.value > inputA.value) {
    mostraAvviso($('resoconto-status'), 'La data di inizio viene dopo quella di fine.', 0);
    $('anteprima').replaceChildren();
    $<HTMLButtonElement>('btn-rtf').disabled = true;
    $<HTMLButtonElement>('btn-drive').disabled = true;
    return null;
  }
  $('resoconto-status').textContent = '';
  const doc = costruisciResoconto(elencaSessioni(), daInput(inputDa.value), daInput(inputA.value));
  $<HTMLButtonElement>('btn-rtf').disabled = false;
  $<HTMLButtonElement>('btn-drive').disabled = false;
  $('link-drive').hidden = true;
  mostraAnteprima(doc);
  return doc;
}

const { da, a } = periodoPredefinito();
inputDa.value = da;
inputA.value = a;
inputDa.max = inputA.max = timbroData();
inputDa.onchange = inputA.onchange = () => aggiorna();
$('periodo').onsubmit = (e) => e.preventDefault();

/** Ricorda la fine del periodo, se conteneva sessioni, per proporre il periodo successivo. */
function ricordaPeriodo(): void {
  const nessuna = sessioniDelPeriodo(elencaSessioni(), daInput(inputDa.value), daInput(inputA.value)).length === 0;
  try {
    if (!nessuna) localStorage.setItem(CHIAVE_ULTIMO, inputA.value);
  } catch {
    /* il periodo predefinito resterà quello di oggi */
  }
}

$('btn-rtf').onclick = () => {
  const doc = aggiorna();
  if (!doc) return;
  scarica(`resoconto-${inputDa.value}-${inputA.value}.rtf`, documentoRTF(doc), 'application/rtf');
  ricordaPeriodo();
};

$<HTMLButtonElement>('btn-drive').onclick = async (e) => {
  const b = e.currentTarget as HTMLButtonElement;
  const doc = aggiorna();
  if (!doc) return;
  b.disabled = true;
  try {
    const nome = `Resoconto parole dal ${inputDa.value} al ${inputA.value}`;
    const link = $<HTMLAnchorElement>('link-drive');
    link.href = await caricaOra('Resoconti', nome, documentoHTML(doc));
    link.hidden = false;
    mostraAvviso($('resoconto-status'), 'Resoconto salvato su Drive.', 0);
    ricordaPeriodo();
  } catch (err) {
    mostraAvviso($('resoconto-status'), err instanceof Error ? err.message : 'Drive non è raggiungibile.', 0);
  } finally {
    b.disabled = false;
  }
};

$('btn-drive').hidden = !conAccount();
aggiorna();
// Con l'accesso ancora valido, il resoconto parte dallo storico allineato con Drive.
void sincronizzaInSilenzio().then((esito) => {
  if (esito?.scaricate) aggiorna();
});
