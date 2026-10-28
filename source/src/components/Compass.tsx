import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '../lib/theme';

type Props = {
  size: number;
  /** Direction the top of the phone points, degrees clockwise from north. */
  heading: number | null;
  /** Direction to the target, degrees clockwise from north. */
  bearing: number | null;
};

const CARDINALS = [
  { label: 'N', deg: 0 },
  { label: 'E', deg: 90 },
  { label: 'S', deg: 180 },
  { label: 'W', deg: 270 },
];

/**
 * Outer rose rotates opposite to the phone so N/E/S/W stay pointing at the real
 * directions; the inner arrow points at the target.
 */
export function Compass({ size, heading, bearing }: Props) {
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

      <Circle cx={c} cy={c} r={inner} fill="none" stroke={theme.border} strokeWidth={2} />

      {arrowRotation != null && (
        <G rotation={arrowRotation} origin={`${c}, ${c}`}>
          <Polygon
            points={`${c},${arrowTip} ${c + 24},${arrowHeadBase} ${c + 8},${arrowHeadBase} ${c + 8},${arrowTail} ${c - 8},${arrowTail} ${c - 8},${arrowHeadBase} ${c - 24},${arrowHeadBase}`}
            fill={theme.accent}
            stroke={theme.roseRing}
            strokeWidth={1}
          />
        </G>
      )}
      <Circle cx={c} cy={c} r={5} fill={theme.roseRing} />
    </Svg>
  );
}
