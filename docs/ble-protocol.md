# Bluetooth sharing protocol

A phone that is **sharing** runs a BLE GATT server and advertises it. A phone that is
**receiving** scans for that service, connects, and reads the places one at a time.

## Identifiers

| Item | UUID |
| --- | --- |
| Service | `5c0a7f10-2b7e-4d1a-9a37-f1d17000c0de` |
| INFO characteristic (read) | `5c0a7f11-2b7e-4d1a-9a37-f1d17000c0de` |
| INDEX characteristic (write) | `5c0a7f12-2b7e-4d1a-9a37-f1d17000c0de` |
| ITEM characteristic (read) | `5c0a7f13-2b7e-4d1a-9a37-f1d17000c0de` |

They are defined twice and must stay in sync: `source/src/ble/protocol.ts` and
`source/modules/findit-native/android/.../ShareServer.kt`.

## Advertising

- Advertisement: the 128-bit service UUID (connectable).
- Scan response: service data for the service UUID containing the sharer's display name,
  UTF-8, truncated to 13 bytes so it fits. Scanners show this name before connecting.

## Transfer

All values are UTF-8 JSON (or text) and kept under the 512-byte ATT value limit. The
server honours read offsets, so long reads work at any MTU; the client also asks for MTU 512.

1. Read **INFO** → `{"v":1,"name":"Gerald","count":3}`
2. For `i` in `0 … count-1`:
   1. Write **INDEX** with the decimal text `"i"` (write with response).
   2. Read **ITEM** → `{"n":"Old oak","la":30.4352,"lo":-91.1903,"a":4.3,"t":"notes"}`
      (`n` name, `la`/`lo` latitude/longitude, `a` accuracy in metres or `null`, `t` notes).
      Long notes are trimmed so the item fits.
3. Disconnect.

The server tracks the selected INDEX per connected device, so several phones can download at once.

## Permissions (Android 12+)

`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE` (runtime "Nearby devices"
permission). On Android 11 and below, fine location permission covers scanning.

## Version

`v` is `1`. Bump it (and handle older values) if the item format changes.
