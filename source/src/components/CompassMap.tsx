import { Camera, Map } from '@maplibre/maplibre-react-native';
import { StyleSheet, View } from 'react-native';

import { zoomForScale } from '../lib/compassMap';
import { mapStyleFor, type MapLayer } from '../lib/mapSources';

type Props = {
  layer: MapLayer;
  /** Size of the compass it sits behind (the map is centred in it). */
  size: number;
  /** Radius of the compass's inner circle. */
  radius: number;
  center: { latitude: number; longitude: number };
  /** Heading-up: the map turns with the phone. */
  heading: number;
  /** Ground distance (m) from the centre to the inner circle's edge. */
  scaleMeters: number;
};

/** A round, non-interactive map behind the compass's search-area view, matching its scale. */
export function CompassMap({ layer, size, radius, center, heading, scaleMeters }: Props) {
  const offset = size / 2 - radius;
  return (
    <View
      pointerEvents="none"
      style={[styles.clip, { left: offset, top: offset, width: radius * 2, height: radius * 2, borderRadius: radius }]}
    >
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyleFor(layer)}
        dragPan={false}
        touchZoom={false}
        doubleTapZoom={false}
        doubleTapHoldZoom={false}
        touchRotate={false}
        touchPitch={false}
        attribution={false}
        logo={false}
        compass={false}
        scaleBar={false}
      >
        <Camera
          center={[center.longitude, center.latitude]}
          zoom={zoomForScale(scaleMeters, radius, center.latitude)}
          bearing={heading}
          duration={0}
        />
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', overflow: 'hidden' },
});
