// expo-device mock: `deviceName` is what the user set in Android's Settings → About phone → Device name.
export let deviceName: string | null = null;
export const manufacturer = 'Google';
export const modelName = 'Pixel 8';
export const osVersion = '15';

// The CPU ABIs the phone supports, most preferred first. Modern phones list arm64-v8a first.
export let supportedCpuArchitectures: string[] | null = ['arm64-v8a', 'armeabi-v7a'];

export function setDeviceName(name: string | null) {
  deviceName = name;
}

export function setSupportedCpuArchitectures(abis: string[] | null) {
  supportedCpuArchitectures = abis;
}

export function resetDeviceMock() {
  deviceName = null;
  supportedCpuArchitectures = ['arm64-v8a', 'armeabi-v7a'];
}
