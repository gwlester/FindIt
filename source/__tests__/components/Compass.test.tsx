import { render } from '@testing-library/react-native';

import { Compass, innerRadius } from '../../src/components/Compass';
import { svgTexts } from '../helpers/svg';

// react-native-svg turns rotation props into a transform matrix [cos, sin, -sin, cos, tx, ty]
// on its host group elements; read the angles of the rotated groups back from it.
function rotations(json: unknown): number[] {
  const out: number[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const n = node as { type?: string; props?: { matrix?: number[] }; children?: unknown };
    const m = n.props?.matrix;
    if (n.type === 'RNSVGGroup' && m) out.push(Math.round((Math.atan2(m[1], m[0]) * 180) / Math.PI));
    walk(n.children);
  };
  walk(json);
  return out;
}

test('rotates the rose against the heading and the arrow to the target', async () => {
  const { toJSON } = await render(<Compass size={300} heading={30} bearing={75} />);
  const r = rotations(toJSON());
  expect(r).toContain(-30); // rose
  expect(r).toContain(45); // arrow: bearing − heading
});

test('without heading the rose stays north-up and there is no arrow', async () => {
  const { toJSON } = await render(<Compass size={300} heading={null} bearing={75} />);
  const r = rotations(toJSON());
  expect(r[0]).toBe(0); // rose north-up
  expect(r).not.toContain(75);
  const noBearing = rotations((await render(<Compass size={300} heading={10} bearing={null} />)).toJSON());
  expect(noBearing).toContain(-10);
});

describe('search-area view', () => {
  type Node = { type?: string; props?: Record<string, unknown>; children?: unknown };
  const circles = (json: unknown) => {
    const out: Record<string, unknown>[] = [];
    const walk = (n: unknown) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(walk);
      const node = n as Node;
      if (node.type === 'RNSVGCircle' && node.props) out.push(node.props);
      walk(node.children);
    };
    walk(json);
    return out;
  };
  const SCALE = { meters: 20, label: '20 m', halfLabel: '10 m' };

  it('draws the cache, its search circle and your halo to scale instead of the arrow', async () => {
    // size 300 → outer ring 136, map radius 90 → 4.5 px per metre at a 20 m scale.
    const { toJSON } = await render(
      <Compass size={300} heading={30} bearing={75} searchArea={{ distanceM: 14, radiusM: 6, youM: 4, scale: SCALE }} />,
    );
    const c = circles(toJSON());
    const search = c.find((p) => p.r === 27);
    expect(search).toBeDefined();
    expect(search!.cx as number).toBeCloseTo(150 + 63 * Math.SQRT1_2, 1); // 45° right of straight ahead
    expect(search!.cy as number).toBeCloseTo(150 - 63 * Math.SQRT1_2, 1);
    expect(c.some((p) => p.r === 18)).toBe(true); // your GPS halo
    expect(svgTexts(toJSON())).toEqual(expect.arrayContaining(['20 m', '10 m']));
    expect(rotations(toJSON())).not.toContain(45); // no arrow
  });

  it('leaves the face clear when a map is drawn behind it', async () => {
    const draw = async (mapBehind?: boolean) =>
      circles(
        (
          await render(
            <Compass
              size={300}
              heading={0}
              bearing={0}
              mapBehind={mapBehind}
              searchArea={{ distanceM: 10, radiusM: 5, youM: 0, scale: SCALE }}
            />,
          )
        ).toJSON(),
      );
    const plain = await draw();
    expect(plain.find((p) => p.r === 90)!.fillOpacity).not.toBe(0);
    expect(plain.find((p) => p.r === 136)!.fillOpacity).not.toBe(0);
    const withMap = await draw(true);
    expect(withMap.find((p) => p.r === 90)!.fillOpacity).toBe(0); // search-area face
    expect(withMap.find((p) => p.r === 136)!.fillOpacity).toBe(0); // rose face
    // The rose is a ring from the inner circle out to the edge instead.
    expect(withMap.find((p) => p.r === 113)).toMatchObject({ fillOpacity: 0, strokeWidth: 46 });
  });

  it('is north-up without a heading', async () => {
    const { toJSON } = await render(
      <Compass size={300} heading={null} bearing={90} searchArea={{ distanceM: 10, radiusM: 5, youM: 0, scale: SCALE }} />,
    );
    const search = circles(toJSON()).find((p) => p.r === 22.5)!;
    expect(search.cx as number).toBeCloseTo(195, 1);
    expect(search.cy as number).toBeCloseTo(150, 1);
  });
});

test('the inner circle radius, for placing a map behind it', () => {
  expect(innerRadius(300)).toBe(90);
});
