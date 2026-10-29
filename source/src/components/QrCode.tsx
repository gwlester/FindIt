import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

import { qrModules } from '../lib/qr';

const QUIET_ZONE = 4;

/** A QR code, drawn black on white (scanners need the contrast whatever the theme). */
export function QrCode({ value, size, label }: { value: string; size: number; label: string }) {
  const modules = useMemo(() => qrModules(value), [value]);
  const total = modules.length + QUIET_ZONE * 2;
  const dark = useMemo(
    () =>
      modules
        .flatMap((row, r) => row.map((on, c) => (on ? `M${c + QUIET_ZONE} ${r + QUIET_ZONE}h1v1h-1z` : '')))
        .join(''),
    [modules],
  );
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`} accessible style={{ alignSelf: 'center' }} accessibilityRole="image" accessibilityLabel={label}>
      <Rect width={total} height={total} fill="#fff" />
      <Path d={dark} fill="#000" />
    </Svg>
  );
}
