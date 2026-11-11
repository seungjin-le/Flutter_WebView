package com.example.luckieverse_tab_flutter

import androidx.window.layout.FoldingFeature
import androidx.window.layout.SupportedPosture
import androidx.window.layout.WindowInfoTracker

internal fun supportsTabletop(tracker: WindowInfoTracker, extensionVersion: Int): Boolean =
    extensionVersion >= 6 && try {
        tracker.supportedPostures.contains(SupportedPosture.TABLETOP)
    } catch (_: RuntimeException) {
        false
    }

internal class FoldState {
    private var foldable = false

    fun update(featureState: FoldingFeature.State?, supportsTabletop: Boolean = false): Map<String, String> {
        foldable = foldable || featureState != null || supportsTabletop
        return mapOf(
            "platform" to "android",
            "deviceType" to if (foldable) "android-fold" else "unknown",
            "posture" to when (featureState) {
                FoldingFeature.State.FLAT -> "unfolded"
                FoldingFeature.State.HALF_OPENED -> "half-opened"
                else -> "unknown"
            },
        )
    }
}
