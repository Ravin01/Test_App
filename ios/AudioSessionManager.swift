import Foundation
import AVFoundation

@objc(AudioSessionManager)
class AudioSessionManager: NSObject {
  
  @objc
  func setCategory(_ category: String, options: String, 
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    let audioSession = AVAudioSession.sharedInstance()
    
    var categoryType: AVAudioSession.Category = .playback
    var categoryOptions: AVAudioSession.CategoryOptions = []
    
    switch options {
    case "mixWithOthers":
      categoryOptions = .mixWithOthers
    case "duckOthers":
      categoryOptions = .duckOthers
    default:
      break
    }
    
    do {
      try audioSession.setCategory(categoryType, mode: .default, options: categoryOptions)
      try audioSession.setActive(true)
      NSLog("[AudioSessionManager] Audio session configured: category=\(category), options=\(options)")
      resolve(true)
    } catch {
      NSLog("[AudioSessionManager] Failed to set audio category: \(error.localizedDescription)")
      reject("AUDIO_SESSION_ERROR", "Failed to set audio category", error)
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
