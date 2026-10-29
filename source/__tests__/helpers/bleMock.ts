// react-native-ble-plx mock: a controllable BleManager.
type ScanCb = (error: { message: string } | null, device: unknown) => void;

export const bleState = {
  state: 'PoweredOn',
  scanCallback: null as ScanCb | null,
  stateListeners: new Set<(s: string) => void>(),
  device: null as unknown,
};

export const managerMethods = {
  state: jest.fn(async () => bleState.state),
  onStateChange: jest.fn((listener: (s: string) => void, emitCurrent?: boolean) => {
    bleState.stateListeners.add(listener);
    if (emitCurrent) listener(bleState.state);
    return { remove: jest.fn(() => bleState.stateListeners.delete(listener)) };
  }),
  startDeviceScan: jest.fn(async (_uuids: unknown, _options: unknown, cb: ScanCb) => {
    bleState.scanCallback = cb;
  }),
  stopDeviceScan: jest.fn(async () => {
    bleState.scanCallback = null;
  }),
  connectToDevice: jest.fn(async () => bleState.device),
};

export class BleManager {
  state = managerMethods.state;
  onStateChange = managerMethods.onStateChange;
  startDeviceScan = managerMethods.startDeviceScan;
  stopDeviceScan = managerMethods.stopDeviceScan;
  connectToDevice = managerMethods.connectToDevice;
}

export function setBluetoothState(state: string) {
  bleState.state = state;
  for (const l of [...bleState.stateListeners]) l(state);
}

export function resetBleMock() {
  bleState.state = 'PoweredOn';
  bleState.scanCallback = null;
  bleState.stateListeners.clear();
  bleState.device = null;
  for (const fn of Object.values(managerMethods)) fn.mockClear();
  managerMethods.startDeviceScan.mockImplementation(async (_u, _o, cb: ScanCb) => {
    bleState.scanCallback = cb;
  });
  managerMethods.stopDeviceScan.mockImplementation(async () => {
    bleState.scanCallback = null;
  });
  managerMethods.connectToDevice.mockImplementation(async () => bleState.device);
}
