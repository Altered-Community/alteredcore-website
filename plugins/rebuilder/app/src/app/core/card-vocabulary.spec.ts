import { keywordLabel, printKeywordCodes } from './card-vocabulary';

describe('keyword codes of the Uniques search API', () => {
  it('prints them as the cards API does, variants and numbers included', () => {
    expect(keywordLabel('GIGANTIC', 'fr')).toBe('Gigantesque');
    expect(keywordLabel('FLEETING', 'en')).toBe('Fleeting');
    expect(keywordLabel('AFTER_YOU', 'fr')).toBe('Après vous');
    // CardsData's name of each variant, in the grammar of its sentence.
    expect(keywordLabel('RESUPPLY_T', 'fr')).toBe('Ravitaille');
    expect(keywordLabel('RESUPPLY_INF', 'fr')).toBe('Ravitailler');
    expect(keywordLabel('BOOSTED_CHA_P', 'fr')).toBe('Boostés');
    expect(keywordLabel('ASCENDED_P', 'fr')).toBe('Élevées');
    expect(keywordLabel('ASCENDED_S', 'en')).toBe('Ascended');
    expect(keywordLabel('DUE_TO_ASCENSION', 'fr')).toBe("grâce à l'Élévation");
    expect(keywordLabel('COMPLETED_LOW', 'fr')).toBe('Accomplie');
    expect(keywordLabel('RESUPPLIES', 'fr')).toBe('Ravitaille');
    expect(keywordLabel('EXHAUSTED_RESUPPLIES', 'en')).toBe('Exhausted Resupplies');
    // Not in CardsData yet: the base keyword, the trailing number kept.
    expect(keywordLabel('BOOSTED_TKN_X', 'fr')).toBe('Boosté');
    expect(keywordLabel('TOUGH_7', 'fr')).toBe('Coriace 7');
    expect(keywordLabel('TOUGH_2', 'fr')).toBe('Coriace 2'); // CardsData: a non-breaking space, as printed
    expect(keywordLabel('ORDIS_RECRUIT', 'fr')).toBe('1/1/1 Recrue Ordis');
    expect(keywordLabel('BRASSBUG', 'en')).toBe('Brassbug 2/2/2');
    expect(keywordLabel('SOMETHING_NEW', 'fr')).toBeNull();
  });

  it('replaces the codes of a text, leaves the rest', () => {
    expect(printKeywordCodes('[] Je suis [GIGANTIC]. Si j’étais [FLEETING] — [UNKNOWN]', 'fr')).toBe('[] Je suis [Gigantesque]. Si j’étais [Fugace] — [UNKNOWN]');
    expect(printKeywordCodes('I am [GIGANTIC].', 'de')).toBe('I am [Gigantic].');
  });
});
