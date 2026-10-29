import { base64ToBytes, base64ToText, bytesToBase64, textToBase64, utf8ByteLength } from '../../src/lib/base64';

const SAMPLES = ['', 'a', 'ab', 'abc', 'abcd', 'Café', '☕ coffee', '🧭 compass', 'Ñandú ö ß 中文'];

describe('base64', () => {
  it.each(SAMPLES)('round-trips %j and matches Node', (text) => {
    const encoded = textToBase64(text);
    expect(encoded).toBe(Buffer.from(text, 'utf8').toString('base64'));
    expect(base64ToText(encoded)).toBe(text);
  });

  it('decodes base64 produced elsewhere, ignoring whitespace and padding', () => {
    const encoded = Buffer.from('🧭 FindIt', 'utf8').toString('base64');
    expect(base64ToText(`${encoded.slice(0, 4)}\n${encoded.slice(4)}`)).toBe('🧭 FindIt');
  });

  it('converts bytes both ways', () => {
    const bytes = [0, 1, 254, 255, 128];
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('counts UTF-8 bytes', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('é')).toBe(2);
    expect(utf8ByteLength('☕')).toBe(3);
    expect(utf8ByteLength('🧭')).toBe(4);
  });
});
