import { defaultDisplayName } from '../../src/lib/deviceName';
import { setDeviceName } from '../helpers/expoDeviceMock';

test('is the name the user gave the phone', () => {
  setDeviceName('  Gerald’s Pixel 8 ');
  expect(defaultDisplayName()).toBe('Gerald’s Pixel 8');
});

test.each([null, '', '   '])('falls back to "FindCache user" when the device name is %j', (name) => {
  setDeviceName(name);
  expect(defaultDisplayName()).toBe('FindCache user');
});
