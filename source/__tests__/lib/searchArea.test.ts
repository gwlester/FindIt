import {
  DEFAULT_SEARCH_AREA_M,
  fromDisplayDistance,
  mapScale,
  searchAreaRange,
  showSearchArea,
  stepSearchDistance,
  toDisplayDistance,
} from '../../src/lib/searchArea';

describe('unit conversion of the switch distance', () => {
  it('shows metres rounded to 5 m and feet rounded to 10 ft', () => {
    expect(toDisplayDistance(50, 'metric')).toBe(50);
    expect(toDisplayDistance(48.77, 'metric')).toBe(50);
    expect(toDisplayDistance(50, 'imperial')).toBe(160); // 164 ft
    expect(toDisplayDistance(DEFAULT_SEARCH_AREA_M, 'metric')).toBe(50);
  });

  it('converts a displayed value back to metres', () => {
    expect(fromDisplayDistance(50, 'metric')).toBe(50);
    expect(fromDisplayDistance(160, 'imperial')).toBeCloseTo(48.768, 3);
  });

  it('round-trips through a unit change without drifting', () => {
    const stored = 50;
    expect(toDisplayDistance(fromDisplayDistance(toDisplayDistance(stored, 'imperial'), 'imperial'), 'metric')).toBe(50);
  });

  it('describes the range and step in each unit', () => {
    expect(searchAreaRange('metric')).toEqual({ min: 10, max: 200, step: 5, unit: 'm' });
    expect(searchAreaRange('imperial')).toEqual({ min: 30, max: 650, step: 10, unit: 'ft' });
  });

  it('steps up and down in display units, staying in range', () => {
    expect(stepSearchDistance(50, 'metric', 1)).toBe(55);
    expect(stepSearchDistance(50, 'metric', -1)).toBe(45);
    expect(stepSearchDistance(200, 'metric', 1)).toBe(200);
    expect(stepSearchDistance(10, 'metric', -1)).toBe(10);
    expect(toDisplayDistance(stepSearchDistance(50, 'imperial', 1), 'imperial')).toBe(170);
    expect(toDisplayDistance(stepSearchDistance(9, 'imperial', -1), 'imperial')).toBe(30);
  });
});

describe('showSearchArea', () => {
  it('shows the search area within the switch distance', () => {
    expect(showSearchArea(14, 50)).toBe(true);
    expect(showSearchArea(50, 50)).toBe(true);
    expect(showSearchArea(51, 50)).toBe(false);
  });
  it('never shows it when switched off or without a distance', () => {
    expect(showSearchArea(5, null)).toBe(false);
    expect(showSearchArea(null, 50)).toBe(false);
  });
});

describe('mapScale', () => {
  it('picks the smallest nice scale that fits the cache and its circle', () => {
    expect(mapScale(14, 6, 'metric')).toEqual({ meters: 20, label: '20 m', halfLabel: '10 m' });
    expect(mapScale(3, 4, 'metric')).toEqual({ meters: 10, label: '10 m', halfLabel: '5 m' });
    expect(mapScale(45, 8, 'metric')).toEqual({ meters: 100, label: '100 m', halfLabel: '50 m' });
  });
  it('uses round numbers of feet in imperial', () => {
    const s = mapScale(14, 6, 'imperial');
    expect(s.label).toBe('100 ft');
    expect(s.halfLabel).toBe('50 ft');
    expect(s.meters).toBeCloseTo(30.48, 2);
  });
  it('caps at the largest scale', () => {
    expect(mapScale(5000, 10, 'metric').label).toBe('1000 m');
  });
});
