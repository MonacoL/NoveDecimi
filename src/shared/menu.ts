// Menù di navigazione presente in ogni pagina: un pulsante nella barra in
// alto apre un pannello laterale. È un <dialog> modale, così Esc lo chiude e
// il focus resta dentro finché è aperto.

import './menu.css';

export type Pagina = 'home' | 'parole' | 'storico' | 'resoconto' | 'account';

interface Voce {
  pagina: Pagina;
  percorso: string;
  testo: string;
  ancora?: string;
}

const GRUPPI: { titolo: string; voci: Voce[] }[] = [
  { titolo: '', voci: [{ pagina: 'home', percorso: '', testo: 'Home' }] },
  { titolo: 'Esercizi', voci: [{ pagina: 'parole', percorso: 'parole/', testo: 'Lettura di parole' }] },
  {
    titolo: 'I tuoi dati',
    voci: [
      { pagina: 'storico', percorso: 'storico/', testo: 'Storico' },
      { pagina: 'resoconto', percorso: 'resoconto/', testo: 'Resoconto per la logopedista' },
      { pagina: 'account', percorso: 'account/', testo: 'Account e Google Drive' },
      { pagina: 'account', percorso: 'account/', testo: 'Backup', ancora: 'backup' },
    ],
  },
];

const ICONA =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>';
const ICONA_CHIUDI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>';

/** Aggiunge il pulsante del menù alla barra in alto e il pannello alla pagina. */
export function montaMenu(corrente: Pagina): void {
  const base = import.meta.env.BASE_URL;
  const barra = document.querySelector('.topbar');
  if (!barra) return;

  const apri = document.createElement('button');
  apri.type = 'button';
  apri.className = 'menu-apri';
  apri.setAttribute('aria-haspopup', 'dialog');
  apri.setAttribute('aria-controls', 'menu');
  apri.innerHTML = `${ICONA}<span>Menù</span>`;

  const dialogo = document.createElement('dialog');
  dialogo.id = 'menu';
  dialogo.className = 'menu';
  dialogo.setAttribute('aria-label', 'Menù');

  const testa = document.createElement('div');
  testa.className = 'menu-testa';
  const marca = document.createElement('span');
  marca.className = 'brand';
  marca.innerHTML = 'Nove<span>decimi</span>';
  const chiudi = document.createElement('button');
  chiudi.type = 'button';
  chiudi.className = 'menu-chiudi';
  chiudi.setAttribute('aria-label', 'Chiudi il menù');
  chiudi.innerHTML = ICONA_CHIUDI;
  testa.append(marca, chiudi);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Sezioni');
  for (const gruppo of GRUPPI) {
    if (gruppo.titolo) {
      const t = document.createElement('p');
      t.className = 'menu-gruppo';
      t.textContent = gruppo.titolo;
      nav.append(t);
    }
    const lista = document.createElement('ul');
    for (const v of gruppo.voci) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = base + v.percorso + (v.ancora ? `#${v.ancora}` : '');
      a.textContent = v.testo;
      if (v.pagina === corrente && !v.ancora) a.setAttribute('aria-current', 'page');
      // Un link alla stessa pagina con ancora deve anche chiudere il menù.
      a.addEventListener('click', () => dialogo.close());
      li.append(a);
      lista.append(li);
    }
    nav.append(lista);
  }

  dialogo.append(testa, nav);
  barra.append(apri);
  document.body.append(dialogo);

  apri.addEventListener('click', () => dialogo.showModal());
  chiudi.addEventListener('click', () => dialogo.close());
  // Un tocco fuori dal pannello, sullo sfondo, chiude il menù.
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) dialogo.close();
  });
  dialogo.addEventListener('close', () => apri.focus());
}
