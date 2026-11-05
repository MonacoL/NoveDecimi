# Testi dell'interfaccia: modifiche per il porting

Modifiche ai testi e ai colori dell'esercizio parole, da applicare quando lo si porta da `riferimento/parole-artefatto.html` a `parole/`. Seguono i termini di [GLOSSARY.md](../GLOSSARY.md) e due regole: il linguaggio descrive cosa è successo senza giudicare la lettura, e nessun testo usa il trattino em o il punto medio come separatore. La logica dell'esercizio, dello storico e del CSV resta quella dell'artefatto; cambiano solo le stringhe e i colori.

I numeri di riga si riferiscono a `riferimento/parole-artefatto.html`.

## Schermata iniziale

| Riga | Oggi | Diventa |
| --- | --- | --- |
| 513 | Dì la parola ad alta voce, poi registra com'è andata. | Leggi la parola ad alta voce. Se c'è stato un episodio di balbuzie, annotalo. |
| 529 | c · p · t · r iniziali | iniziali c, p, t, r |

## Esercizio

| Riga | Oggi | Diventa |
| --- | --- | --- |
| 580 | Detto bene | Avanti |
| 582 | Segnala difficoltà | Balbuzie |
| 570-572 | suggerimenti vocali separati da trattino em e punto medio | stesse parole, separate da virgole e a capo; si aggiungono "avanti" e "balbuzie" |
| 1166 | Microfono attivo — tocca per disattivare | Microfono attivo, tocca per disattivare |

I comandi vocali "bene", "bravo", "benissimo", "perfetto" restano accettati, perché sono parole che la persona può dire, ma non compaiono nei suggerimenti. Si aggiungono "avanti" come parola fluente e "balbuzie" per aprire il pannello delle annotazioni.

## Pannello delle annotazioni

| Riga | Oggi | Diventa |
| --- | --- | --- |
| 651 | aria-label "Registra difficoltà" | aria-label "Annota l'episodio di balbuzie" |
| 656 | Tipo di difficoltà | Tipo di disfluenza |
| 663 | Mi sono reso conto… | Consapevolezza |
| 670 | Dove l'ho sentita | Zona di tensione (facoltativa) |

## Riepilogo della sessione

| Riga | Oggi | Diventa |
| --- | --- | --- |
| 599 | fluidità | parole fluenti |
| 604 | Senza difficoltà / parole fluide | Fluenti / parole |
| 609 | Con difficoltà / parole segnalate | Con balbuzie / parole |
| 618 | Tipo di difficoltà | Tipo di disfluenza |
| 948 | Nessuna difficoltà — ottimo! | Nessun episodio di balbuzie annotato. |

## RTF del riepilogo

| Riga | Oggi | Diventa |
| --- | --- | --- |
| 1021 | Con difficoltà | Con balbuzie |
| 1025 | Tipo di difficoltà | Tipo di disfluenza |
| 1042 | Parole con difficoltà | Parole con balbuzie |
| 1050 | Nessuna difficoltà segnalata — ottimo! | Nessun episodio di balbuzie annotato. |

Il trattino em nel titolo (`\emdash`, riga 1016) e nell'elenco delle parole (riga 1047) diventa una virgola o i due punti.

## Storico

| Riga | Oggi | Diventa |
| --- | --- | --- |
| 1318 | 3 giorni · 7 sessioni | 3 giorni, 7 sessioni |
| 1396 | 15 parole · 11 fluenti · 4 difficoltà | 15 parole, 11 fluenti, 4 con balbuzie |
| 1399 | · Focus | , suoni difficili |
| 1379 | casa · blocco, durante | casa: blocco, durante |
| 1362 | Tipo di difficoltà | Tipo di disfluenza |
| 1383 | Parole difficili | Parole con balbuzie |
| 1400 | Nessuna difficoltà registrata. | Nessun episodio di balbuzie annotato. |

## CSV

Cambiano solo le intestazioni; sezioni, colonne e calcoli restano gli stessi.

| Riga | Oggi | Diventa |
| --- | --- | --- |
| 1453 | Difficoltà | Con balbuzie |
| 1453 | Fluidità % | Parole fluenti % |
| 1479 | Zona corporea | Zona di tensione |
| 1493 | Parole difficili | Parole con balbuzie |
| 1494 | Quando, Dove (colonne delle parole) | Consapevolezza, Zona di tensione |

## Colori

- La percentuale nello storico (riga 1345) oggi è verde, arancio o rossa secondo il valore. Diventa di un solo colore neutro, uguale per ogni giorno.
- I numeri del riepilogo (righe 605 e 610) e i pallini dei contatori (riga 188) usano il verde per le parole fluenti e l'arancio per quelle con balbuzie. Restano due colori distinti per leggerli a colpo d'occhio, ma senza la coppia verde e arancio, che si legge come "giusto" e "attenzione".
- I pulsanti "Avanti" e "Balbuzie" hanno lo stesso peso visivo. Oggi il primo è pieno e verde e il secondo è vuoto, quindi uno sembra la risposta attesa.
