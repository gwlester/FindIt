// Mock of modules/findit-native (GNSS status + BLE GATT server).
type Listener = (payload: unknown) => void;

const listeners: Record<string, Set<Listener>> = {};

export const nativeMock = {
  startGnssStatus: jest.fn(async (fullTracking: boolean) => fullTracking),
  stopGnssStatus: jest.fn(async () => {}),
  startSharing: jest.fn(async (_name: string, _info: string, _items: string[]) => {}),
  stopSharing: jest.fn(async () => {}),
  isSharing: jest.fn(() => false),
  addListener: jest.fn((event: string, listener: Listener) => {
    (listeners[event] ??= new Set()).add(listener);
    return { remove: jest.fn(() => listeners[event].delete(listener)) };
  }),
};

export function emitNative(event: string, payload: unknown) {
  for (const l of [...(listeners[event] ?? [])]) l(payload);
}

export function resetNativeMock() {
  for (const key of Object.keys(listeners)) listeners[key].clear();
  nativeMock.startGnssStatus.mockReset().mockImplementation(async (fullTracking: boolean) => fullTracking);
  nativeMock.stopGnssStatus.mockReset().mockImplementation(async () => {});
  nativeMock.startSharing.mockReset().mockImplementation(async () => {});
  nativeMock.stopSharing.mockReset().mockImplementation(async () => {});
  nativeMock.isSharing.mockReset().mockImplementation(() => false);
  nativeMock.addListener.mockClear();
}
