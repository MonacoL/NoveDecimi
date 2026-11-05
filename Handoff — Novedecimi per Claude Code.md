# Handoff — Novedecimi per Claude Code

Nov 5, 2026 · @Luca

## Cos'è il progetto

Esercizio digitale per lavorare sulla balbuzie con la lettura di parole singole. L'app mostra una parola alla volta, presa a caso da una lista; Luca la legge ad alta voce e la segna come fluente o difficile, toccando un pulsante o dicendolo a voce. Per ogni parola difficile annota tre cose: il tipo di disfluenza (ripetizione, blocco, prolungamento), quando se n'è accorto (prima, durante, dopo) e dove ha sentito la tensione (labbra, lingua, palato, gola, petto). Le sessioni vengono salvate, lo storico le raggruppa per giorno e il CSV le porta alla logopedista.

La piattaforma si chiama **Novedecimi**: circa nove decimi di un iceberg stanno sott'acqua, come nel modello dell'iceberg di Sheehan, dove la parte visibile della balbuzie è piccola rispetto a paura, evitamento e tensione che restano sotto. L'identificazione parole è il primo modulo; gli altri strumenti arriveranno dopo. Nome del repository: `novedecimi`.

### Obiettivo GitHub Pages

Creare una versione pubblica di Novedecimi ospitata su GitHub Pages, indipendente dall'ecosistema Claude, che la logopedista di Luca possa usare con i suoi pazienti. L'artefatto su claude.ai rimane per le prove e lo sviluppo rapido; GitHub Pages è la versione di produzione condivisibile.

## L'artefatto attuale

L'artefatto "Esercizio Parole" è su claude.ai all'indirizzo https://claude.ai/artifact/ArocatcdEQZfWT1eZuJiXG, versione 15. È un singolo file HTML di circa 1.580 righe (65 KB) con CSS e JavaScript inline, senza librerie esterne. Resta la versione personale di Luca per provare le modifiche.

La schermata iniziale permette di scegliere quante parole leggere (da 5 a 50, a passi di 5) e di attivare la modalità Focus. La lista generale ha circa 120 parole italiane comuni; la lista Focus contiene solo parole che iniziano con C dura (ca, co, cu, cr, cl), P, T e R, i suoni su cui Luca si blocca più spesso, e ogni parola mostra un'etichetta col suono iniziale.

Durante l'esercizio la parola appare grande al centro. "Fluente" passa alla successiva, "Difficoltà" apre un pannello con le tre annotazioni. Il riconoscimento vocale (Web Speech API, lingua it-IT) permette di fare tutto a voce: Luca dice per esempio "blocco, durante, labbra" e il pannello si compila e si conferma da solo.

A fine sessione compare un riepilogo con la percentuale di fluidità e le parole difficili annotate. Il riepilogo si può scaricare come file RTF o salvare su Google Drive. La sessione viene salvata nel database dell'artefatto.

Lo storico raggruppa le sessioni per giorno. Ogni giorno mostra la percentuale di fluidità, i conteggi per tipo, momento e zona, e l'elenco delle parole difficili con le loro annotazioni, tutto visibile senza clic. Da qui si esporta un CSV unico con cinque sezioni separate: statistiche generali, tipo di disfluenza, consapevolezza, zona corporea, parole difficili. I titoli di sezione non iniziano con `=`, perché Excel li leggeva come formule e mostrava `#ERROR!`.

## Architettura e dipendenze da Claude

Il codice è JavaScript puro, organizzato a schermate (`.screen`, mostrate con `show(name)`). Lo stato della sessione vive in poche variabili globali: `words`, `idx`, `results`, `focusMode`, `count`, `selType`, `selWhen`, `selWhere`. Le funzioni principali sono `render()` e `next()` per l'esercizio, `openDiffPanel()` e `checkAutoConfirm()` per le annotazioni, `handleVoice()` con `detectType/When/Where()` per i comandi vocali, `summary()` e `buildRTF()` per il riepilogo, `saveSession()`, `loadStorico()`, `renderStorico()` e `buildCSV()` per lo storico.

Quattro punti dipendono dal runtime degli artefatti Claude, raggiunto con `claude.use(nome)`. Fuori da claude.ai `window.claude` non esiste, quindi vanno sostituiti tutti.

| Capacità | Dove si usa | Che cosa fa |
| --- | --- | --- |
| `db` | `saveSession()`, `loadStorico()` | salva ogni sessione nella collezione `sessions`, con chiave il timestamp ISO; lo storico legge le ultime 100 ordinate per `ts` |
| `downloads` | `downloadStats()`, `downloadCSV()` | fa scaricare RTF e CSV, perché nell'artefatto i link `<a download>` sono bloccati |
| `mcp` (Google Drive) | `saveToDrive()`, `saveSummaryToDrive()` | crea il file RTF o CSV in una cartella Drive fissa di Luca (`parentId` scritto nel codice) |
| `user` | dichiarata | non indispensabile alla logica attuale |

Ogni sessione salvata ha questa forma:

```json
{
  "ts": 1762300000000,
  "date": "martedì 3 novembre 2026",
  "total": 15, "ok": 11, "diff": 4, "pct": 73,
  "focusMode": true,
  "words": [
    { "word": "casa", "ok": false, "type": "blocco", "when": "durante", "where": "labbra" }
  ]
}
```

Il riconoscimento vocale non dipende da Claude: usa `window.SpeechRecognition || window.webkitSpeechRecognition` e funziona in Chrome, Edge e Safari, non in Firefox.

## Cosa cambia nella versione GitHub Pages

**Salvataggio.** Il `db` diventa `localStorage`, con una chiave unica (per esempio `novedecimi.sessions`) che contiene l'array delle sessioni nella stessa forma di oggi. Così `renderStorico()` e `buildCSV()` restano identiche. Letture e scritture vanno dentro `try/catch`. Con i pazienti della logopedista questo ha un vantaggio: i dati restano sul dispositivo di chi usa l'app e non passano da nessun server, il che semplifica molto la questione privacy per dati sanitari. Il limite è che i dati non si spostano tra dispositivi e si perdono se si cancella la cronologia del browser, quindi serve un pulsante "Esporta backup" (JSON) e uno "Importa backup".

**Download.** `claude.use('downloads')` diventa un normale download con `Blob`, `URL.createObjectURL` e un `<a download>` creato al volo: su GitHub Pages funziona.

**Google Drive.** Va tolto. Il `parentId` punta alla cartella personale di Luca e un'integrazione Drive vera richiederebbe OAuth di Google, un progetto Google Cloud e la verifica dell'app. Il CSV scaricato basta per mandare i dati alla logopedista.

**Avvisi.** Nell'artefatto `alert()` non viene mostrato; su GitHub Pages funziona, ma conviene sostituirlo con un messaggio dentro la pagina, come già fa la parte Drive.

**Cose da aggiungere per l'uso pubblico.** Una pagina introduttiva che spieghi l'esercizio e il modello dell'iceberg, scritta insieme alla logopedista. Una nota chiara che lo strumento non sostituisce il percorso logopedico. La possibilità, più avanti, di personalizzare le liste di parole per paziente, perché i suoni difficili cambiano da persona a persona.

**Due versioni dello stesso codice.** Il modo più semplice è isolare in un file `storage.js` le funzioni di salvataggio, lettura e download, con la stessa interfaccia. Il resto del codice resta uguale per entrambe le versioni, e le modifiche provate nell'artefatto si riportano su GitHub copiando il resto.

## Struttura del repository e prossimi passi

Descrizione del repository GitHub (campo About):

> Il nome viene dall'iceberg della balbuzie: blocchi e ripetizioni sono solo la punta visibile, mentre nove decimi restano sotto la superficie, fatti di paura, evitamento e tensione. Strumenti per lavorare su entrambe le parti nel percorso logopedico. Primo modulo: lettura di parole con annotazione delle disfluenze.

Struttura proposta:

```
novedecimi/
├── index.html              # home della piattaforma, elenco degli strumenti
├── parole/
│   ├── index.html          # esercizio parole (HTML + CSS)
│   ├── app.js              # logica dell'esercizio, uguale all'artefatto
│   ├── words.js            # WORDS_ALL e WORDS_FOCUS
│   └── storage.js          # localStorage, download, backup
├── shared/
│   └── style.css           # colori e tipografia comuni ai moduli
├── README.md
└── LICENSE
```

Prima di cominciare, scarica il codice dell'artefatto da claude.ai e mettilo nella cartella del progetto come `riferimento/parole-artefatto.html`. Claude Code sul tuo PC non vede gli artefatti di claude.ai.

Primo messaggio da dare a Claude Code, da incollare così com'è:

> Leggi questo documento di passaggio e il file `riferimento/parole-artefatto.html`. Crea il repository `novedecimi` con la struttura indicata. Porta l'esercizio parole in `parole/`, separando in `storage.js` tutte le chiamate a `claude.use()`: `db` diventa `localStorage` con chiave `novedecimi.sessions`, `downloads` diventa un download con Blob e `<a download>`, Google Drive va tolto. Aggiungi esporta e importa backup in JSON. Non cambiare la logica dell'esercizio, dello storico e del CSV. Poi prepara la pubblicazione su GitHub Pages dal branch `main`.

Passi successivi, in ordine:

1. Creare il repository su GitHub e attivare Pages (Settings → Pages → Deploy from branch → `main`, cartella root).
2. Provare la versione pubblicata su telefono e computer, controllando soprattutto il microfono: Chrome lo permette solo su HTTPS, che GitHub Pages fornisce.
3. Mandare il link alla logopedista e raccogliere le sue osservazioni, idealmente come Issue sul repository o in un documento condiviso.
4. Scrivere con lei la pagina introduttiva e la nota sui limiti dello strumento.
5. Decidere il prossimo modulo della piattaforma.
