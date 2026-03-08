import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import Video, {SelectedVideoTrackType} from 'react-native-video';
import useVideoTracker from './hooks/useVideoTracker';
import useCallDetection from './hooks/useCallDetection';
import {AWS_CDN_URL} from '../../Utils/aws';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
const {width, height} = Dimensions.get('window');

interface VideoData {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  hlsMasterPlaylistUrl?: string;
  masterPlaylistKey?: string;
  thumbnailBlobName: string;
  likes: number;
  views: number;
  duration: number;
  author: {
    username: string;
    avatar: string;
  };
  hashtags: string[];
}

interface OptimizedVideoPlayerProps {
  video: VideoData;
  isActive: boolean;
  isMuted?: boolean;
  setIsMuted?: any;
  shouldPreload?: boolean;
  isFirstVideo?: boolean;
}

const OptimizedVideoPlayer: React.FC<OptimizedVideoPlayerProps> = React.memo(({
  video,
  isActive,
  isMuted,
  shouldPreload = false,
}) => {
  const [paused, setPaused] = useState(!isActive);
  const [videoReady, setVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  
  const videoRef = useRef<any>(null);
  const previousVideoUrl = useRef<string>('');
  const mountedRef = useRef(true);
  const preloadCheckedRef = useRef(false);
  
  // Animated value for smooth thumbnail fade
  const thumbnailOpacity = useRef(new Animated.Value(1)).current;
  
  // Call detection hook - only mutes audio during calls, doesn't pause video
  const { isInCall, shouldMuteForCall } = useCallDetection();
  const previousCallState = useRef(false);
  
  const {
    startTracking,
    pauseTracking,
    sendTrackingData,
    trackProgress,
    setVideoDuration,
  } = useVideoTracker(video?._id);

  // ✅ Optimized video URL with intelligent fallback
  const videoUrl = useMemo(() => {
    if (hasError && video.videoUrl) {
      return `${AWS_CDN_URL}${video.videoUrl}`;
    }
    if (video.hlsMasterPlaylistUrl) {
      return video.hlsMasterPlaylistUrl;
    }
    if (video.masterPlaylistKey) {
      return `${AWS_CDN_URL}${video.masterPlaylistKey}`;
    }
    if (video.videoUrl) {
      return `${AWS_CDN_URL}${video.videoUrl}`;
    }
    return '';
  }, [video.hlsMasterPlaylistUrl, video.masterPlaylistKey, video.videoUrl, hasError]);

  const thumbnailUrl = useMemo(() => {
    return `${AWS_CDN_URL}${video.thumbnailBlobName}`;
  }, [video.thumbnailBlobName]);

  // Prefetch thumbnail image on mount for instant display
  useEffect(() => {
    if (thumbnailUrl) {
      Image.prefetch(thumbnailUrl).catch(() => {});
    }
  }, [thumbnailUrl]);

  useEffect(() => {
    if (videoUrl !== previousVideoUrl.current) {
      if (mountedRef.current) {
        setVideoReady(false);
        setHasError(false);
        setIsBuffering(false);
        previousVideoUrl.current = videoUrl;
        preloadCheckedRef.current = false;
      }
    }
  }, [videoUrl]);


  // Reset thumbnail opacity when video changes
  useEffect(() => {
    thumbnailOpacity.setValue(1);
  }, [video._id, thumbnailOpacity]);

  // Animate thumbnail fade out when video is ready
  useEffect(() => {
    if (videoReady && isActive) {
      Animated.timing(thumbnailOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (!videoReady) {
      thumbnailOpacity.setValue(1);
    }
  }, [videoReady, isActive, thumbnailOpacity]);

  useEffect(() => {
    if (!isActive) {
      setPaused(true);
      setUserPaused(false);
      setIsBuffering(false);
      pauseTracking();
      if (videoRef.current) {
        try {
          videoRef.current.seek(0);
        } catch (error) {
          // Ignore
        }
      }
    } else {
      if (mountedRef.current && !userPaused) {
        setPaused(false);
        if (videoReady) {
          startTracking();
        }
      }
    }
  }, [isActive, videoReady, userPaused, startTracking, pauseTracking]);

  useEffect(() => {
    if (isActive && !paused && videoReady) {
      startTracking();
    }
  }, [isActive, paused, videoReady, startTracking]);

  // Handle call state changes - just log for debugging, don't interrupt playback
  useEffect(() => {
    if (isInCall !== previousCallState.current) {
      previousCallState.current = isInCall;
      console.log(`[OptimizedVideoPlayer] Call state changed to ${isInCall ? 'IN CALL' : 'CALL ENDED'} - video continues with muted audio`);
      // Video continues playing, only audio is muted via shouldMuteForCall
    }
  }, [isInCall]);

  // Cleanup on unmount - CRITICAL for preventing memory leaks
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear video ref to release native resources
      if (videoRef.current) {
        videoRef.current = null;
      }
      // Stop any running animations
      thumbnailOpacity.stopAnimation();
      // Send tracking data
      sendTrackingData();
    };
  }, [sendTrackingData, thumbnailOpacity]);

  // Throttled progress handler to reduce JS bridge calls
  const lastProgressUpdate = useRef(0);
  const handleProgress = useCallback(
    (progressData) => {
      if (!mountedRef.current || !isActive) return;
      
      // Throttle updates to every 1 second to reduce load
      const now = Date.now();
      if (now - lastProgressUpdate.current < 1000) return;
      lastProgressUpdate.current = now;
      
      try {
        const newCurrentTime = progressData.currentTime;
        const newDuration = progressData.seekableDuration || progressData.playableDuration;
        trackProgress(newCurrentTime);
        if (newDuration > 0 && newCurrentTime >= newDuration * 0.95) {
          sendTrackingData();
        }
      } catch (error) {
        // Ignore errors during unmount
      }
    },
    [trackProgress, sendTrackingData, isActive],
  );

  const handleLoad = useCallback((data) => {
    if (!mountedRef.current) return;
    try {
      const duration = data.duration || data.seekableDuration || 0;
      if (duration > 0 && mountedRef.current) {
        setVideoDuration(duration);
      } else if (video.duration && video.duration > 0 && mountedRef.current) {
        setVideoDuration(video.duration);
      }
      if (mountedRef.current) {
        setVideoReady(true);
        setIsBuffering(false);
      }
    } catch (error) {
      // Ignore errors during unmount
    }
  }, [setVideoDuration, video.duration]);

  const handleReadyForDisplay = useCallback(() => {
    if (!mountedRef.current) return;
    try {
      if (mountedRef.current) {
        setVideoReady(true);
        setIsBuffering(false);
      }
    } catch (error) {
      // Ignore errors during unmount
    }
  }, []);

  const handleError = useCallback((error) => {
    console.log(error.error,"Error")
    if (!mountedRef.current) return;
    try {
      const errorCode = error?.error?.errorCode || error?.error?.code || 'unknown';
      const criticalErrors = ['22005', '22004', '22003', '-1003', '-1100'];
      const isCriticalError = criticalErrors.some(code => errorCode.toString().includes(code));
      if (isCriticalError && !hasError && mountedRef.current) {
        if ((video.hlsMasterPlaylistUrl || video.masterPlaylistKey) && video.videoUrl) {
          console.log(`[OptimizedVideoPlayer] Trying fallback to original video`);
          setHasError(true);
          setVideoReady(false);
          setIsBuffering(false);
        }
      }
    } catch (err) {
      console.log(err,"Error in error handler")
      // Ignore errors during unmount
    }
  }, [video.hlsMasterPlaylistUrl, video.masterPlaylistKey, video.videoUrl, hasError]);

  const togglePlayPause = useCallback(() => {
    if (!isActive || !mountedRef.current) return;
    setPaused(prev => {
      if (!mountedRef.current) return prev;
      const newPausedState = !prev;
      setUserPaused(newPausedState);
      return newPausedState;
    });
  }, [isActive]);

  const handleBuffer = useCallback((bufferData: any) => {
    if (!mountedRef.current) return;
    try {
      if (mountedRef.current) {
        setIsBuffering(bufferData.isBuffering);
      }
    } catch (error) {
      // Ignore errors during unmount
    }
  }, []);

  // Only render video if active or should preload (within range)
  // This prevents memory issues from too many video components
  const shouldRenderVideo = isActive || shouldPreload;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={togglePlayPause}>
        
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {opacity: thumbnailOpacity}]}>
          <Image
            source={{uri: thumbnailUrl}}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        </Animated.View>

        {shouldRenderVideo && videoUrl && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Video
              ref={videoRef}
              key={video._id}
              source={{
                uri: videoUrl,
                type: hasError ? undefined : 'm3u8',
                headers: {
                  'Cache-Control': 'max-age=31536000',
                },
              }}
              style={[
                styles.video,
                {opacity: videoReady ? 1 : 0},
              ]}
              resizeMode="cover"
              paused={paused || !isActive}
              repeat={isActive}
              playWhenInactive={true}
              playInBackground={false}
              onLoad={handleLoad}
              onProgress={handleProgress}
              onReadyForDisplay={handleReadyForDisplay}
              onError={handleError}
              onBuffer={handleBuffer}
              mixWithOthers={'mix' as const}
              ignoreSilentSwitch={'ignore' as const}
              audioOutput="speaker"
              muted={isMuted || shouldMuteForCall}
              controls={false}
              volume={isMuted || shouldMuteForCall ? 0 : 1}
              // bufferConfig={{
              //   minBufferMs: 500,
              //   maxBufferMs: 8000,
              //   bufferForPlaybackMs: 250,
              //   bufferForPlaybackAfterRebufferMs: 500,
              // }}
              bufferConfig={{
                minBufferMs: 2000,
                maxBufferMs: 30000,
                bufferForPlaybackMs: 1000,
                bufferForPlaybackAfterRebufferMs: 2000,
              }}
              maxBitRate={8000000}
              selectedVideoTrack={{
                type: SelectedVideoTrackType.RESOLUTION,
                value: 1080,
              }}
              automaticallyWaitsToMinimizeStalling={false}
              preferredForwardBufferDuration={10}

                           progressUpdateInterval={1000}
              poster={thumbnailUrl}
              posterResizeMode="cover"
              preventsDisplaySleepDuringVideoPlayback={isActive}
              hideShutterView={true}
              reportBandwidth={true}
              disableFocus={true}
              shutterColor="transparent"
            />
          </View>
        )}

        {userPaused && paused && isActive && (
          <View pointerEvents="none" style={styles.pauseIndicator}>
            <View style={styles.pauseIcon}>
              <FontAwesome name="pause" size={35} color="#000" />
            </View>
          </View>
        )}

        {isBuffering && isActive && (
          <View pointerEvents="none" style={styles.bufferingIndicator}>
            <View style={styles.bufferingSpinner} />
          </View>
        )}

        {shouldMuteForCall && isActive && (
          <View pointerEvents="none" style={styles.callIndicator}>
            <View style={styles.callBadge}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.callText}>On Call - Audio Muted</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.video._id === nextProps.video._id &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.shouldPreload === nextProps.shouldPreload
  );
});

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000000',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
    zIndex: 2,
  },
  pauseIndicator: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
  pauseIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:'#aaa',
    borderRadius: 50,
    width: 80,
    height: 80,
  },
  bufferingIndicator: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  bufferingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
  },
  callIndicator: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 12,
  },
  callBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  callText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

OptimizedVideoPlayer.displayName = 'OptimizedVideoPlayer';

export default OptimizedVideoPlayer;
