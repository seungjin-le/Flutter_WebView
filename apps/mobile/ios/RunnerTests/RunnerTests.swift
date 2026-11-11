import Flutter
import Testing
import UIKit
@testable import Runner

struct RunnerTests {
  @Test func unavailableHingeDoesNotInventADeviceOrPosture() {
    var state = FoldStateSnapshot()
    state.observe(nil)
    #expect(state.payload == ["platform": "ios", "deviceType": "unknown", "posture": "unknown"])
  }

  @Test func observedCapabilitySurvivesUnavailableHinge() {
    var state = FoldStateSnapshot()
    state.observe(.halfOpened)
    #expect(state.payload["deviceType"] == "ios-duo")
    #expect(state.payload["posture"] == "half-opened")
    state.observe(nil)
    #expect(state.payload["deviceType"] == "ios-duo")
    #expect(state.payload["posture"] == "unknown")
  }

  @Test func anUnknownStatusStillConfirmsTheHingeExists() {
    var state = FoldStateSnapshot()
    state.observe(.unknown)
    #expect(state.payload == ["platform": "ios", "deviceType": "ios-duo", "posture": "unknown"])
  }

  @Test @MainActor func streamEmitsInitialStateAndStopsAfterCancel() {
    let stream = FoldStateStream(viewProvider: { nil })
    var events = [[String: String]]()
    #expect(stream.onListen(withArguments: nil) { event in
      if let state = event as? [String: String] { events.append(state) }
    } == nil)
    #expect(events == [["platform": "ios", "deviceType": "unknown", "posture": "unknown"]])
    stream.receive(.unfolded)
    #expect(events.last?["deviceType"] == "ios-duo")
    #expect(events.last?["posture"] == "unfolded")
    let count = events.count
    stream.receive(.unfolded)
    #expect(events.count == count)
    #expect(stream.onCancel(withArguments: nil) == nil)
    stream.receive(.folded)
    #expect(events.count == count)
    #expect(stream.onListen(withArguments: nil) { event in
      if let state = event as? [String: String] { events.append(state) }
    } == nil)
    #expect(events.last == ["platform": "ios", "deviceType": "ios-duo", "posture": "unknown"])
    _ = stream.onCancel(withArguments: nil)
  }

  #if HAS_UI_HINGE_API
  @Test @available(iOS 27.1, *)
  func mapsEveryPublicHingeStatus() {
    #expect(FoldPosture(hingeStatus: .closed) == .folded)
    #expect(FoldPosture(hingeStatus: .partiallyOpen) == .halfOpened)
    #expect(FoldPosture(hingeStatus: .fullyOpen) == .unfolded)
    #expect(FoldPosture(hingeStatus: .unknown) == .unknown)
  }
  #endif
}
