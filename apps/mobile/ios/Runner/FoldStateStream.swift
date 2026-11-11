import Flutter
import UIKit

enum FoldPosture: String {
  case folded
  case halfOpened = "half-opened"
  case unfolded
  case unknown

  #if HAS_UI_HINGE_API
  @available(iOS 27.1, *)
  init(hingeStatus: UIHinge.Status) {
    switch hingeStatus {
    case .closed: self = .folded
    case .partiallyOpen: self = .halfOpened
    case .fullyOpen: self = .unfolded
    case .unknown: self = .unknown
    @unknown default: self = .unknown
    }
  }
  #endif
}

struct FoldStateSnapshot {
  private var hasObservedHinge = false
  private var posture = FoldPosture.unknown

  var payload: [String: String] {
    ["platform": "ios", "deviceType": hasObservedHinge ? "ios-duo" : "unknown",
     "posture": posture.rawValue]
  }

  mutating func observe(_ posture: FoldPosture?) {
    if posture != nil { hasObservedHinge = true }
    self.posture = posture ?? .unknown
  }
}

@MainActor
final class FoldStateStream: NSObject, @preconcurrency FlutterStreamHandler,
  @preconcurrency FlutterSceneLifeCycleDelegate {
  private let viewProvider: () -> UIView?
  private var sink: FlutterEventSink?
  private var state = FoldStateSnapshot()
  private weak var observedView: UIView?
  private var interaction: UIInteraction?

  init(viewProvider: @escaping () -> UIView?) {
    self.viewProvider = viewProvider
  }

  func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
    detach()
    state.observe(nil)
    sink = events
    events(state.payload)
    attach()
    return nil
  }

  func onCancel(withArguments arguments: Any?) -> FlutterError? {
    sink = nil
    detach()
    state.observe(nil)
    return nil
  }

  func receive(_ posture: FoldPosture?) {
    guard let sink else { return }
    let previous = state.payload
    state.observe(posture)
    if state.payload != previous { sink(state.payload) }
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    attach()
  }

  func sceneWillResignActive(_ scene: UIScene) {
    guard observedView?.window?.windowScene === scene else { return }
    detach()
    receive(nil)
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    guard observedView?.window?.windowScene === scene else { return }
    detach()
    receive(nil)
  }

  private func attach() {
    guard sink != nil, let view = viewProvider() else { return }
    if observedView === view, interaction != nil { return }
    detach()
    #if HAS_UI_HINGE_API
    if #available(iOS 27.1, *) {
      let hingeInteraction = UIHingeInteraction { [weak self] interaction, update in
        guard let self, self.interaction === interaction else { return }
        self.receive(update.hinge.map { FoldPosture(hingeStatus: $0.status) })
      }
      observedView = view
      interaction = hingeInteraction
      view.addInteraction(hingeInteraction)
    }
    #endif
  }

  private func detach() {
    let previous = interaction
    interaction = nil
    if let previous { observedView?.removeInteraction(previous) }
    observedView = nil
  }
}
