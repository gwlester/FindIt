package expo.modules.findit

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.Build
import android.os.ParcelUuid
import java.io.ByteArrayOutputStream
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * BLE GATT server that lets nearby FindCache users download our shared locations.
 *
 * Protocol (all values UTF-8):
 *  - INFO  (read):  JSON `{"v":2,"name":"...","count":N}`
 *  - INDEX (write): decimal index of the item the connected central wants next
 *  - ITEM  (read):  JSON of the item selected by that central's last INDEX write
 *  - NAME  (write, v2): the receiver's display name, at most 40 bytes
 *
 * On disconnect the peer event carries the receiver's name (if it sent one) and how
 * many distinct items it read, so the app can keep a sharing history.
 *
 * Each value stays under the 512 byte ATT limit, and reads honour the offset so
 * long reads work with any MTU. Writes longer than the MTU arrive as a "long write"
 * (prepared pieces, then execute) and are handled too. The INDEX selection is tracked
 * per central.
 *
 * `onLog` gets a line for the app's debug log at each step (advertising, connections,
 * reads and writes); the app only stores them while debug logging is on.
 */
@SuppressLint("MissingPermission") // The module checks Bluetooth permissions before use.
class ShareServer(
  private val context: Context,
  private val onPeer: (Map<String, Any>) -> Unit,
  private val onLog: (String) -> Unit = {}
) {
  companion object {
    val SERVICE_UUID: UUID = UUID.fromString("5c0a7f10-2b7e-4d1a-9a37-f1d17000c0de")
    val INFO_UUID: UUID = UUID.fromString("5c0a7f11-2b7e-4d1a-9a37-f1d17000c0de")
    val INDEX_UUID: UUID = UUID.fromString("5c0a7f12-2b7e-4d1a-9a37-f1d17000c0de")
    val ITEM_UUID: UUID = UUID.fromString("5c0a7f13-2b7e-4d1a-9a37-f1d17000c0de")
    val NAME_UUID: UUID = UUID.fromString("5c0a7f14-2b7e-4d1a-9a37-f1d17000c0de")

    // 31 byte scan response minus length, type and 128-bit UUID.
    private const val MAX_ADVERTISED_NAME_BYTES = 13
    private const val MAX_VALUE_BYTES = 512
    private const val MAX_PEER_NAME_BYTES = 40
  }

  private val bluetoothManager =
    context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager

  private var gattServer: BluetoothGattServer? = null
  private var advertiser: BluetoothLeAdvertiser? = null
  private var advertiseCallback: AdvertiseCallback? = null

  @Volatile private var info: ByteArray = ByteArray(0)
  @Volatile private var items: List<ByteArray> = emptyList()
  private val selectedIndex = ConcurrentHashMap<String, Int>()
  private val peerNames = ConcurrentHashMap<String, String>()
  private val itemsRead = ConcurrentHashMap<String, MutableSet<Int>>()
  // Pieces of a long write per central: the characteristic and the bytes so far.
  private val preparedWrites = ConcurrentHashMap<String, Pair<UUID, ByteArrayOutputStream>>()

  val isRunning: Boolean
    get() = gattServer != null

  fun start(advertisedName: String, infoJson: String, itemJson: List<String>, onResult: (String?) -> Unit) {
    stop()

    val adapter = bluetoothManager.adapter
    if (adapter == null) return fail(onResult, "This device has no Bluetooth adapter")
    if (!adapter.isEnabled) return fail(onResult, "Bluetooth is turned off")
    val leAdvertiser = adapter.bluetoothLeAdvertiser
      ?: return fail(onResult, "This device does not support Bluetooth LE advertising")
    val extended = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && adapter.isLeExtendedAdvertisingSupported
    onLog(
      "Server starting: ${itemJson.size} items, Android API ${Build.VERSION.SDK_INT}, " +
        "multiple advertisement ${adapter.isMultipleAdvertisementSupported}, extended advertising $extended"
    )

    val encodedItems = itemJson.map { it.toByteArray(Charsets.UTF_8) }
    if (encodedItems.any { it.size > MAX_VALUE_BYTES }) {
      return fail(onResult, "A shared location is too large to send")
    }
    info = infoJson.toByteArray(Charsets.UTF_8)
    items = encodedItems

    val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY).apply {
      addCharacteristic(
        BluetoothGattCharacteristic(
          INFO_UUID,
          BluetoothGattCharacteristic.PROPERTY_READ,
          BluetoothGattCharacteristic.PERMISSION_READ
        )
      )
      addCharacteristic(
        BluetoothGattCharacteristic(
          INDEX_UUID,
          BluetoothGattCharacteristic.PROPERTY_WRITE,
          BluetoothGattCharacteristic.PERMISSION_WRITE
        )
      )
      addCharacteristic(
        BluetoothGattCharacteristic(
          ITEM_UUID,
          BluetoothGattCharacteristic.PROPERTY_READ,
          BluetoothGattCharacteristic.PERMISSION_READ
        )
      )
      addCharacteristic(
        BluetoothGattCharacteristic(
          NAME_UUID,
          BluetoothGattCharacteristic.PROPERTY_WRITE,
          BluetoothGattCharacteristic.PERMISSION_WRITE
        )
      )
    }

    val callback = object : BluetoothGattServerCallback() {
      override fun onServiceAdded(status: Int, added: BluetoothGattService) {
        if (status != BluetoothGatt.GATT_SUCCESS) {
          stop()
          fail(onResult, "Could not start the sharing service (status $status)")
          return
        }
        onLog("GATT service added")
        startAdvertising(leAdvertiser, advertisedName, onResult)
      }

      override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
        onLog("Connection ${device.address}: state $newState (2 connected, 0 disconnected), status $status")
        when (newState) {
          BluetoothProfile.STATE_CONNECTED ->
            onPeer(mapOf("address" to device.address, "state" to "connected"))
          BluetoothProfile.STATE_DISCONNECTED -> {
            selectedIndex.remove(device.address)
            preparedWrites.remove(device.address)
            val name = peerNames.remove(device.address)
            val read = itemsRead.remove(device.address)?.size ?: 0
            val event = mutableMapOf<String, Any>(
              "address" to device.address,
              "state" to "disconnected",
              "itemsRead" to read
            )
            if (name != null) event["name"] = name
            onPeer(event)
          }
        }
      }

      override fun onMtuChanged(device: BluetoothDevice, mtu: Int) {
        onLog("MTU for ${device.address} is $mtu")
      }

      override fun onCharacteristicReadRequest(
        device: BluetoothDevice,
        requestId: Int,
        offset: Int,
        characteristic: BluetoothGattCharacteristic
      ) {
        val index = selectedIndex[device.address] ?: 0
        val value = when (characteristic.uuid) {
          INFO_UUID -> info
          ITEM_UUID -> items.getOrNull(index)
          else -> null
        }
        onLog("Read ${nameOf(characteristic.uuid)} by ${device.address}, offset $offset, ${value?.size ?: "no"} bytes")
        // Count each item once, on the first chunk of a (possibly long) read.
        if (characteristic.uuid == ITEM_UUID && value != null && offset == 0) {
          itemsRead.getOrPut(device.address) { ConcurrentHashMap.newKeySet() }.add(index)
        }
        val server = gattServer ?: return
        when {
          value == null ->
            server.sendResponse(device, requestId, BluetoothGatt.GATT_READ_NOT_PERMITTED, offset, null)
          offset > value.size ->
            server.sendResponse(device, requestId, BluetoothGatt.GATT_INVALID_OFFSET, offset, null)
          else ->
            server.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value.copyOfRange(offset, value.size))
        }
      }

      override fun onCharacteristicWriteRequest(
        device: BluetoothDevice,
        requestId: Int,
        characteristic: BluetoothGattCharacteristic,
        preparedWrite: Boolean,
        responseNeeded: Boolean,
        offset: Int,
        value: ByteArray?
      ) {
        onLog(
          "Write ${nameOf(characteristic.uuid)} by ${device.address}: ${value?.size ?: 0} bytes" +
            if (preparedWrite) " (long write piece at offset $offset)" else ""
        )
        if (preparedWrite) {
          // Collect the pieces until onExecuteWrite; each response echoes its piece back.
          val (_, buffer) = preparedWrites.getOrPut(device.address) { characteristic.uuid to ByteArrayOutputStream() }
          value?.let { buffer.write(it) }
          if (responseNeeded) gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
          return
        }
        val ok = applyWrite(device, characteristic.uuid, value)
        if (responseNeeded) {
          gattServer?.sendResponse(
            device,
            requestId,
            if (ok) BluetoothGatt.GATT_SUCCESS else BluetoothGatt.GATT_WRITE_NOT_PERMITTED,
            0,
            null
          )
        }
      }

      override fun onExecuteWrite(device: BluetoothDevice, requestId: Int, execute: Boolean) {
        val pending = preparedWrites.remove(device.address)
        val ok = !execute || (pending != null && applyWrite(device, pending.first, pending.second.toByteArray()))
        onLog("Long write by ${device.address} ${if (execute) "executed" else "cancelled"}, ok $ok")
        gattServer?.sendResponse(
          device,
          requestId,
          if (ok) BluetoothGatt.GATT_SUCCESS else BluetoothGatt.GATT_WRITE_NOT_PERMITTED,
          0,
          null
        )
      }
    }

    val server = bluetoothManager.openGattServer(context, callback)
      ?: return fail(onResult, "Could not open a Bluetooth GATT server")
    gattServer = server
    if (!server.addService(service)) {
      stop()
      fail(onResult, "Could not register the sharing service")
    }
  }

  /** Applies a complete INDEX or NAME write; false if it isn't valid. */
  private fun applyWrite(device: BluetoothDevice, uuid: UUID, value: ByteArray?): Boolean {
    val text = value?.toString(Charsets.UTF_8)?.trim()
    return when (uuid) {
      INDEX_UUID -> {
        val index = text?.toIntOrNull()
        if (index != null && index in items.indices) {
          selectedIndex[device.address] = index
          true
        } else {
          onLog("Rejected INDEX \"$text\" (have ${items.size} items)")
          false
        }
      }
      NAME_UUID -> {
        if (!text.isNullOrEmpty()) {
          val name = String(truncateUtf8(text, MAX_PEER_NAME_BYTES), Charsets.UTF_8)
          peerNames[device.address] = name
          onLog("Receiver ${device.address} is \"$name\"")
        }
        true
      }
      else -> false
    }
  }

  private fun startAdvertising(
    leAdvertiser: BluetoothLeAdvertiser,
    advertisedName: String,
    onResult: (String?) -> Unit
  ) {
    val settings = AdvertiseSettings.Builder()
      .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
      .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
      .setConnectable(true)
      .setTimeout(0)
      .build()
    val data = AdvertiseData.Builder()
      .setIncludeDeviceName(false)
      .addServiceUuid(ParcelUuid(SERVICE_UUID))
      .build()
    val nameBytes = truncateUtf8(advertisedName, MAX_ADVERTISED_NAME_BYTES)
    val scanResponse = AdvertiseData.Builder()
      .setIncludeDeviceName(false)
      .addServiceData(ParcelUuid(SERVICE_UUID), nameBytes)
      .build()

    val callback = object : AdvertiseCallback() {
      override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
        onLog(
          "Advertising started: mode ${settingsInEffect.mode}, TX power ${settingsInEffect.txPowerLevel}, " +
            "connectable ${settingsInEffect.isConnectable}"
        )
        onResult(null)
      }

      override fun onStartFailure(errorCode: Int) {
        advertiseCallback = null
        stop()
        val error = when (errorCode) {
          AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "This device does not support Bluetooth LE advertising"
          AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many apps are advertising over Bluetooth"
          AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "Advertisement data is too large"
          else -> "Could not start Bluetooth advertising (error $errorCode)"
        }
        fail(onResult, "$error (code $errorCode)")
      }
    }
    advertiser = leAdvertiser
    advertiseCallback = callback
    onLog("Advertising service $SERVICE_UUID as \"${String(nameBytes, Charsets.UTF_8)}\" (${nameBytes.size} bytes)")
    leAdvertiser.startAdvertising(settings, data, scanResponse, callback)
  }

  fun stop() {
    if (gattServer != null) onLog("Server stopped")
    advertiseCallback?.let { cb -> runCatching { advertiser?.stopAdvertising(cb) } }
    advertiseCallback = null
    advertiser = null
    gattServer?.let { server -> runCatching { server.clearServices(); server.close() } }
    gattServer = null
    selectedIndex.clear()
    peerNames.clear()
    itemsRead.clear()
    preparedWrites.clear()
  }

  private fun fail(onResult: (String?) -> Unit, error: String) {
    onLog("Server could not start: $error")
    onResult(error)
  }

  private fun nameOf(uuid: UUID) = when (uuid) {
    INFO_UUID -> "INFO"
    INDEX_UUID -> "INDEX"
    ITEM_UUID -> "ITEM"
    NAME_UUID -> "NAME"
    else -> uuid.toString()
  }

  private fun truncateUtf8(text: String, maxBytes: Int): ByteArray {
    val out = StringBuilder()
    var size = 0
    var i = 0
    while (i < text.length) {
      val cp = text.codePointAt(i)
      val chunk = String(Character.toChars(cp)).toByteArray(Charsets.UTF_8)
      if (size + chunk.size > maxBytes) break
      out.appendCodePoint(cp)
      size += chunk.size
      i += Character.charCount(cp)
    }
    return out.toString().toByteArray(Charsets.UTF_8)
  }
}
