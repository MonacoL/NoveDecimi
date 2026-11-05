import { describe, expect, it } from 'vitest';
import { interpretaComando } from './voce';

describe('comandi vocali durante la lettura', () => {
  it.each([
    ['avanti', { azione: 'avanti' }],
    ['bene', { azione: 'avanti' }],
    ['Perfetto', { azione: 'avanti' }],
    ['blocco', { azione: 'apri', disfluenze: ['blocco'] }],
    ['ho ripetuto', { azione: 'apri', disfluenze: ['ripetizione'] }],
    ['prolungata', { azione: 'apri', disfluenze: ['prolungamento'] }],
    ['balbuzie', { azione: 'apri', disfluenze: [] }],
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
      disfluenze: ['blocco'],
      consapevolezza: 'durante',
      zone: ['labbra'],
    });
  });

  it('raccoglie più tipi e più zone nella stessa frase', () => {
    expect(interpretaComando('blocco e ripetizione, prima, labbra e gola', true)).toEqual({
      azione: 'annota',
      disfluenze: ['ripetizione', 'blocco'],
      consapevolezza: 'prima',
      zone: ['labbra', 'gola'],
    });
  });

  it('apre il pannello con più tipi detti insieme', () => {
    expect(interpretaComando('blocco e prolungamento', false)).toEqual({ azione: 'apri', disfluenze: ['blocco', 'prolungamento'] });
  });

  it.each([
    ['prima', { azione: 'annota', consapevolezza: 'prima' }],
    ["l'ho anticipato", { azione: 'annota', consapevolezza: 'prima' }],
    ['velo', { azione: 'annota', zone: ['palato'] }],
    ['diaframma', { azione: 'annota', zone: ['petto'] }],
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
