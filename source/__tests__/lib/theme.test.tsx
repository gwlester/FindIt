import { renderHook } from '@testing-library/react-native';
import * as RN from 'react-native';

import { useTheme } from '../../src/lib/theme';

test("useTheme follows the colour scheme", async () => {
  const spy = jest.spyOn(RN, 'useColorScheme');
  spy.mockReturnValue('dark');
  const dark = (await renderHook(() => useTheme())).result.current;
  spy.mockReturnValue('light');
  const light = (await renderHook(() => useTheme())).result.current;
  expect(dark.background).not.toBe(light.background);
  expect(light.background).toBe('#f6f7f9');
  spy.mockRestore();
});
