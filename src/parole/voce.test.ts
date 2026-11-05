import { describe, expect, it } from 'vitest';
import { interpretaComando } from './voce';

describe('comandi vocali durante la lettura', () => {
  it.each([
    ['avanti', { azione: 'avanti' }],
    ['bene', { azione: 'avanti' }],
    ['Perfetto', { azione: 'avanti' }],
    ['blocco', { azione: 'apri', disfluenza: 'blocco' }],
    ['ho ripetuto', { azione: 'apri', disfluenza: 'ripetizione' }],
    ['prolungata', { azione: 'apri', disfluenza: 'prolungamento' }],
    ['balbuzie', { azione: 'apri', disfluenza: null }],
  ])('"%s"', (testo, atteso) => {
    expect(interpretaComando(testo, false)).toEqual(atteso);
  });

  it('ignora le frasi che non sono comandi, compresa la parola letta', () => {
    expect(interpretaComando('casa', false)).toBeNull();
    expect(interpretaComando('durante', false)).toBeNull();
  });
});

describe('comandi vocali con il pannello delle annotazioni aperto', () => {
  it('raccoglie tipo, consapevolezza e zona dette nella stessa frase', () => {
    expect(interpretaComando('blocco, durante, labbra', true)).toEqual({
      azione: 'annota',
      disfluenza: 'blocco',
      consapevolezza: 'durante',
      zona: 'labbra',
    });
  });

  it.each([
    ['prima', { azione: 'annota', consapevolezza: 'prima' }],
    ["l'ho anticipato", { azione: 'annota', consapevolezza: 'prima' }],
    ['velo', { azione: 'annota', zona: 'palato' }],
    ['diaframma', { azione: 'annota', zona: 'petto' }],
    ['sì', { azione: 'conferma' }],
    ['conferma', { azione: 'conferma' }],
    ['annulla', { azione: 'annulla' }],
    ['no', { azione: 'annulla' }],
  ])('"%s"', (testo, atteso) => {
    expect(interpretaComando(testo, true)).toEqual(atteso);
  });

  it('non tratta "avanti" come conferma', () => {
    expect(interpretaComando('avanti', true)).toBeNull();
  });
});
