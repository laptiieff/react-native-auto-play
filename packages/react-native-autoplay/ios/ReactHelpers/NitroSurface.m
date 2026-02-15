//
//  NitroSurface.m
//  Pods
//
//  Created by Manuel Auer on 28.11.25.
//

#import "NitroSurface.h"
#import <React/RCTInvalidating.h>
#import <React/RCTRootView.h>
#import <React/RCTSurface.h>
#import <React/RCTSurfaceHostingProxyRootView.h>

@implementation NitroSurface

+ (void)stop:(nullable UIView *)view {
    if (view == nil) {
        NSLog(@"[AutoPlay] View is nil, ignoring");
        return;
    }

    if ([view isKindOfClass:[RCTSurfaceHostingView class]]) {
        RCTSurfaceHostingProxyRootView *rootView =
            (RCTSurfaceHostingProxyRootView *)view;
        
        if (rootView == nil) {
            NSLog(@"[AutoPlay] rootView == nil, cannot stop");
            return;
        }
        
        [rootView.surface stop];
    }

    NSLog(@"[AutoPlay] View is not recognized type, ignoring");
}

@end
