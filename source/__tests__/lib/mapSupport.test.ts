import { mapsSupported } from '../../src/lib/mapSupport';
import { setSupportedCpuArchitectures } from '../helpers/expoDeviceMock';

test.each([
  [['arm64-v8a', 'armeabi-v7a', 'armeabi']],
  [['x86_64', 'x86']],
  [['armeabi-v7a', 'arm64-v8a']],
])('maps are supported when the phone can run 64-bit code: %j', (abis) => {
  setSupportedCpuArchitectures(abis);
  expect(mapsSupported()).toBe(true);
});

test.each([[['armeabi-v7a', 'armeabi']], [['x86']], [[]]])('maps are not supported on a 32-bit-only phone: %j', (abis) => {
  setSupportedCpuArchitectures(abis);
  expect(mapsSupported()).toBe(false);
});

test('maps stay on when the architecture is unknown', () => {
  setSupportedCpuArchitectures(null);
  expect(mapsSupported()).toBe(true);
});
