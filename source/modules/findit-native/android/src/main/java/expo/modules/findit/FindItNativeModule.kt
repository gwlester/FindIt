package expo.modules.findit

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MissingPermissionException(permission: String) :
  CodedException("ERR_MISSING_PERMISSION", "Permission $permission has not been granted", null)

class FindItNativeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var gnss: GnssMonitor? = null
  private var share: ShareServer? = null

  override fun definition() = ModuleDefinition {
    Name("FindItNative")

    Events("onGnssStatus", "onSharePeer")

    AsyncFunction("startGnssStatus") {
      requirePermission(Manifest.permission.ACCESS_FINE_LOCATION)
      val monitor = gnss ?: GnssMonitor(context) { sendEvent("onGnssStatus", it) }.also { gnss = it }
      monitor.start()
    }

    AsyncFunction("stopGnssStatus") {
      gnss?.stop()
    }

    AsyncFunction("startSharing") { advertisedName: String, infoJson: String, items: List<String>, promise: Promise ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        requirePermission(Manifest.permission.BLUETOOTH_ADVERTISE)
        requirePermission(Manifest.permission.BLUETOOTH_CONNECT)
      }
      val server = share ?: ShareServer(context) { sendEvent("onSharePeer", it) }.also { share = it }
      server.start(advertisedName, infoJson, items) { error ->
        if (error == null) promise.resolve(null) else promise.reject("ERR_SHARE_FAILED", error, null)
      }
    }

    AsyncFunction("stopSharing") {
      share?.stop()
    }

    Function("isSharing") {
      share?.isRunning == true
    }

    OnDestroy {
      gnss?.stop()
      share?.stop()
    }
  }

  private fun requirePermission(permission: String) {
    if (context.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
      throw MissingPermissionException(permission)
    }
  }
}
