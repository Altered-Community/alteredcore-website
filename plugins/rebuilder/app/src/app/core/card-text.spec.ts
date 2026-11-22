import { cardEffects, echoText, effectLines, linesHtml } from './card-text';

describe('effectLines', () => {
  it('splits abilities on double spaces and reads triggers, keywords and cost digits', () => {
    const lines = effectLines(
      '{J} Vous pouvez mettre une carte de votre main en Réserve. Si vous le faites\u00a0: [Sabotez].  {R} [] Coût de Base {3} ou moins.',
    );
    expect(lines).toHaveLength(2);
    expect(lines[0][0]).toEqual({ kind: 'icon', glyph: '\ue026', scale: 0.8, title: 'Joué de partout' });
    expect(lines[0][1]).toEqual({ kind: 'text', text: ' Vous pouvez mettre une carte de votre main en Réserve. Si vous le faites\u00a0: ' });
    expect(lines[0][2]).toEqual({ kind: 'text', text: 'Sabotez', bold: true });
    expect(lines[0][3]).toEqual({ kind: 'text', text: '.' });
    expect(lines[1].map((p) => p.kind)).toEqual(['icon', 'text', 'number', 'text']);
    expect(lines[1][1]).toEqual({ kind: 'text', text: '   Coût de Base ' });
  });

  it('reads lowercase triggers and ignores empty text', () => {
    expect(effectLines('{h} Piochez.')[0][0]).toMatchObject({ kind: 'icon', glyph: '\ue023', title: 'Joué depuis la Main' });
    expect(effectLines('')).toEqual([]);
    expect(effectLines(null)).toEqual([]);
  });
});

describe('echoText', () => {
  it('accepts a string, a locale map or a list of either', () => {
    expect(echoText('{D} : Piochez.')).toBe('{D} : Piochez.');
    expect(echoText({ fr: 'Piochez.', en: 'Draw.' })).toBe('Piochez.');
    expect(echoText([{ fr: 'A' }, 'B'])).toBe('A  B');
    expect(echoText([])).toBe('');
  });
});

describe('cardEffects', () => {
  it('reads the French text of a card returned without `locale`', () => {
    const fx = cardEffects({
      reference: 'ALT_EOLE_B_AX_106_U_1',
      mainEffect: { en: '{J} Draw.', fr: '{J} Piochez.' },
      echoEffect: { fr: '{D}\u00a0: [] [Ravitaillez Épuisé].' },
    });
    expect(fx.main[0].map((p) => p.kind)).toEqual(['icon', 'text']);
    expect(fx.echo[0]).toEqual([
      { kind: 'icon', glyph: '\ue029', scale: 1.2, title: 'Défaussez-moi de la Réserve' },
      { kind: 'text', text: '\u00a0:   ' },
      { kind: 'text', text: 'Ravitaillez Épuisé', bold: true },
      { kind: 'text', text: '.' },
    ]);
  });
});

describe('linesHtml', () => {
  it('prints one paragraph per ability without adding spaces, and escapes text', () => {
    const html = linesHtml(effectLines('{J} [Sabotez].  a < b'));
    expect(html.startsWith('<p>')).toBe(true);
    expect(html).toContain('class="b">Sabotez');
    expect(html).toContain('a &lt; b');
    expect(html.match(/<\/span><span/g)?.length).toBeGreaterThan(0);
  });
});
