// @maplibre/maplibre-react-native mock: renders plain views that keep their props, so tests can
// read the map style/camera and fire map events (e.g. props.onRegionDidChange({ nativeEvent })).
// `mapState.bounds` is what MapRef.getBounds() returns; OfflineManager keeps packs in memory.
import { useImperativeHandle, type ReactNode, type Ref } from 'react';
import { Pressable, View } from 'react-native';

type Props = { children?: ReactNode; [key: string]: unknown };
type Bounds = [number, number, number, number];

export const mapState: { bounds: Bounds } = { bounds: [-91.2, 30.4, -91.1, 30.5] };

export function Map({ children, ref, ...props }: Props) {
  useImperativeHandle(ref as Ref<unknown>, () => ({ getBounds: async () => mapState.bounds }));
  return (
    <View testID="map" {...props}>
      {children}
    </View>
  );
}

export function Camera(props: Props) {
  return <View testID="map-camera" {...props} />;
}

export function Marker({ children, id, onPress, ...props }: Props) {
  return (
    <Pressable
      testID={`marker-${String(id)}`}
      {...props}
      onPress={() => (onPress as ((e: unknown) => void) | undefined)?.({ nativeEvent: { id, lngLat: props.lngLat, point: [0, 0] } })}
    >
      {children}
    </Pressable>
  );
}

export function NativeUserLocation(props: Props) {
  return <View testID="user-location" {...props} />;
}

type Status = {
  id: string;
  state: 'inactive' | 'active' | 'complete';
  percentage: number;
  completedResourceCount: number;
  completedResourceSize: number;
  completedTileCount: number;
  completedTileSize: number;
  requiredResourceCount: number;
};
type Listener = (pack: FakePack, status: Status) => void;
type ErrorListener = (pack: FakePack, error: { id: string; message: string }) => void;

export class FakePack {
  constructor(
    public id: string,
    public metadata: Record<string, unknown>,
    public bounds: Bounds,
    public current: Status,
    public mapStyle: string,
  ) {}
  status = jest.fn(async () => this.current);
  resume = jest.fn(async () => {});
  pause = jest.fn(async () => {});
}

const packs: FakePack[] = [];
const listeners: Record<string, { progress: Listener; error: ErrorListener }> = {};
let nextId = 1;

export const status = (id: string, percentage: number, size = 0): Status => ({
  id,
  state: percentage >= 100 ? 'complete' : 'active',
  percentage,
  completedResourceCount: 0,
  completedResourceSize: size,
  completedTileCount: 0,
  completedTileSize: size,
  requiredResourceCount: 0,
});

export const OfflineManager = {
  createPack: jest.fn(
    async (
      options: { mapStyle: string; bounds: Bounds; minZoom?: number; maxZoom?: number; metadata?: Record<string, unknown> },
      progress: Listener,
      error: ErrorListener,
    ) => {
      const pack = new FakePack(String(nextId++), options.metadata ?? {}, options.bounds, status('', 0), options.mapStyle);
      pack.current = status(pack.id, 0);
      packs.push(pack);
      listeners[pack.id] = { progress, error };
      return pack;
    },
  ),
  getPacks: jest.fn(async () => [...packs]),
  deletePack: jest.fn(async (id: string) => {
    const i = packs.findIndex((p) => p.id === id);
    if (i >= 0) packs.splice(i, 1);
  }),
  addListener: jest.fn(async (id: string, progress: Listener, error: ErrorListener) => {
    listeners[id] = { progress, error };
  }),
  removeListener: jest.fn((id: string) => {
    delete listeners[id];
  }),
};

/** Reports progress (or an error) for a pack to whoever is listening. */
export function emitPackProgress(id: string, percentage: number, size = 0) {
  const pack = packs.find((p) => p.id === id)!;
  pack.current = status(id, percentage, size);
  listeners[id]?.progress(pack, pack.current);
}
export function emitPackError(id: string, message: string) {
  const pack = packs.find((p) => p.id === id)!;
  listeners[id]?.error(pack, { id, message });
}
export const packListenerIds = () => Object.keys(listeners);

/** Adds an existing pack (as if downloaded earlier). */
export function addFakePack(metadata: Record<string, unknown>, percentage = 100, size = 0, mapStyle = 'style') {
  const id = String(nextId++);
  packs.push(new FakePack(id, metadata, [-91.2, 30.4, -91.1, 30.5], status(id, percentage, size), mapStyle));
  return id;
}

export function resetMapLibreMock() {
  packs.length = 0;
  for (const k of Object.keys(listeners)) delete listeners[k];
  nextId = 1;
  mapState.bounds = [-91.2, 30.4, -91.1, 30.5];
}
