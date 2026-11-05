# Novedecimi

Strumenti per il percorso logopedico sulla balbuzie. Il nome viene dal modello dell'iceberg di Sheehan: della balbuzie si sente circa un decimo (ripetizioni, blocchi, prolungamenti), mentre paura, evitamento e tensione restano sotto la superficie.

Il primo esercizio è la lettura di parole singole. L'app mostra una parola alla volta; chi legge passa avanti se la parola è fluente, oppure annota l'episodio di balbuzie con il tipo di disfluenza, la consapevolezza (prima, durante, dopo) e la zona di tensione. Si può fare tutto anche a voce, in Chrome, Edge e Safari. Le sessioni finiscono in uno storico raggruppato per giorno, esportabile in CSV per la logopedista.

Novedecimi accompagna il percorso logopedico e non lo sostituisce.

## Dove stanno i dati

Solo nel browser del dispositivo, in `localStorage`. Non c'è un server e nessun dato lascia il dispositivo. Per conservare lo storico o spostarlo su un altro dispositivo, dallo storico si scarica un backup JSON e lo si importa dall'altra parte. Cancellando i dati del sito dal browser lo storico si perde.

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

Il riconoscimento vocale richiede HTTPS oppure `localhost`.

## Struttura

- `index.html`: home con lo schema dell'iceberg e il menù degli esercizi.
- `parole/index.html` e `src/parole/`: l'esercizio di lettura. `archivio.ts` gestisce `localStorage` e il backup, `esportazione.ts` il CSV, `riepilogo.ts` l'RTF, `voce.ts` i comandi vocali, `main.ts` collega la pagina ai moduli.
- `src/shared/`: stile, download e messaggi comuni ai moduli.
- `GLOSSARY.md`: i termini del dominio. `docs/adr/`: le decisioni.
- `riferimento/` (non versionata): il file dell'artefatto di claude.ai da cui è partito l'esercizio.

## Test

- `src/**/*.test.ts`: i moduli senza interfaccia (archivio e backup, CSV, RTF, comandi vocali).
- `e2e/`: il sito compilato in Chromium su quattro schermi (telefono piccolo 320×568, telefono 390×844, telefono in orizzontale 844×390, desktop). Coprono una sessione completa fino a storico ed esportazione, l'import del backup, la home, e controllano che nessuna pagina scorra in orizzontale e che i comandi principali restino nello schermo. In locale usano il Chrome installato.

Il microfono e Safari su iPhone non sono coperti: vanno provati a mano.

## Pubblicazione

Ogni push su `main` esegue i test dei moduli, compila il sito, esegue i test nel browser e solo se passano tutti lo pubblica su GitHub Pages, tramite `.github/workflows/deploy.yml`. Se un test nel browser fallisce, il rapporto si scarica dalla pagina del workflow su GitHub.

## Licenza

MIT, vedi `LICENSE`.
