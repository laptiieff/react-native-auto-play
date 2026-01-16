package com.margelo.nitro.swe.iternio.reactnativeautoplay

import com.facebook.react.bridge.UiThreadUtil
import com.margelo.nitro.core.Promise
import com.margelo.nitro.swe.iternio.reactnativeautoplay.template.AutomotivePermissionRequestTemplate
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

class HybridAndroidAutoTelemetry : HybridAndroidAutoTelemetrySpec() {
    override fun registerTelemetryListener(callback: (tlm: Telemetry?) -> Unit): Promise<() -> Unit> {
        return Promise.async {
            AndroidTelemetryObserver.addListener(callback)
        }
    }

    override fun requestAutomotivePermissions(
        permissions: Array<String>,
        message: String,
        grantButtonText: String,
        cancelButtonText: String?
    ): Promise<PermissionRequestResult> {
        return Promise.async {
            val context = AndroidAutoSession.getRootContext()
                ?: throw IllegalArgumentException("requestAutomotivePermissions failed, carContext not found")
            val screenManager = AndroidAutoScreen.getScreenManager()
                ?: throw IllegalArgumentException("requestAutomotivePermissions failed, screenManager not found")

            suspendCancellableCoroutine { continuation ->
                UiThreadUtil.runOnUiThread {
                    val screen = AutomotivePermissionRequestTemplate(
                        context, permissions, message, grantButtonText, cancelButtonText
                    )

                    screenManager.pushForResult(screen) { result ->
                        continuation.resume(
                            result as? PermissionRequestResult ?: PermissionRequestResult(
                                arrayOf(), permissions
                            )
                        )
                    }
                }
            }
        }
    }
}