import { decodeInfo, decodeItem, encodeInfo, encodeItem, encodeName, NAME_UUID, PROTOCOL_VERSION } from '../../src/ble/protocol';

const PLACE = { name: 'Old oak 🌳', latitude: 30.4352, longitude: -91.1903, accuracy: 4.26, notes: 'roots' };

describe('info', () => {
  it('round-trips', () => {
    expect(decodeInfo(encodeInfo('Gerald', 3))).toEqual({ v: PROTOCOL_VERSION, name: 'Gerald', count: 3 });
  });
  it('rejects malformed info', () => {
    expect(() => decodeInfo('{"name":"x"}')).toThrow('Invalid share info');
    expect(() => decodeInfo('{"count":1}')).toThrow('Invalid share info');
  });
});

describe('items', () => {
  it('round-trips, rounding accuracy to 0.1 m', () => {
    expect(decodeItem(encodeItem(PLACE))).toEqual({ ...PLACE, accuracy: 4.3, finds: [] });
  });
  it('keeps a null accuracy', () => {
    expect(decodeItem(encodeItem({ ...PLACE, accuracy: null })).accuracy).toBeNull();
  });
  it('trims long notes, then long names, to fit 500 bytes', () => {
    const longNotes = encodeItem({ ...PLACE, notes: 'x'.repeat(2000) });
    expect(Buffer.byteLength(longNotes)).toBeLessThanOrEqual(500);
    expect(decodeItem(longNotes).name).toBe(PLACE.name);

    const longName = encodeItem({ ...PLACE, name: 'n'.repeat(1000), notes: '' });
    expect(Buffer.byteLength(longName)).toBeLessThanOrEqual(500);
  });
  it('tolerates missing optional fields', () => {
    expect(decodeItem('{"n":"A","la":1,"lo":2}')).toEqual({
      name: 'A',
      latitude: 1,
      longitude: 2,
      accuracy: null,
      notes: '',
      finds: [],
    });
  });
  it('rejects malformed items', () => {
    expect(() => decodeItem('{"n":"A","la":"1","lo":2}')).toThrow('Invalid shared location');
    expect(() => decodeItem('{"la":1,"lo":2}')).toThrow('Invalid shared location');
    expect(() => decodeItem('{"n":"A","la":1}')).toThrow('Invalid shared location');
  });
});

describe('protocol v2: receiver name', () => {
  it('has a NAME characteristic and is version 2', () => {
    expect(NAME_UUID).toBe('5c0a7f14-2b7e-4d1a-9a37-f1d17000c0de');
    expect(PROTOCOL_VERSION).toBe(2);
  });

  it('encodes the name as trimmed UTF-8, at most 40 bytes, without splitting characters', () => {
    expect(encodeName('  Gerald ')).toBe('Gerald');
    expect(Buffer.byteLength(encodeName('é'.repeat(30)))).toBe(40);
    expect(Buffer.byteLength(encodeName('🧭'.repeat(11)))).toBe(40);
    expect(encodeName('🧭'.repeat(11))).toBe('🧭'.repeat(10));
  });
});
