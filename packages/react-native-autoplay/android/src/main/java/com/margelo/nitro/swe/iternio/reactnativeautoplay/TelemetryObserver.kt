package com.margelo.nitro.swe.iternio.reactnativeautoplay

import android.os.Handler
import android.os.HandlerThread

abstract class TelemetryObserver {
    abstract fun startTelemetryObserver(): Boolean
    abstract fun stopTelemetryObserver()

    var telemetryCallbacks: MutableList<(Telemetry?) -> Unit> = ArrayList()
    val telemetryHolder = AndroidAutoTelemetryHolder()
    var isObserverRunning = false
    val handler: Handler

    init {
        val thread = HandlerThread("AndroidTelemetryThread")
        thread.start()
        handler = Handler(thread.looper)
    }

    fun addListener(callback: (Telemetry?) -> Unit): () -> Unit {
        telemetryCallbacks.add(callback)

        // start is called every time a new listener is registered, so the single shot values are still requested and returned immediately
        val isInitialStart = startTelemetryObserver()

        if (isInitialStart) {
            handler.post(emitter)
        }

        return {
            telemetryCallbacks.remove(callback)

            if (telemetryCallbacks.isEmpty()) {
                stopTelemetryObserver()
                handler.removeCallbacks(emitter)
            }
        }
    }

    private val emitter = object : Runnable {
        override fun run() {
            val tlm = telemetryHolder.toTelemetry()

            if (tlm != null) {
                telemetryCallbacks.forEach { callback ->
                    callback(tlm)
                }
            }

            handler.postDelayed(this, BuildConfig.TELEMETRY_UPDATE_INTERVAL)
        }
    }
}
