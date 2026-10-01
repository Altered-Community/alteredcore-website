import { keywordLabel, printKeywordCodes } from './card-vocabulary';

describe('keyword codes of the Uniques search API', () => {
  it('prints them as the cards API does, variants and numbers included', () => {
    expect(keywordLabel('GIGANTIC', 'fr')).toBe('Gigantesque');
    expect(keywordLabel('FLEETING', 'en')).toBe('Fleeting');
    expect(keywordLabel('AFTER_YOU', 'fr')).toBe('Après vous');
    expect(keywordLabel('RESUPPLY_T', 'fr')).toBe('Ravitaillez');
    expect(keywordLabel('RESUPPLY_INF', 'fr')).toBe('Ravitaillez');
    expect(keywordLabel('BOOSTED_CHA_P', 'fr')).toBe('Boosté');
    expect(keywordLabel('TOUGH_2', 'fr')).toBe('Coriace 2');
    expect(keywordLabel('ORDIS_RECRUIT', 'fr')).toBe('1/1/1 Recrue Ordis');
    expect(keywordLabel('BRASSBUG', 'en')).toBe('Brassbug 2/2/2');
    expect(keywordLabel('SOMETHING_NEW', 'fr')).toBeNull();
  });

  it('replaces the codes of a text, leaves the rest', () => {
    expect(printKeywordCodes('[] Je suis [GIGANTIC]. Si j’étais [FLEETING] — [UNKNOWN]', 'fr')).toBe('[] Je suis [Gigantesque]. Si j’étais [Fugace] — [UNKNOWN]');
    expect(printKeywordCodes('I am [GIGANTIC].', 'de')).toBe('I am [Gigantic].');
  });
});
