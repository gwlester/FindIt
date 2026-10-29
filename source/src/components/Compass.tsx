import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '../lib/theme';

type Props = {
  size: number;
  /** Direction the top of the phone points, degrees clockwise from north. */
  heading: number | null;
  /** Direction to the target, degrees clockwise from north. */
  bearing: number | null;
  /**
   * Close to the target: draw a small map instead of the arrow, with the target and its
   * search circle (radiusM) and your own GPS uncertainty (youM), to `scale`.
   */
  searchArea?: {
    distanceM: number;
    radiusM: number;
    youM: number;
    scale: { meters: number; label: string; halfLabel: string };
  };
};

const CARDINALS = [
  { label: 'N', deg: 0 },
  { label: 'E', deg: 90 },
  { label: 'S', deg: 180 },
  { label: 'W', deg: 270 },
];

/**
 * Outer rose rotates opposite to the phone so N/E/S/W stay pointing at the real
 * directions; the inner arrow points at the target. With `searchArea`, the inner circle
 * is instead a heading-up map (north-up without a heading) with you at the centre.
 */
export function Compass({ size, heading, bearing, searchArea }: Props) {
  const theme = useTheme();
  const c = size / 2;
  const outer = c - 14;
  const inner = outer - 46;
  const roseRotation = heading == null ? 0 : -heading;
  const arrowRotation = heading == null || bearing == null ? null : bearing - heading;

  const ticks = [];
  for (let deg = 0; deg < 360; deg += 5) {
    const major = deg % 30 === 0;
    const len = deg % 90 === 0 ? 14 : major ? 10 : 5;
    ticks.push(
      <Line
        key={deg}
        x1={c}
        y1={c - outer}
        x2={c}
        y2={c - outer + len}
        stroke={deg === 0 ? theme.north : theme.roseRing}
        strokeWidth={major ? 2 : 1}
        rotation={deg}
        origin={`${c}, ${c}`}
      />,
    );
  }

  const degreeLabels = [30, 60, 120, 150, 210, 240, 300, 330].map((deg) => (
    <G key={deg} rotation={deg} origin={`${c}, ${c}`}>
      <SvgText x={c} y={c - outer + 28} fontSize={10} fill={theme.muted} textAnchor="middle">
        {deg}
      </SvgText>
    </G>
  ));

  const arrowTip = c - inner + 10;
  const arrowHeadBase = arrowTip + 44;
  const arrowTail = c + inner - 22;

  return (
    <Svg width={size} height={size}>
      {/* Fixed lubber mark: the direction the phone is pointing. */}
      <Polygon points={`${c - 8},2 ${c + 8},2 ${c},14`} fill={theme.accent} />

      <G rotation={roseRotation} origin={`${c}, ${c}`}>
        <Circle cx={c} cy={c} r={outer} fill={theme.roseFace} stroke={theme.roseRing} strokeWidth={3} />
        {ticks}
        {degreeLabels}
        {CARDINALS.map(({ label, deg }) => (
          <G key={label} rotation={deg} origin={`${c}, ${c}`}>
            <SvgText
              x={c}
              y={c - outer + 36}
              fontSize={label === 'N' ? 22 : 18}
              fontWeight="bold"
              fill={label === 'N' ? theme.north : theme.text}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          </G>
        ))}
      </G>

      {searchArea && bearing != null ? (
        <SearchAreaMap c={c} inner={inner} relativeBearing={bearing - (heading ?? 0)} {...searchArea} />
      ) : (
        <Circle cx={c} cy={c} r={inner} fill="none" stroke={theme.border} strokeWidth={2} />
      )}

      {!searchArea && arrowRotation != null && (
        <G rotation={arrowRotation} origin={`${c}, ${c}`}>
          <Polygon
            points={`${c},${arrowTip} ${c + 24},${arrowHeadBase} ${c + 8},${arrowHeadBase} ${c + 8},${arrowTail} ${c - 8},${arrowTail} ${c - 8},${arrowHeadBase} ${c - 24},${arrowHeadBase}`}
            fill={theme.accent}
            stroke={theme.roseRing}
            strokeWidth={1}
          />
        </G>
      )}
      {searchArea ? null : <Circle cx={c} cy={c} r={5} fill={theme.roseRing} />}
    </Svg>
  );
}

function SearchAreaMap({
  c,
  inner,
  relativeBearing,
  distanceM,
  radiusM,
  youM,
  scale,
}: { c: number; inner: number; relativeBearing: number } & NonNullable<Props['searchArea']>) {
  const theme = useTheme();
  const px = inner / scale.meters;
  const angle = (relativeBearing * Math.PI) / 180;
  const tx = c + distanceM * px * Math.sin(angle);
  const ty = c - distanceM * px * Math.cos(angle);
  return (
    <G>
      <Circle cx={c} cy={c} r={inner} fill={theme.mapFace} stroke={theme.border} strokeWidth={2} />
      <Circle cx={c} cy={c} r={inner / 2} fill="none" stroke={theme.border} strokeWidth={1} strokeDasharray="3 4" />
      <SvgText x={c} y={c + inner / 2 + 14} fontSize={10} fill={theme.muted} textAnchor="middle">
        {scale.halfLabel}
      </SvgText>
      <SvgText x={c} y={c + inner - 6} fontSize={10} fill={theme.muted} textAnchor="middle">
        {scale.label}
      </SvgText>
      <Line x1={c} y1={c} x2={tx} y2={ty} stroke={theme.accent} strokeWidth={2} strokeDasharray="5 4" />
      {/* Search area: where the cache most likely is. */}
      <Circle
        cx={tx}
        cy={ty}
        r={radiusM * px}
        fill={theme.accent}
        fillOpacity={0.22}
        stroke={theme.accent}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      {youM > 0 ? <Circle cx={c} cy={c} r={youM * px} fill={theme.you} fillOpacity={0.2} /> : null}
      <Circle cx={tx} cy={ty} r={7} fill={theme.roseFace} stroke={theme.text} strokeWidth={2.5} />
      <Line x1={tx - 11} y1={ty} x2={tx + 11} y2={ty} stroke={theme.text} strokeWidth={2} />
      <Line x1={tx} y1={ty - 11} x2={tx} y2={ty + 11} stroke={theme.text} strokeWidth={2} />
      <Circle cx={c} cy={c} r={6} fill={theme.you} stroke={theme.roseFace} strokeWidth={2} />
    </G>
  );
}
