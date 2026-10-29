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
