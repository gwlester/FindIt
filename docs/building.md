# Building and running

Everything below runs inside `source/`.

## Prerequisites

- Node.js 20+ (developed with Node 22)
- Android Studio with an Android SDK, or an EAS account for cloud builds
- An Android phone with Bluetooth LE and GPS. Emulators have no Bluetooth or real GNSS, so
  sharing and satellite counts need real hardware (two phones to test sharing).

## Install

```bash
cd source
npm install
```

## Run on a device (development build)

The app includes native code (`modules/findit-native`, `react-native-ble-plx`), so it
cannot run in Expo Go. Build and install a development build:

```bash
npx expo run:android
```

Or build in the cloud with EAS (profiles are in `eas.json`):

```bash
npx eas-cli@latest build --profile development --platform android
```

After that, `npm start` serves JavaScript changes to the installed app.

## Checks

```bash
npm run typecheck
npm run lint
```

`npx expo prebuild --platform android` generates the `android/` project. It is
git-ignored; configure native behaviour through `app.json` and config plugins instead
of editing it.

## Adding packages

Use `npx expo install <package>` so versions match the Expo SDK.
