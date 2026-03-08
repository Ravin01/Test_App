#import <React/RCTBridgeModule.h>
#import <AVFoundation/AVFoundation.h>

@interface RCT_EXTERN_MODULE(AudioSessionManager, NSObject)

RCT_EXTERN_METHOD(setCategory:(NSString *)category 
                  options:(NSString *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
