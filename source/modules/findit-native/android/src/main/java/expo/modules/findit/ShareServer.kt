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
import android.os.ParcelUuid
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * BLE GATT server that lets nearby FindIt users download our shared locations.
 *
 * Protocol (all values UTF-8):
 *  - INFO  (read):  JSON `{"v":1,"name":"...","count":N}`
 *  - INDEX (write): decimal index of the item the connected central wants next
 *  - ITEM  (read):  JSON of the item selected by that central's last INDEX write
 *
 * Each value stays under the 512 byte ATT limit, and reads honour the offset so
 * long reads work with any MTU. The INDEX selection is tracked per central.
 */
@SuppressLint("MissingPermission") // The module checks Bluetooth permissions before use.
class ShareServer(
  private val context: Context,
  private val onPeer: (Map<String, Any>) -> Unit
) {
  companion object {
    val SERVICE_UUID: UUID = UUID.fromString("5c0a7f10-2b7e-4d1a-9a37-f1d17000c0de")
    val INFO_UUID: UUID = UUID.fromString("5c0a7f11-2b7e-4d1a-9a37-f1d17000c0de")
    val INDEX_UUID: UUID = UUID.fromString("5c0a7f12-2b7e-4d1a-9a37-f1d17000c0de")
    val ITEM_UUID: UUID = UUID.fromString("5c0a7f13-2b7e-4d1a-9a37-f1d17000c0de")

    // 31 byte scan response minus length, type and 128-bit UUID.
    private const val MAX_ADVERTISED_NAME_BYTES = 13
    private const val MAX_VALUE_BYTES = 512
  }

  private val bluetoothManager =
    context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager

  private var gattServer: BluetoothGattServer? = null
  private var advertiser: BluetoothLeAdvertiser? = null
  private var advertiseCallback: AdvertiseCallback? = null

  @Volatile private var info: ByteArray = ByteArray(0)
  @Volatile private var items: List<ByteArray> = emptyList()
  private val selectedIndex = ConcurrentHashMap<String, Int>()

  val isRunning: Boolean
    get() = gattServer != null

  fun start(advertisedName: String, infoJson: String, itemJson: List<String>, onResult: (String?) -> Unit) {
    stop()

    val adapter = bluetoothManager.adapter
    if (adapter == null) return onResult("This device has no Bluetooth adapter")
    if (!adapter.isEnabled) return onResult("Bluetooth is turned off")
    val leAdvertiser = adapter.bluetoothLeAdvertiser
      ?: return onResult("This device does not support Bluetooth LE advertising")

    val encodedItems = itemJson.map { it.toByteArray(Charsets.UTF_8) }
    if (encodedItems.any { it.size > MAX_VALUE_BYTES }) {
      return onResult("A shared location is too large to send")
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
    }

    val callback = object : BluetoothGattServerCallback() {
      override fun onServiceAdded(status: Int, added: BluetoothGattService) {
        if (status != BluetoothGatt.GATT_SUCCESS) {
          stop()
          onResult("Could not start the sharing service (status $status)")
          return
        }
        startAdvertising(leAdvertiser, advertisedName, onResult)
      }

      override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
        when (newState) {
          BluetoothProfile.STATE_CONNECTED ->
            onPeer(mapOf("address" to device.address, "state" to "connected"))
          BluetoothProfile.STATE_DISCONNECTED -> {
            selectedIndex.remove(device.address)
            onPeer(mapOf("address" to device.address, "state" to "disconnected"))
          }
        }
      }

      override fun onCharacteristicReadRequest(
        device: BluetoothDevice,
        requestId: Int,
        offset: Int,
        characteristic: BluetoothGattCharacteristic
      ) {
        val value = when (characteristic.uuid) {
          INFO_UUID -> info
          ITEM_UUID -> items.getOrNull(selectedIndex[device.address] ?: 0)
          else -> null
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
        val index = value?.toString(Charsets.UTF_8)?.trim()?.toIntOrNull()
        val ok = characteristic.uuid == INDEX_UUID && index != null && index in items.indices
        if (ok) selectedIndex[device.address] = index!!
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
    }

    val server = bluetoothManager.openGattServer(context, callback)
      ?: return onResult("Could not open a Bluetooth GATT server")
    gattServer = server
    if (!server.addService(service)) {
      stop()
      onResult("Could not register the sharing service")
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
    val scanResponse = AdvertiseData.Builder()
      .setIncludeDeviceName(false)
      .addServiceData(ParcelUuid(SERVICE_UUID), truncateUtf8(advertisedName, MAX_ADVERTISED_NAME_BYTES))
      .build()

    val callback = object : AdvertiseCallback() {
      override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
        onResult(null)
      }

      override fun onStartFailure(errorCode: Int) {
        advertiseCallback = null
        stop()
        onResult(
          when (errorCode) {
            AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "This device does not support Bluetooth LE advertising"
            AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many apps are advertising over Bluetooth"
            AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "Advertisement data is too large"
            else -> "Could not start Bluetooth advertising (error $errorCode)"
          }
        )
      }
    }
    advertiser = leAdvertiser
    advertiseCallback = callback
    leAdvertiser.startAdvertising(settings, data, scanResponse, callback)
  }

  fun stop() {
    advertiseCallback?.let { cb -> runCatching { advertiser?.stopAdvertising(cb) } }
    advertiseCallback = null
    advertiser = null
    gattServer?.let { server -> runCatching { server.clearServices(); server.close() } }
    gattServer = null
    selectedIndex.clear()
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
