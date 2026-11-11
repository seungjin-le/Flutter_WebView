import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var foldStateStream: FoldStateStream?

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    guard let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "LuckieverseFoldState") else { return }
    let stream = FoldStateStream { [weak registrar] in registrar?.viewController?.view }
    let channel = FlutterEventChannel(
      name: "luckieverse/fold_state",
      binaryMessenger: engineBridge.applicationRegistrar.messenger()
    )
    channel.setStreamHandler(stream)
    registrar.addSceneDelegate(stream)
    foldStateStream = stream
  }
}
