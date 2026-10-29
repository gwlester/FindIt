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
| NAME characteristic (write, v2) | `5c0a7f14-2b7e-4d1a-9a37-f1d17000c0de` |

They are defined twice and must stay in sync: `source/src/ble/protocol.ts` and
`source/modules/findit-native/android/.../ShareServer.kt`.

## Advertising

- Advertisement: the 128-bit service UUID (connectable).
- Scan response: service data for the service UUID containing the sharer's display name,
  UTF-8, truncated to 13 bytes so it fits. Scanners show this name before connecting.

## Transfer

All values are UTF-8 JSON (or text) and kept under the 512-byte ATT value limit. The
server honours read offsets, so long reads work at any MTU; the client also asks for MTU 512.

1. *(v2)* Write **NAME** with the receiver's display name: UTF-8, trimmed, at most 40 bytes
   (cut at a character boundary). Optional; the client ignores an error here so it still
   works with v1 servers, which lack the characteristic.
2. Read **INFO** → `{"v":2,"name":"Gerald","count":3}`
3. For `i` in `0 … count-1`:
   1. Write **INDEX** with the decimal text `"i"` (write with response).
   2. Read **ITEM** → `{"n":"Old oak","la":30.4352,"lo":-91.1903,"a":4.3,"t":"notes"}`
      (`n` name, `la`/`lo` latitude/longitude, `a` accuracy in metres or `null`, `t` notes).
      If the sharer chose to include finds, `f` is a list of `[foundAt, comment]` or
      `[foundAt, comment, finder]` (newest first; no finder = the sharer's own find).
      To fit, the oldest finds are dropped first, then notes, then the name, are trimmed.
4. Disconnect.

## Sharing history (v2)

The server remembers, per connected device, the NAME written and which ITEM indices were read
(counted on the first chunk, offset 0, of each read). On disconnect the `onSharePeer` event
carries `{address, state: "disconnected", name?, itemsRead}` and the app records a history
row when `itemsRead > 0`, using "FindCache user" if no name was sent.

The server tracks the selected INDEX per connected device, so several phones can download at once.

## Permissions (Android 12+)

`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE` (runtime "Nearby devices"
permission). On Android 11 and below, fine location permission covers scanning.

## Version

`v` is `2` (v2 added NAME; the item format is unchanged, so v1 and v2 phones interoperate:
a v1 receiver just isn't named in the history). Bump it (and handle older values) if the
item format changes.
