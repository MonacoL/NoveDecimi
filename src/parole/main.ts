// Esercizio parole: collegamento tra la pagina e i moduli. La logica segue
// quella dell'artefatto (riferimento/parole-artefatto.html).

import '../shared/style.css';
import './parole.css';
import { mostraAvviso } from '../shared/avviso';
import { scarica, timbroData } from '../shared/download';
import { BackupNonValido, aggiungiSessione, elencaSessioni, esportaBackup, importaBackup } from './archivio';
import { buildCSV } from './esportazione';
import { NOMI_ZONA, buildRTF } from './riepilogo';
import { creaSessione, dataEstesa, type Risultato } from './sessione';
import { chiaveGiorno, contaAnnotazioni, perGiorno } from './storico';
import { TIPI_DISFLUENZA, ZONE_DI_TENSIONE, inOrdine } from './types';
import type { Consapevolezza, ParolaLetta, TipoDisfluenza, ZonaDiTensione } from './types';
import { interpretaComando } from './voce';
import { WORDS_ALL, WORDS_FOCUS, getSoundLabel, shuffle } from './words';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

type Schermata = 'start' | 'exercise' | 'summary' | 'storico';

let count = 15;
let focusMode = false;
let words: string[] = [];
let idx = 0;
let results: Risultato[] = [];
const selTypes = new Set<TipoDisfluenza>();
let selWhen: Consapevolezza | null = null;
const selWheres = new Set<ZonaDiTensione>();
let inAvanzamento = false;
let currentSessionSaved = false;
let schermataPrecedente: Schermata = 'start';

function show(name: Schermata): void {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(name + '-screen').classList.add('active');
  window.scrollTo(0, 0);
}

function schermataAttiva(): Schermata {
  const el = document.querySelector('.screen.active');
  return (el?.id.replace('-screen', '') ?? 'start') as Schermata;
}

/** Crea un elemento con testo semplice: i dati non passano mai da innerHTML. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Numero di parole e suoni difficili

$('dec-btn').onclick = () => {
  if (count > 5) {
    count -= 5;
    $('count-display').textContent = String(count);
  }
};
$('inc-btn').onclick = () => {
  if (count < 50) {
    count += 5;
    $('count-display').textContent = String(count);
  }
};
$('focus-toggle').onclick = () => {
  focusMode = !focusMode;
  $('focus-toggle').classList.toggle('on', focusMode);
  $('focus-toggle').setAttribute('aria-checked', String(focusMode));
};

// Esercizio

$('start-btn').onclick = () => {
  const pool = focusMode ? WORDS_FOCUS : WORDS_ALL;
  words = shuffle(pool).slice(0, Math.min(count, pool.length));
  idx = 0;
  results = [];
  currentSessionSaved = false;
  inAvanzamento = false;
  $('summary-status').textContent = '';
  show('exercise');
  render();
};

function render(): void {
  const w = words[idx] ?? '';
  $('word-text').textContent = w;
  $('word-num').textContent = String(idx + 1).padStart(2, '0');
  $('prog-label').textContent = `Parola ${idx + 1} di ${words.length}`;
  $('prog-fill').style.width = `${(idx / words.length) * 100}%`;
  $('mini-ok').textContent = String(results.filter((r) => r.ok).length);
  $('mini-diff').textContent = String(results.filter((r) => !r.ok).length);

  const badge = $('sound-badge');
  const lbl = getSoundLabel(w);
  badge.hidden = !lbl;
  if (lbl) {
    badge.textContent = lbl;
    badge.className = focusMode ? 'sound-badge hard' : 'sound-badge';
  }
  clearTranscript();
}

function recordOk(): void {
  if (inAvanzamento) return;
  inAvanzamento = true;
  flashWord('flash-ok');
  setTimeout(() => {
    results.push({ word: words[idx]!, ok: true });
    next();
  }, 300);
}

function flashWord(cls: string): void {
  const w = $('word-text');
  w.classList.remove('flash-ok', 'flash-diff');
  void w.offsetWidth;
  w.classList.add(cls);
  setTimeout(() => w.classList.remove(cls), 400);
}

function next(): void {
  idx++;
  inAvanzamento = false;
  if (idx >= words.length) summary();
  else render();
}

$('btn-ok').onclick = recordOk;
$('btn-diff').onclick = () => openDiffPanel();

// Pannello delle annotazioni

let autoConfirmTimer: number | undefined;

function panelOpen(): boolean {
  return $('diff-panel').classList.contains('open');
}

function openDiffPanel(): void {
  if (inAvanzamento) return;
  selTypes.clear();
  selWhen = null;
  selWheres.clear();
  document.querySelectorAll('.chip').forEach((c) => {
    c.classList.remove('sel');
    c.setAttribute('aria-pressed', 'false');
  });
  $<HTMLButtonElement>('confirm-btn').disabled = true;
  $('diff-echo').textContent = words[idx] ?? '';
  $('diff-panel').classList.add('open');
  clearTimeout(autoConfirmTimer);
}

function closePanel(): void {
  $('diff-panel').classList.remove('open');
  clearTimeout(autoConfirmTimer);
}

$('cancel-btn').onclick = closePanel;
$('diff-panel').onclick = (e) => {
  if (e.target === $('diff-panel')) closePanel();
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && panelOpen()) closePanel();
});

$('confirm-btn').onclick = () => {
  if (inAvanzamento) return;
  inAvanzamento = true;
  results.push({
    word: words[idx]!,
    ok: false,
    type: inOrdine(selTypes, TIPI_DISFLUENZA),
    when: selWhen,
    where: inOrdine(selWheres, ZONE_DI_TENSIONE),
  });
  flashWord('flash-diff');
  closePanel();
  setTimeout(next, 300);
};

/** Allinea i chip di un gruppo ai valori scelti; con la voce i nuovi scelti fanno un piccolo salto. */
function aggiornaChip(gruppo: string, attr: string, scelti: ReadonlySet<string>, nuovi: readonly string[] = []): void {
  document.querySelectorAll<HTMLElement>(`#${gruppo} .chip`).forEach((c) => {
    const valore = c.dataset[attr]!;
    const m = scelti.has(valore);
    c.classList.toggle('sel', m);
    c.setAttribute('aria-pressed', String(m));
    if (nuovi.includes(valore)) {
      c.classList.remove('pop');
      void c.offsetWidth;
      c.classList.add('pop');
    }
  });
}

/** Tocco su un chip a scelta multipla: lo aggiunge o lo toglie. */
function alterna<T extends string>(scelti: Set<T>, valore: T): void {
  if (scelti.has(valore)) scelti.delete(valore);
  else scelti.add(valore);
}

function aggiornaTipi(nuovi: TipoDisfluenza[] = []): void {
  aggiornaChip('type-chips', 'type', selTypes, nuovi);
  updateConfirm();
}
function aggiornaZone(nuove: ZonaDiTensione[] = []): void {
  aggiornaChip('where-chips', 'where', selWheres, nuove);
  updateConfirm();
}
function selectWhen(when: Consapevolezza, fromVoice = false): void {
  selWhen = when;
  aggiornaChip('when-chips', 'when', new Set([when]), fromVoice ? [when] : []);
  updateConfirm();
}

/** Con la voce si aggiunge e non si toglie (ADR 0003). */
function aggiungiTipi(tipi: TipoDisfluenza[]): void {
  for (const t of tipi) selTypes.add(t);
  aggiornaTipi(tipi);
}
function aggiungiZone(zone: ZonaDiTensione[]): void {
  for (const z of zone) selWheres.add(z);
  aggiornaZone(zone);
}

function updateConfirm(): void {
  $<HTMLButtonElement>('confirm-btn').disabled = !(selTypes.size > 0 && selWhen);
}

/** Con la voce, tipo e consapevolezza bastano: la conferma parte da sola dopo un secondo. */
function checkAutoConfirm(): void {
  clearTimeout(autoConfirmTimer);
  if (selTypes.size > 0 && selWhen) {
    autoConfirmTimer = window.setTimeout(() => {
      if (!$<HTMLButtonElement>('confirm-btn').disabled) $('confirm-btn').click();
    }, 1000);
  }
}

document.querySelectorAll<HTMLElement>('#type-chips .chip').forEach((c) => {
  c.onclick = () => {
    alterna(selTypes, c.dataset.type as TipoDisfluenza);
    aggiornaTipi();
  };
});
document.querySelectorAll<HTMLElement>('#when-chips .chip').forEach((c) => {
  c.onclick = () => selectWhen(c.dataset.when as Consapevolezza);
});
document.querySelectorAll<HTMLElement>('#where-chips .chip').forEach((c) => {
  c.onclick = () => {
    alterna(selWheres, c.dataset.where as ZonaDiTensione);
    aggiornaZone();
  };
});

// Riepilogo

function saveSession(): void {
  if (currentSessionSaved || results.length === 0) return;
  if (aggiungiSessione(creaSessione(results, focusMode, new Date()))) {
    currentSessionSaved = true;
  } else {
    mostraAvviso($('summary-status'), 'Non è stato possibile salvare la sessione su questo dispositivo.', 0);
  }
}

const NOMI_TIPO: Record<TipoDisfluenza, string> = {
  ripetizione: 'Ripetizione',
  blocco: 'Blocco',
  prolungamento: 'Prolungamento',
};
const COLORI_TIPO: Record<TipoDisfluenza, string> = {
  ripetizione: 'var(--rip)',
  blocco: 'var(--blo)',
  prolungamento: 'var(--pro)',
};

function rigaConteggio(nome: string, n: number, colore: string): HTMLElement {
  const row = el('div', 'bk-row');
  const dot = el('div', 'bk-dot');
  dot.style.background = colore;
  row.append(dot, el('span', 'bk-name', nome), el('span', 'bk-count', String(n)));
  return row;
}

function summary(): void {
  stopMic();
  show('summary');
  saveSession();
  $('sum-date').textContent = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  const okN = results.filter((r) => r.ok).length;
  const diffN = results.length - okN;
  const pct = Math.round((okN / results.length) * 100);
  $('s-ok').textContent = String(okN);
  $('s-diff').textContent = String(diffN);
  $('ring-pct').textContent = pct + '%';

  const C = 2 * Math.PI * 54;
  const fill = $('ring-fill');
  fill.style.strokeDasharray = String(C);
  fill.style.strokeDashoffset = String(C);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      fill.style.strokeDashoffset = String(C - (C * pct) / 100);
    }),
  );

  const parole = results.map((r) => ({ type: [], when: null, where: [], ...r }) as ParolaLetta);
  const { tipo, consapevolezza, zona } = contaAnnotazioni(parole);

  const wb = $('when-breakdown');
  wb.replaceChildren();
  if (diffN > 0) {
    const row = el('div', 'when-row');
    for (const [k, l] of [['prima', 'Prima'], ['durante', 'Durante'], ['dopo', 'Dopo']] as const) {
      const it = el('div', 'when-item');
      it.append(el('div', 'when-val', String(consapevolezza[k])), el('div', 'when-lbl', l));
      row.append(it);
    }
    wb.append(row);
  } else {
    wb.append(el('p', 'nota', 'Nessun episodio di balbuzie annotato.'));
  }

  const tRows = $('type-rows');
  tRows.replaceChildren();
  $('type-title').hidden = diffN === 0;
  if (diffN > 0) {
    for (const k of Object.keys(tipo) as TipoDisfluenza[]) tRows.append(rigaConteggio(NOMI_TIPO[k], tipo[k], COLORI_TIPO[k]));
  }

  const zRows = $('where-rows');
  zRows.replaceChildren();
  const zone = (Object.keys(zona) as ZonaDiTensione[]).filter((k) => zona[k] > 0);
  $('where-title').hidden = zone.length === 0;
  for (const k of zone) zRows.append(rigaConteggio(NOMI_ZONA[k], zona[k], 'var(--where)'));
}

$('restart-btn').onclick = () => show('start');

$('download-btn').onclick = () => {
  const parole = results.map((r) => ({ type: [], when: null, where: [], ...r }) as ParolaLetta);
  scarica(`parole-${timbroData()}.rtf`, buildRTF(parole, new Date()), 'application/rtf');
};

// Riconoscimento vocale (Chrome, Edge, Safari; non Firefox)

interface RisultatoVocale {
  isFinal: boolean;
  0: { transcript: string };
}
interface EventoVocale {
  resultIndex: number;
  results: ArrayLike<RisultatoVocale>;
}
interface Riconoscimento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: EventoVocale) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type CostruttoreRiconoscimento = new () => Riconoscimento;

const SR = ((window as unknown as Record<string, unknown>).SpeechRecognition ??
  (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as CostruttoreRiconoscimento | undefined;

let rec: Riconoscimento | null = null;
let micOn = false;
let lastCmdTime = 0;

if (SR) {
  $('mic-area').hidden = false;
  rec = new SR();
  rec.lang = 'it-IT';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    let finalT = '';
    let interimT = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]!;
      if (r.isFinal) finalT += r[0].transcript;
      else interimT += r[0].transcript;
    }
    const display = (finalT || interimT).trim();
    if (display) showTranscript(display);
    if (finalT) handleVoice(finalT);
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') $('mic-area').hidden = true;
    micOn = false;
    updateMicUI();
  };
  rec.onend = () => {
    if (micOn) {
      try {
        rec?.start();
      } catch {
        /* già avviato */
      }
    }
  };
  $('mic-strip').onclick = toggleMic;
}

function toggleMic(): void {
  micOn = !micOn;
  try {
    if (micOn) rec?.start();
    else rec?.stop();
  } catch {
    micOn = false;
  }
  updateMicUI();
}

function stopMic(): void {
  if (!micOn) return;
  micOn = false;
  try {
    rec?.stop();
  } catch {
    /* già fermo */
  }
  updateMicUI();
}

function updateMicUI(): void {
  $('mic-strip').classList.toggle('on', micOn);
  $('mic-label').textContent = micOn ? 'In ascolto' : 'Tocca per usare la voce';
  $('mic-strip').setAttribute('aria-label', micOn ? 'Microfono attivo, tocca per disattivarlo' : 'Attiva il microfono');
  $('mic-hint').hidden = !micOn;
  if (!micOn) clearTranscript();
}

let transcriptTimer: number | undefined;
function showTranscript(text: string): void {
  clearTimeout(transcriptTimer);
  $('transcript-echo').textContent = text;
  transcriptTimer = window.setTimeout(() => {
    $('transcript-echo').textContent = '';
  }, 1800);
}
function clearTranscript(): void {
  clearTimeout(transcriptTimer);
  $('transcript-echo').textContent = '';
}

function handleVoice(testo: string): void {
  const now = Date.now();
  if (now - lastCmdTime < 700) return;
  if (schermataAttiva() !== 'exercise') return;

  const aperto = panelOpen();
  const cmd = interpretaComando(testo, aperto);
  if (!cmd) return;

  switch (cmd.azione) {
    case 'avanti':
      lastCmdTime = now;
      $('btn-ok').classList.add('cmd-flash');
      setTimeout(() => $('btn-ok').classList.remove('cmd-flash'), 400);
      setTimeout(recordOk, 350);
      break;
    case 'apri':
      lastCmdTime = now;
      openDiffPanel();
      if (cmd.disfluenze.length > 0) {
        const tipi = cmd.disfluenze;
        setTimeout(() => {
          aggiungiTipi(tipi);
          checkAutoConfirm();
        }, 120);
      }
      break;
    case 'annota':
      lastCmdTime = now;
      if (cmd.disfluenze) aggiungiTipi(cmd.disfluenze);
      if (cmd.consapevolezza) selectWhen(cmd.consapevolezza, true);
      if (cmd.zone) aggiungiZone(cmd.zone);
      // La zona da sola non fa partire la conferma: è facoltativa.
      if (cmd.disfluenze || cmd.consapevolezza) checkAutoConfirm();
      break;
    case 'conferma':
      if (!$<HTMLButtonElement>('confirm-btn').disabled) {
        lastCmdTime = now;
        $('confirm-btn').click();
      }
      break;
    case 'annulla':
      lastCmdTime = now;
      closePanel();
      break;
  }
}

// Storico

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
  $('btn-backup').hidden = vuoto;
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
      el('div', 'day-sub', `${g.total} parol${g.total === 1 ? 'a' : 'e'}, ${g.ok} fluent${g.ok === 1 ? 'e' : 'i'}, ${g.diff} con balbuzie`),
    );
    head.append(el('div', 'day-pct', g.pct + '%'), info);

    const usaSuoni = sessioni.some((s) => s.focusMode && chiaveGiorno(s.ts) === g.chiave);
    const nota = (g.sessioni > 1 ? `${g.sessioni} sessioni` : '1 sessione') + (usaSuoni ? ', suoni difficili' : '');

    const detail = el('div', 'day-detail');
    if (g.diff > 0) {
      for (const gruppo of [
        gruppoChip('Tipo di disfluenza', g.tipo),
        gruppoChip('Consapevolezza', g.consapevolezza),
        gruppoChip('Zona di tensione', g.zona),
      ]) {
        if (gruppo) detail.append(gruppo);
      }
      const gp = el('div', 'day-group');
      gp.append(el('div', 'day-group-title', 'Parole con balbuzie'));
      const pills = el('div');
      for (const w of g.conBalbuzie) {
        const pill = el('span', 'word-pill');
        pill.append(el('strong', undefined, w.word));
        const ann = [...inOrdine(w.type, TIPI_DISFLUENZA), ...(w.when ? [w.when] : []), ...inOrdine(w.where, ZONE_DI_TENSIONE)].join(', ');
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

function apriStorico(): void {
  const da = schermataAttiva();
  if (da !== 'storico') schermataPrecedente = da;
  $('back-from-storico').textContent = schermataPrecedente === 'summary' ? 'Torna al riepilogo' : "Torna all'inizio";
  $('storico-status').textContent = '';
  renderStorico();
  show('storico');
}

$('btn-storico').onclick = apriStorico;
$('btn-storico-home').onclick = apriStorico;
$('back-from-storico').onclick = () => show(schermataPrecedente);

$('btn-csv').onclick = () => {
  const csv = buildCSV(elencaSessioni());
  if (!csv) {
    mostraAvviso($('storico-status'), 'Non ci sono sessioni da esportare.');
    return;
  }
  scarica(`storico-parole-${timbroData()}.csv`, csv, 'text/csv;charset=utf-8');
};

$('btn-backup').onclick = () => {
  scarica(`novedecimi-backup-${timbroData()}.json`, esportaBackup(), 'application/json');
};

$('btn-import').onclick = () => $('import-file').click();

$<HTMLInputElement>('import-file').onchange = async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const stato = $('storico-status');
  try {
    const { aggiunte, ignorate } = importaBackup(await file.text());
    const parti = [aggiunte === 1 ? '1 sessione aggiunta' : `${aggiunte} sessioni aggiunte`];
    if (ignorate > 0) parti.push(ignorate === 1 ? '1 già presente o non valida' : `${ignorate} già presenti o non valide`);
    renderStorico();
    mostraAvviso(stato, `Backup importato: ${parti.join(', ')}.`, 0);
  } catch (err) {
    const msg = err instanceof BackupNonValido ? err.message : 'Non è stato possibile leggere il file.';
    mostraAvviso(stato, msg, 0);
  }
};
