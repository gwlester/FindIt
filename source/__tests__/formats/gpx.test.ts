import { parseGpx, toGpx } from '../../src/formats/gpx';
import { FormatError } from '../../src/formats/types';

const PLACES = [
  {
    name: 'Old oak <tree> & "roots"',
    latitude: 30.4352,
    longitude: -91.1903,
    accuracy: 2.14,
    notes: "Under the roots, it's north",
    createdAt: Date.UTC(2026, 9, 28, 14, 3),
  },
  { name: 'Bare', latitude: -0.5, longitude: 10, accuracy: null, notes: '', createdAt: null },
];

describe('toGpx', () => {
  const xml = toGpx(PLACES, new Date(Date.UTC(2026, 9, 29)));

  it('writes a GPX 1.1 document with escaped text and schema-ordered children', () => {
    expect(xml).toContain('<gpx version="1.1" creator="FindCache"');
    expect(xml).toContain('<time>2026-10-29T00:00:00.000Z</time>');
    expect(xml).toContain('<wpt lat="30.4352" lon="-91.1903">');
    expect(xml).toContain('<name>Old oak &lt;tree&gt; &amp; &quot;roots&quot;</name>');
    expect(xml).toContain('<desc>Under the roots, it&apos;s north</desc>');
    expect(xml).toContain('<findit:accuracy>2.1</findit:accuracy>');
    expect(xml.indexOf('<time>2026-10-28')).toBeLessThan(xml.indexOf('<name>Old oak'));
  });

  it('omits optional elements and keeps integer coordinates tidy', () => {
    const bare = xml.slice(xml.indexOf('<wpt lat="-0.5"'));
    expect(bare).toContain('<wpt lat="-0.5" lon="10">');
    expect(bare).not.toContain('<desc>');
    expect(bare).not.toContain('<extensions>');
    expect(bare.split('</wpt>')[0]).not.toContain('<time>');
  });

  it('round-trips through parseGpx', () => {
    const parsed = parseGpx(xml);
    expect(parsed.format).toBe('gpx');
    expect(parsed.skipped).toBe(0);
    expect(parsed.places).toEqual([
      { ...PLACES[0], accuracy: 2.1, finds: [] },
      { ...PLACES[1], finds: [] },
    ]);
  });

  it('defaults the export time to now', () => {
    expect(toGpx([])).toMatch(/<time>\d{4}-\d{2}-\d{2}T/);
  });
});

describe('parseGpx', () => {
  it('reads geocaching.com GPX 1.0 caches (name, code, hint)', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/0" version="1.0" creator="Groundspeak"
     xmlns:groundspeak="http://www.groundspeak.com/cache/1/0/1">
  <wpt lat="30.4352" lon="-91.1903">
    <time>2020-01-02T00:00:00Z</time>
    <name>GC12345</name>
    <desc>Old Oak by someone, Traditional Cache (1.5/2)</desc>
    <urlname>Old Oak</urlname>
    <sym>Geocache</sym>
    <groundspeak:cache id="1" available="True" archived="False">
      <groundspeak:name>Old Oak</groundspeak:name>
      <groundspeak:encoded_hints>Under the roots</groundspeak:encoded_hints>
    </groundspeak:cache>
  </wpt>
</gpx>`;
    const { places } = parseGpx(xml);
    expect(places).toEqual([
      {
        name: 'Old Oak (GC12345)',
        latitude: 30.4352,
        longitude: -91.1903,
        accuracy: null,
        notes: 'Hint: Under the roots',
        createdAt: Date.UTC(2020, 0, 2),
        finds: [],
      },
    ]);
  });

  it('reads GPX 1.1 Groundspeak extensions and comments', () => {
    const xml = `<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
      <wpt lat="1" lon="2"><name>GCAAAA</name><cmt>Bring a pen</cmt>
        <extensions><groundspeak:cache xmlns:groundspeak="x"><groundspeak:name>Bridge</groundspeak:name></groundspeak:cache></extensions>
      </wpt>
      <wpt lat="3" lon="4"><name>Same</name><extensions><cache><name>Same</name></cache></extensions></wpt>
    </gpx>`;
    expect(parseGpx(xml).places.map((p) => [p.name, p.notes])).toEqual([
      ['Bridge (GCAAAA)', 'Bring a pen'],
      ['Same', ''],
    ]);
  });

  it('falls back to desc, then a numbered name; uses cmt when there is no desc', () => {
    const xml = `<gpx><wpt lat="1" lon="2"><desc>Only a description</desc></wpt><wpt lat="1" lon="2"><cmt>c</cmt></wpt></gpx>`;
    expect(parseGpx(xml).places.map((p) => [p.name, p.notes])).toEqual([
      ['Only a description', 'Only a description'],
      ['Waypoint 2', 'c'],
    ]);
  });

  it('handles elements with attributes, numeric names and bad accuracy/time values', () => {
    const xml = `<gpx>
      <wpt lat="1" lon="2"><name lang="en">Attr</name><time>not a date</time><extensions><accuracy>-3</accuracy></extensions></wpt>
      <wpt lat="1" lon="2"><name>12345</name><extensions><accuracy>abc</accuracy></extensions></wpt>
      <wpt lat="1" lon="2"><name><b/></name><desc>From desc</desc></wpt>
    </gpx>`;
    const { places } = parseGpx(xml);
    expect(places.map((p) => p.name)).toEqual(['Attr', '12345', 'From desc']);
    expect(places.every((p) => p.accuracy === null && p.createdAt === null)).toBe(true);
  });

  it('skips waypoints with bad coordinates, routes and tracks', () => {
    const xml = `<gpx>
      <wpt lat="91" lon="0"><name>bad</name></wpt>
      <wpt lat="x" lon="0"/>
      <wpt>text only</wpt>
      <wpt lat="1" lon="2"><name>good</name></wpt>
      <rte><rtept lat="1" lon="1"/></rte>
      <trk><trkseg/></trk>
    </gpx>`;
    const result = parseGpx(xml);
    expect(result.places.map((p) => p.name)).toEqual(['good']);
    expect(result.skipped).toBe(5);
  });

  it('accepts a GPX with no waypoints', () => {
    expect(parseGpx('<gpx version="1.1"></gpx>')).toEqual({ format: 'gpx', places: [], skipped: 0 });
  });

  it('rejects non-GPX and malformed XML', () => {
    expect(() => parseGpx('<kml></kml>')).toThrow(FormatError);
    expect(() => parseGpx('<gpx>text</gpx>')).toThrow('no <gpx> element');
    expect(() => parseGpx('<gpx><wpt></gpx>')).toThrow(/Not a valid GPX file: .*\(line 1\)/);
    expect(() => parseGpx('not xml at all')).toThrow(/Not a valid GPX file/);
  });
});
