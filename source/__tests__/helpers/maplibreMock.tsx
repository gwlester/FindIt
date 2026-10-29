// @maplibre/maplibre-react-native mock: renders plain views that keep their props, so tests can
// read the map style/camera and fire map events (e.g. props.onRegionDidChange({ nativeEvent })).
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type Props = { children?: ReactNode; [key: string]: unknown };

export function Map({ children, ...props }: Props) {
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
