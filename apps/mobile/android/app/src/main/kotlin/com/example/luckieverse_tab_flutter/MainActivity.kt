package com.example.luckieverse_tab_flutter

import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel

class MainActivity : FlutterActivity() {
    private var foldState: FoldStateStream? = null
    private var foldChannel: EventChannel? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        foldState = FoldStateStream(this)
        foldChannel = EventChannel(flutterEngine.dartExecutor.binaryMessenger, "luckieverse/fold_state")
        foldChannel?.setStreamHandler(foldState)
    }

    override fun onResume() {
        super.onResume()
        foldState?.resume()
    }

    override fun onPostResume() {
        super.onPostResume()
        // Flutter restores its system UI in onPostResume.
        WindowCompat.getInsetsController(window, window.decorView).apply {
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.statusBars())
        }
    }

    override fun onPause() {
        foldState?.pause()
        super.onPause()
    }

    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        foldState?.onCancel(null)
        foldChannel?.setStreamHandler(null)
        foldState = null
        foldChannel = null
        super.cleanUpFlutterEngine(flutterEngine)
    }
}
