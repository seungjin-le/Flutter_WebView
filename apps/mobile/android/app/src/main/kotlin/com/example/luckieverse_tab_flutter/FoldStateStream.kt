package com.example.luckieverse_tab_flutter

import android.app.Activity
import androidx.core.util.Consumer
import androidx.window.WindowSdkExtensions
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import io.flutter.plugin.common.EventChannel
import java.util.concurrent.Executor

internal class FoldStateStream(private val activity: Activity) : EventChannel.StreamHandler {
    private val state = FoldState()
    private var sink: EventChannel.EventSink? = null
    private var adapter: WindowInfoTrackerCallbackAdapter? = null
    private var callback: Consumer<WindowLayoutInfo>? = null
    private var resumed = false
    private var generation = 0

    override fun onListen(arguments: Any?, events: EventChannel.EventSink) {
        stop()
        sink = events
        events.success(state.update(null))
        start()
    }

    override fun onCancel(arguments: Any?) {
        sink = null
        stop()
    }

    fun resume() {
        resumed = true
        start()
    }

    fun pause() {
        resumed = false
        stop()
        sink?.success(state.update(null))
    }

    private fun start() {
        if (!resumed || sink == null || callback != null) return
        try {
            val tracker = WindowInfoTracker.getOrCreate(activity)
            val tabletop = supportsTabletop(tracker, WindowSdkExtensions.getInstance().extensionVersion)
            sink?.success(state.update(null, tabletop))
            val observer = WindowInfoTrackerCallbackAdapter(tracker)
            adapter = observer
            val currentGeneration = generation
            val listener = Consumer<WindowLayoutInfo> { info ->
                if (currentGeneration == generation) {
                    val feature = info.displayFeatures.filterIsInstance<FoldingFeature>().firstOrNull()
                    sink?.success(state.update(feature?.state))
                }
            }
            callback = listener
            observer.addWindowLayoutInfoListener(activity, Executor(activity::runOnUiThread), listener)
        } catch (_: RuntimeException) {
            stop()
            sink?.success(state.update(null))
        }
    }

    private fun stop() {
        generation++
        val listener = callback
        callback = null
        if (listener != null) adapter?.removeWindowLayoutInfoListener(listener)
        adapter = null
    }
}
