// expo-location mock with controllable position/heading streams.
type Cb<T> = (value: T) => void;

export enum Accuracy {
  Lowest = 1,
  Low = 2,
  Balanced = 3,
  High = 4,
  Highest = 5,
  BestForNavigation = 6,
}

const positionWatchers = new Set<{ cb: Cb<unknown>; err?: Cb<string> }>();
const headingWatchers = new Set<Cb<unknown>>();

export const requestForegroundPermissionsAsync = jest.fn(async () => ({ granted: true }));
export const hasServicesEnabledAsync = jest.fn(async () => true);

export const watchPositionAsync = jest.fn(async (_options: unknown, cb: Cb<unknown>, err?: Cb<string>) => {
  const entry = { cb, err };
  positionWatchers.add(entry);
  return { remove: jest.fn(() => positionWatchers.delete(entry)) };
});

export const watchHeadingAsync = jest.fn(async (cb: Cb<unknown>) => {
  headingWatchers.add(cb);
  return { remove: jest.fn(() => headingWatchers.delete(cb)) };
});

export function emitPosition(coords: { latitude: number; longitude: number; accuracy?: number | null }, timestamp = Date.now()) {
  for (const w of [...positionWatchers]) {
    w.cb({ coords: { accuracy: null, ...coords }, timestamp });
  }
}

export function emitPositionError(message: string) {
  for (const w of [...positionWatchers]) w.err?.(message);
}

export function emitHeading(heading: { trueHeading: number; magHeading: number; accuracy: number }) {
  for (const cb of [...headingWatchers]) cb(heading);
}

export function positionWatcherCount() {
  return positionWatchers.size;
}

export function resetLocationMock() {
  positionWatchers.clear();
  headingWatchers.clear();
  requestForegroundPermissionsAsync.mockReset().mockImplementation(async () => ({ granted: true }));
  hasServicesEnabledAsync.mockReset().mockImplementation(async () => true);
  watchPositionAsync.mockClear();
  watchHeadingAsync.mockClear();
}
