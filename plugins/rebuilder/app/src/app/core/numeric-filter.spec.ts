import { HttpParams } from '@angular/common/http';
import { encodeProxyStat, encodeUnifiedStat, parseCostExpression, parseNumericFilter } from './numeric-filter';

describe('numeric-filter', () => {
  it('distinguishes empty, invalid, impossible, and values without magic sentinels', () => {
    expect(parseNumericFilter('')).toEqual({ kind: 'empty' });
    expect(parseNumericFilter('   ')).toEqual({ kind: 'empty' });
    expect(parseNumericFilter('abc')).toEqual({ kind: 'invalid' });
    expect(parseNumericFilter('1,,3')).toEqual({ kind: 'invalid' });
    expect(parseNumericFilter('20')).toEqual({ kind: 'impossible' });
    expect(parseNumericFilter('>15')).toEqual({ kind: 'impossible' });
    expect(parseNumericFilter('<0')).toEqual({ kind: 'impossible' });
    expect(parseNumericFilter('1 3')).toEqual({ kind: 'values', values: [1, 3] });
    expect(parseNumericFilter('1 - 3')).toEqual({ kind: 'values', values: [1, 2, 3] });
    expect(parseNumericFilter('>= 13')).toEqual({ kind: 'values', values: [13, 14, 15] });
    expect(parseNumericFilter('2, 20')).toEqual({ kind: 'values', values: [2] });
  });

  it('keeps parseCostExpression compatibility', () => {
    expect(parseCostExpression('')).toEqual([]);
    expect(parseCostExpression('20')).toEqual([]);
    expect(parseCostExpression('abc')).toBeNull();
    expect(parseCostExpression('1 3')).toEqual([1, 3]);
  });

  it('encodes unified stats cleanly including impossible filters', () => {
    let hp = new HttpParams();
    hp = encodeUnifiedStat(hp, 'mainCost', parseNumericFilter('1 3'));
    hp = encodeUnifiedStat(hp, 'recallCost', parseNumericFilter('20'));
    hp = encodeUnifiedStat(hp, 'forestPower', parseNumericFilter(''));
    expect(hp.getAll('mainCost[]')).toEqual(['1', '3']);
    expect(hp.get('recallCost[gt]')).toBe('15');
    expect(hp.has('forestPower[]')).toBe(false);
  });

  it('encodes account proxy stats as [gte]/[lte] for contiguous spans and [] for disjoint lists', () => {
    let hp = new HttpParams();
    hp = encodeProxyStat(hp, 'mainCost', '1 - 3');
    hp = encodeProxyStat(hp, 'recallCost', '1 4');
    hp = encodeProxyStat(hp, 'forestPower', '20');
    expect(hp.get('mainCost[gte]')).toBe('1');
    expect(hp.get('mainCost[lte]')).toBe('3');
    expect(hp.getAll('recallCost[]')).toEqual(['1', '4']);
    expect(hp.get('forestPower[gt]')).toBe('15');
  });
});
