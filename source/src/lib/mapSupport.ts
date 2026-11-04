import { supportedCpuArchitectures } from 'expo-device';

/**
 * Maps need 64-bit code: the map and satellite views are turned off on phones that can only
 * run 32-bit apps (they are too slow there). When the architecture is unknown, maps stay on.
 */
export function mapsSupported(): boolean {
  if (!supportedCpuArchitectures) return true;
  return supportedCpuArchitectures.some((abi) => abi.includes('64'));
}
