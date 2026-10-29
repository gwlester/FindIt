import { render } from '@testing-library/react-native';

import { Compass } from '../../src/components/Compass';

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
