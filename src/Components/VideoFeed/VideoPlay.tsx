import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  StyleSheet,
  Pressable,
} from 'react-native';
import Video from 'react-native-video';
import {AWS_CDN_URL} from '../../Utils/aws';
import useVideoTracker from '../Reels/hooks/useVideoTracker';

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

interface VideoPlayerProps {
  video: VideoData;
  isActive: boolean;
  shouldPreload?: boolean;
  isFirstVideo?: boolean;
}

const VideoPlay: React.FC<VideoPlayerProps> = ({
  video,
  isActive,
  shouldPreload = false,
  isFirstVideo = false,
}) => {
  const [paused, setPaused] = useState(!isActive);
  const [liked, setLiked] = useState(false);
  const [firstVideoReady, setFirstVideoReady] = useState(!isFirstVideo);
 const {
      startTracking,
      pauseTracking,
      sendTrackingData,
      trackProgress,
      trackProductClick,
      setVideoDuration,
    } = useVideoTracker(video._id);
  useEffect(() => {
    setPaused(!isActive);
  }, [isActive]);
   useEffect(() => {
        if (isActive && !paused) {
          startTracking();
        } else if (paused) {
          pauseTracking();
        }
      }, [isActive, startTracking, pauseTracking]);
  const handleProgress = useCallback(
      progressData => {
        const newCurrentTime = progressData.currentTime;
        const newDuration =
          progressData.seekableDuration || progressData.playableDuration;
        trackProgress(newCurrentTime);
        if (newDuration > 0) {
          // setMetrics(prev => ({
          //   ...prev,
          //   currentTime: progressData.currentTime,
          //   playableDuration: progressData.playableDuration,
          // }));

          // onReadyForDisplay is the primary first frame detector
          // Progress is just for metrics updates
          // onProgress?.(progressData);
          // const newProgress = (newCurrentTime / newDuration) * 100
          // setProgress(newProgress)
        }
        if (newDuration > 0 && newCurrentTime >= newDuration * 0.95) {
          sendTrackingData();
        }
      },
      [trackProgress, sendTrackingData],
    );
  const togglePlayPause = () => {
    console.log('Toggling play/pause. Current paused state:', paused);
    setPaused(!paused);
  };

  const toggleLike = () => {
    setLiked(!liked);
  };

  const videoUrl = useMemo(() => {
    // Use hlsMasterPlaylistUrl if available, otherwise construct from masterPlaylistKey
    return (
      video?.hlsMasterPlaylistUrl || `${AWS_CDN_URL}${video?.masterPlaylistKey}`
    );
  }, [video?.hlsMasterPlaylistUrl, video?.masterPlaylistKey]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={togglePlayPause}>
        {/* Thumbnail - always visible, covers black screen */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={{
              uri: `${AWS_CDN_URL}${video.thumbnailBlobName}`,
            }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        </View>
        
        {(isActive || shouldPreload) && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Video
              source={{
                uri: videoUrl,
                type: 'm3u8',
              }}
              style={[
                styles.video,
                {opacity: isActive && firstVideoReady ? 1 : 0},
              ]}
              resizeMode="cover"
              paused={shouldPreload ? true : paused}
              repeat={true}
              playWhenInactive={false}
              onLoad={(data)=> setVideoDuration(data.duration)}
              onProgress={handleProgress}
              playInBackground={false}
              ignoreSilentSwitch="ignore"
              muted={shouldPreload ? true : false}
              onReadyForDisplay={() => {
                if (isFirstVideo) {
                  setFirstVideoReady(true);
                }
              }}
            />
          </View>
        )}
        
        {/* Pause indicator */}
        {paused && isActive && (
          <View pointerEvents="none" style={styles.pauseIndicator}>
            <View style={styles.pauseIcon}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Side action panel */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    height,
    // borderWidth:3,
    // borderColor:'red',
    backgroundColor: '#000000',
  },
  videoContainer: {
    // flex: 1,
    // border:'2px solid white',
    width:'100%',
    height:'100%',
    // borderColor:'yellow',
    // borderWidth:3,
    // position: 'relative',
  },
  videoBackground: {
    // ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  video: {
    // borderWidth:3,
    // borderColor:'green',
    // flex:1,
    width: '100%',
    height: '100%',
    // position: 'absolute',
    // ...StyleSheet.absoluteFillObject, // Fill entire container
    backgroundColor: 'black',
    // ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    // backgroundColor:'red'
  },
  sidePanel: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
  },
  authorContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  followButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#32d74b',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -10,
  },
  followText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
  bottomPanel: {
    position: 'absolute',
    left: 20,
    bottom: 100,
    right: 80,
  },
  username: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  description: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  hashtags: {
    color: '#32d74b',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 18,
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: '#a0a0a0',
    fontSize: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 50,
    width: 80,
    height: 80,
    gap: 8,
  },
  pauseBar: {
    width: 8,
    height: 40,
    backgroundColor: '#000000',
    borderRadius: 2,
  },
});

export default VideoPlay;
