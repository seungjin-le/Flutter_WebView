package com.example.luckieverse_tab_flutter

import android.app.Activity
import androidx.window.layout.FoldingFeature
import androidx.window.layout.SupportedPosture
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FoldStateTest {
    @Test
    fun noFeatureOrCapabilityDoesNotImplyFoldedOrNonFoldable() {
        assertEquals(
            mapOf("platform" to "android", "deviceType" to "unknown", "posture" to "unknown"),
            FoldState().update(null),
        )
    }

    @Test
    fun foldingFeatureMapsBothSupportedPostures() {
        val state = FoldState()
        assertEquals(
            mapOf("platform" to "android", "deviceType" to "android-fold", "posture" to "unfolded"),
            state.update(FoldingFeature.State.FLAT),
        )
        assertEquals("half-opened", state.update(FoldingFeature.State.HALF_OPENED)["posture"])
    }

    @Test
    fun tabletopCapabilityDistinguishesFoldableWithoutGuessingItsPosture() {
        assertEquals(
            mapOf("platform" to "android", "deviceType" to "android-fold", "posture" to "unknown"),
            FoldState().update(null, supportsTabletop = true),
        )
    }

    @Test
    fun losingFeatureRetainsCapabilityButClearsStalePosture() {
        val state = FoldState()
        state.update(FoldingFeature.State.HALF_OPENED)
        assertEquals(
            mapOf("platform" to "android", "deviceType" to "android-fold", "posture" to "unknown"),
            state.update(null),
        )
    }

    @Test
    fun capabilityPersistsAcrossMissingExtensionData() {
        val state = FoldState()
        state.update(null, supportsTabletop = true)
        assertEquals("android-fold", state.update(null, supportsTabletop = false)["deviceType"])
        assertEquals("unknown", FoldState().update(null)["deviceType"])
    }

    @Test
    fun unsupportedExtensionDoesNotReadCapabilityApi() {
        val tracker = tracker { error("Capability API must not be called") }
        assertFalse(supportsTabletop(tracker, 0))
        assertFalse(supportsTabletop(tracker, 5))
    }

    @Test
    fun capabilityApiFailureOrEmptyResultDoesNotClaimFoldable() {
        assertFalse(supportsTabletop(tracker { throw UnsupportedOperationException() }, 6))
        assertFalse(supportsTabletop(tracker { emptyList() }, 6))
        assertTrue(supportsTabletop(tracker { listOf(SupportedPosture.TABLETOP) }, 6))
    }

    private fun tracker(postures: () -> List<SupportedPosture>) = object : WindowInfoTracker {
        override fun windowLayoutInfo(activity: Activity): Flow<WindowLayoutInfo> = emptyFlow()
        override val supportedPostures: List<SupportedPosture>
            get() = postures()
    }
}
