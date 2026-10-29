// expo-device mock: `deviceName` is what the user set in Android's Settings → About phone → Device name.
export let deviceName: string | null = null;

export function setDeviceName(name: string | null) {
  deviceName = name;
}

export function resetDeviceMock() {
  deviceName = null;
}
