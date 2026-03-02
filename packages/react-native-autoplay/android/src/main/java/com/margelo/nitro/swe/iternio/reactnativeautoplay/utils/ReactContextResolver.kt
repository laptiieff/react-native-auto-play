package com.margelo.nitro.swe.iternio.reactnativeautoplay.utils

import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.ReactContext
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

object ReactContextResolver {
    suspend fun getReactContext(application: ReactApplication): ReactContext {
        val host =
            application.reactHost ?: throw IllegalArgumentException("application host null")

        return suspendCancellableCoroutine { continuation ->
            host.currentReactContext?.let {
                continuation.resume(it)
                return@suspendCancellableCoroutine
            }

            val listener = object : ReactInstanceEventListener {
                override fun onReactContextInitialized(context: ReactContext) {
                    host.removeReactInstanceEventListener(this)
                    continuation.resume(context)
                }
            }
            host.addReactInstanceEventListener(listener)

            continuation.invokeOnCancellation {
                host.removeReactInstanceEventListener(listener)
            }

            host.start()
        }

    }
}