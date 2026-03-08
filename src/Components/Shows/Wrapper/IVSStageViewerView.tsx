import React from 'react';
import {requireNativeComponent, ViewStyle, StyleSheet} from 'react-native';

interface IVSStageViewerViewProps {
  style?: ViewStyle;
  stageToken?: string;
  muted?: boolean;
  onParticipantJoined?: (event: any) => void;
  onParticipantLeft?: (event: any) => void;
  onStreamsAdded?: (event: any) => void;
  onStreamsRemoved?: (event: any) => void;
  onConnectionStateChanged?: (event: any) => void;
}

const NativeIVSStageViewerView = requireNativeComponent<IVSStageViewerViewProps>(
  'RNIVSStageViewerView',
);

export default function IVSStageViewerView({
  style,
  stageToken,
  muted,
  onParticipantJoined,
  onParticipantLeft,
  onStreamsAdded,
  onStreamsRemoved,
  onConnectionStateChanged,
}: IVSStageViewerViewProps) {
  return (
    <NativeIVSStageViewerView
      style={style || styles.container}
      stageToken={stageToken}
      muted={muted}
      onParticipantJoined={onParticipantJoined}
      onParticipantLeft={onParticipantLeft}
      onStreamsAdded={onStreamsAdded}
      onStreamsRemoved={onStreamsRemoved}
      onConnectionStateChanged={onConnectionStateChanged}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
