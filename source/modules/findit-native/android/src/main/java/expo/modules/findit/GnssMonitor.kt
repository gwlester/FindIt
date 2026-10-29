package expo.modules.findit

import android.annotation.SuppressLint
import android.content.Context
import android.location.GnssMeasurementRequest
import android.location.GnssMeasurementsEvent
import android.location.GnssStatus
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.Looper

/**
 * Reports how many GNSS satellites are known, actually being received (signal > 0)
 * and used in the current position fix.
 *
 * GnssStatus only reports while the GPS engine is running, so this also requests
 * (and ignores) GPS provider location updates for as long as it is observing.
 *
 * With full tracking (Android 12+), it also registers for raw GNSS measurements with
 * GnssMeasurementRequest.setFullTracking(true). That stops the chipset from duty cycling,
 * so it keeps tracking every satellite continuously, which can keep more satellites in
 * the fix at the cost of battery.
 */
class GnssMonitor(
  private val context: Context,
  private val onStatus: (Map<String, Any>) -> Unit
) {
  private val locationManager =
    context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
  private val handler = Handler(Looper.getMainLooper())
  private var running = false

  private val keepGpsOn = LocationListener { }
  private var fullTrackingCallback: GnssMeasurementsEvent.Callback? = null

  private val callback = object : GnssStatus.Callback() {
    override fun onSatelliteStatusChanged(status: GnssStatus) {
      var used = 0
      var inView = 0
      val usedByConstellation = mutableMapOf<String, Int>()
      for (i in 0 until status.satelliteCount) {
        if (status.getCn0DbHz(i) > 0f) inView++
        if (status.usedInFix(i)) {
          used++
          val name = constellationName(status.getConstellationType(i))
          usedByConstellation[name] = (usedByConstellation[name] ?: 0) + 1
        }
      }
      onStatus(
        mapOf(
          "known" to status.satelliteCount,
          "inView" to inView,
          "used" to used,
          "usedByConstellation" to usedByConstellation
        )
      )
    }

    override fun onStopped() {
      onStatus(mapOf("known" to 0, "inView" to 0, "used" to 0, "usedByConstellation" to emptyMap<String, Int>()))
    }
  }

  /**
   * Starts reporting (or changes full tracking on an already-started monitor).
   * Returns whether full tracking was requested, i.e. asked for and Android 12+.
   * Callers must hold ACCESS_FINE_LOCATION; the module checks before calling.
   */
  @SuppressLint("MissingPermission")
  fun start(fullTracking: Boolean): Boolean {
    val useFullTracking = fullTracking && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
    handler.post {
      if (!running) {
        locationManager.registerGnssStatusCallback(callback, handler)
        if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
          locationManager.requestLocationUpdates(
            LocationManager.GPS_PROVIDER, 1000L, 0f, keepGpsOn, Looper.getMainLooper()
          )
        }
        running = true
      }
      if (useFullTracking) startFullTracking() else stopFullTracking()
    }
    return useFullTracking
  }

  fun stop() {
    handler.post {
      if (!running) return@post
      stopFullTracking()
      locationManager.unregisterGnssStatusCallback(callback)
      locationManager.removeUpdates(keepGpsOn)
      running = false
    }
  }

  @SuppressLint("MissingPermission")
  private fun startFullTracking() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || fullTrackingCallback != null) return
    // The measurements themselves aren't needed; registering is what enables full tracking.
    val measurements = object : GnssMeasurementsEvent.Callback() {}
    val request = GnssMeasurementRequest.Builder().setFullTracking(true).build()
    if (locationManager.registerGnssMeasurementsCallback(request, context.mainExecutor, measurements)) {
      fullTrackingCallback = measurements
    }
  }

  private fun stopFullTracking() {
    fullTrackingCallback?.let { locationManager.unregisterGnssMeasurementsCallback(it) }
    fullTrackingCallback = null
  }

  private fun constellationName(type: Int): String = when (type) {
    GnssStatus.CONSTELLATION_GPS -> "GPS"
    GnssStatus.CONSTELLATION_GLONASS -> "GLONASS"
    GnssStatus.CONSTELLATION_GALILEO -> "Galileo"
    GnssStatus.CONSTELLATION_BEIDOU -> "BeiDou"
    GnssStatus.CONSTELLATION_QZSS -> "QZSS"
    GnssStatus.CONSTELLATION_SBAS -> "SBAS"
    GnssStatus.CONSTELLATION_IRNSS -> "NavIC"
    else -> "Other"
  }
}
