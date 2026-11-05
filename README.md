# Novedecimi

Strumenti per il percorso logopedico sulla balbuzie. Il nome viene dal modello dell'iceberg di Sheehan: della balbuzie si sente circa un decimo (ripetizioni, blocchi, prolungamenti), mentre paura, evitamento e tensione restano sotto la superficie.

Il primo esercizio è la lettura di parole, in due modalità: la parola da sola, oppure detta dentro una frase inventata sul momento. L'app mostra una parola alla volta; chi legge passa avanti se è andata senza episodi, oppure annota l'episodio di balbuzie con uno o più tipi di disfluenza, la consapevolezza (prima, durante, dopo), una o più zone di tensione e, in modalità frase, se l'episodio è caduto sulla parola estratta o su un'altra parola. In modalità parola si può fare tutto anche a voce, in Chrome, Edge e Safari. Le sessioni finiscono in uno storico raggruppato per giorno e per modalità. Il resoconto di un periodo si scarica in RTF per la logopedista, il CSV serve per le analisi.

Novedecimi accompagna il percorso logopedico e non lo sostituisce.

## Dove stanno i dati

Non c'è un server di Novedecimi. Senza account lo storico sta solo nel browser del dispositivo, in `localStorage`: per conservarlo o spostarlo, dalla pagina Account e dati si scarica un backup JSON e lo si importa dall'altra parte. Cancellando i dati del sito dal browser lo storico si perde.

Con l'accesso con Google lo storico si salva anche nel Google Drive della persona, nella cartella `Novedecimi` (file `storico-novedecimi.json`), e si ritrova su ogni dispositivo. Riepiloghi e resoconti vanno in `Novedecimi/Riepiloghi` e `Novedecimi/Resoconti` come documenti Google. L'app usa lo scope `drive.file`, quindi vede solo i file che ha creato. Uscendo dall'account i dati lasciano il browser e restano su Drive. Le ragioni sono in `docs/adr/0002-account-google-e-drive-come-archivio.md`.

L'accesso dura circa un'ora per scheda. Dopo, le sessioni restano nel browser e i riepiloghi in coda, e partono al tocco su "Carica su Drive" o "Sincronizza ora".

## Client Google

L'accesso con Google compare solo se il sito è compilato con un client OAuth, nella variabile `VITE_GOOGLE_CLIENT_ID`:

- in locale, in un file `.env.local` (non versionato): `VITE_GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com`;
- su GitHub, come variabile del repository `GOOGLE_CLIENT_ID` (Settings, Secrets and variables, Actions, Variables), letta dal workflow.

Il client si crea in Google Cloud Console: progetto, Google Drive API abilitata, schermata di consenso con lo scope `drive.file` e gli utenti di test, client "Applicazione web" con origini `https://monacol.github.io` e `http://localhost:5173`. Il client ID non è un segreto.

## Sviluppo

Serve Node.js 22 o successivo.

```sh
npm install
npm run dev        # server locale con ricaricamento
npm test           # test dei moduli con Vitest
npm run test:e2e   # test nel browser con Playwright (dopo npm run build)
npm run typecheck  # controllo dei tipi
npm run build      # sito statico in dist/
npm run preview    # serve dist/ in locale
```

Il riconoscimento vocale richiede HTTPS oppure `localhost`. Per i test di Google in locale: `VITE_GOOGLE_CLIENT_ID=finto npm run build && npm run test:e2e` (Google e Drive sono simulati; senza la variabile quei test vengono saltati).

## Struttura

- `index.html`: home con lo schema dell'iceberg e l'elenco degli esercizi.
- `parole/index.html` e `src/parole/`: l'esercizio di lettura. `archivio.ts` gestisce `localStorage`, il backup e la conversione dei dati vecchi, `storico.ts` le aggregazioni per giorno e modalità, `esportazione.ts` il CSV, `riepilogo.ts` e `resoconto.ts` i documenti, `voce.ts` i comandi vocali, `main.ts` collega la pagina ai moduli.
- `storico/`, `resoconto/`, `account/` con i rispettivi `src/<pagina>/main.ts`: le pagine dei dati.
- `src/shared/`: stile, menù, download, messaggi, il modello dei documenti (`documento.ts`, scritto in RTF e in HTML), la sincronizzazione con Drive (`sincronizza.ts`, senza HTTP), le chiamate a Google (`google.ts`) e il collegamento con le pagine (`collegamento.ts`).
- `GLOSSARY.md`: i termini del dominio. `docs/adr/`: le decisioni.
- `riferimento/` (non versionata): il file dell'artefatto di claude.ai da cui è partito l'esercizio.

## Test

- `src/**/*.test.ts`: i moduli senza interfaccia (archivio e backup, aggregazioni, CSV, documenti, resoconto, comandi vocali).
- `e2e/`: il sito compilato in Chromium su quattro schermi (telefono piccolo 320×568, telefono 390×844, telefono in orizzontale 844×390, desktop). Coprono una sessione completa nelle due modalità fino a storico ed esportazione, il resoconto, l'import del backup, il menù in ogni pagina, la home, e controllano che nessuna pagina scorra in orizzontale e che i comandi principali restino nello schermo. In locale usano il Chrome installato.

Il microfono e Safari su iPhone non sono coperti: vanno provati a mano.

## Pubblicazione

Ogni push su `main` esegue i test dei moduli, compila il sito, esegue i test nel browser e solo se passano tutti lo pubblica su GitHub Pages, tramite `.github/workflows/deploy.yml`. Se un test nel browser fallisce, il rapporto si scarica dalla pagina del workflow su GitHub.

## Licenza

MIT, vedi `LICENSE`.
