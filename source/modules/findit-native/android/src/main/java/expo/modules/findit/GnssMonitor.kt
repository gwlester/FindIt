package expo.modules.findit

import android.annotation.SuppressLint
import android.content.Context
import android.location.GnssStatus
import android.location.LocationListener
import android.location.LocationManager
import android.os.Handler
import android.os.Looper

/**
 * Reports how many GNSS satellites are known, actually being received (signal > 0)
 * and used in the current position fix.
 *
 * GnssStatus only reports while the GPS engine is running, so this also requests
 * (and ignores) GPS provider location updates for as long as it is observing.
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

  // Callers must hold ACCESS_FINE_LOCATION; the module checks before calling.
  @SuppressLint("MissingPermission")
  fun start() {
    if (running) return
    handler.post {
      if (running) return@post
      locationManager.registerGnssStatusCallback(callback, handler)
      if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
        locationManager.requestLocationUpdates(
          LocationManager.GPS_PROVIDER, 1000L, 0f, keepGpsOn, Looper.getMainLooper()
        )
      }
      running = true
    }
  }

  fun stop() {
    handler.post {
      if (!running) return@post
      locationManager.unregisterGnssStatusCallback(callback)
      locationManager.removeUpdates(keepGpsOn)
      running = false
    }
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
