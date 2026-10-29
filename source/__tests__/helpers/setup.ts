/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories are hoisted, so they must use require() */
// Global mocks for native modules the app uses. Each test file can reset them via
// the helpers exported from these modules.
import { resetBleMock } from './bleMock';
import { useLocalSearchParams } from './expoRouterMock';
import { setCurrentDb } from './expoSqliteMock';
import { resetLocationMock } from './expoLocationMock';
import { resetFileSystemMock } from './fileSystemMock';
import { resetKeepAwakeMock } from './keepAwakeMock';
import { resetMapLibreMock } from './maplibreMock';
import { resetNativeMock } from './nativeModuleMock';

jest.mock('expo-location', () => require('./expoLocationMock'));
jest.mock('expo-sqlite', () => require('./expoSqliteMock'));
jest.mock('expo-keep-awake', () => require('./keepAwakeMock'));
jest.mock('expo-router', () => require('./expoRouterMock'));
jest.mock('react-native-ble-plx', () => require('./bleMock'));
jest.mock('@maplibre/maplibre-react-native', () => require('./maplibreMock'));
jest.mock('../../modules/findit-native', () => ({
  __esModule: true,
  default: require('./nativeModuleMock').nativeMock,
}));
jest.mock('expo-file-system', () => require('./fileSystemMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

beforeEach(() => {
  resetLocationMock();
  resetFileSystemMock();
  resetNativeMock();
  resetBleMock();
  resetKeepAwakeMock();
  resetMapLibreMock();
  setCurrentDb(null);
  useLocalSearchParams.mockReturnValue({});
});
