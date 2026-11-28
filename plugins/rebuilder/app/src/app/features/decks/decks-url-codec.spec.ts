import { convertToParamMap } from '@angular/router';
import { EMPTY_DECK_FILTERS } from './deck-filters';
import { decodeDecksUrl, encodeDecksUrl, queryParamsEqual, sortFromParam, tabFromParam } from './decks-url-codec';

describe('decks-url-codec', () => {
  it('maps legacy site tab and sort query parameters', () => {
    expect(tabFromParam('my')).toBe('mine');
    expect(tabFromParam('public')).toBe('community');
    expect(tabFromParam('contest')).toBe('contest');
    expect(tabFromParam('unknown')).toBeUndefined();

    expect(sortFromParam('upvoteCount:desc')).toBe('likes');
    expect(sortFromParam('name:desc')).toBe('name-desc');
    expect(sortFromParam('created-asc')).toBe('created-asc');
    expect(sortFromParam('bogus')).toBeUndefined();
  });

  it('decodes legacy site links for mine, community and contest tabs', () => {
    const mine = decodeDecksUrl(
      convertToParamMap({
        faction: 'yz,ax,invalid',
        visibility: '1',
        archived: '1',
        sort: 'createdAt:asc',
        hero: 'Moyo & Silk',
        q: 'embrasement',
      }),
      'mine',
    );
    expect(mine.filters).toMatchObject({
      factions: ['YZ', 'AX'],
      visibility: 'public',
      status: 'archived',
      sort: 'created-asc',
      hero: 'Moyo & Silk',
      q: 'embrasement',
    });

    const community = decodeDecksUrl(
      convertToParamMap({
        hero: 'alt_core_b_yz_01_c',
        legal: 'all',
        tournament: '1',
        card: 'alt_core_b_yz_10_c',
        visibility: '1',
      }),
      'community',
    );
    expect(community.filters).toMatchObject({
      hero: 'ALT_CORE_B_YZ_01_C',
      legalOnly: false,
      tournament: true,
      card: 'ALT_CORE_B_YZ_10_C',
      visibility: 'all',
    });

    const contest = decodeDecksUrl(convertToParamMap({ set: 'collection', faction: 'ly' }), 'contest');
    expect(contest.contestSet).toBe('all');
    expect(contest.filters.factions).toEqual(['LY']);
  });

  it('round-trips canonical query params and omits defaults', () => {
    const params = encodeDecksUrl(
      'community',
      'mine',
      {
        ...EMPTY_DECK_FILTERS,
        q: '  moyo ',
        factions: ['YZ', 'LY'],
        sort: 'likes',
        legalOnly: false,
        tournament: true,
        card: 'ALT_CORE_B_YZ_10_C',
      },
      'winners',
    );
    expect(params).toEqual({
      tab: 'community',
      format: null,
      faction: 'YZ,LY',
      hero: null,
      q: 'moyo',
      visibility: null,
      archived: null,
      sort: 'likes',
      legal: 'all',
      tournament: '1',
      card: 'ALT_CORE_B_YZ_10_C',
    });

    const nonNull = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null)) as Record<string, string>;
    expect(queryParamsEqual(convertToParamMap(nonNull), params)).toBe(true);
    expect(queryParamsEqual(convertToParamMap({ ...nonNull, extra: '1' }), params)).toBe(false);
  });
});
