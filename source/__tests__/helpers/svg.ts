// react-native-svg renders <Text> as RNSVGText/RNSVGTSpan host elements whose text is in a
// `content` prop, which screen.getByText can't see. This collects those strings.
export function svgTexts(json: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const n = node as { props?: { content?: unknown }; children?: unknown };
    if (typeof n.props?.content === 'string') out.push(n.props.content);
    walk(n.children);
  };
  walk(json);
  return out;
}

/** Angles (degrees) of the rotated groups in a rendered tree: the rose, and the arrow when drawn. */
export function svgRotations(json: unknown): number[] {
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
