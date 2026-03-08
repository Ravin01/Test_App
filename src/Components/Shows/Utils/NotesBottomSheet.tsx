import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  BackHandler,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { noteWhite, noteYellow } from '../../../assets/assets';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NotesBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  note?: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_HEIGHT = SCREEN_HEIGHT * 0.75; // 75% of screen height
const MIN_HEIGHT = 300;

// ============================================================================
// COMPONENT
// ============================================================================

const NotesBottomSheet: React.FC<NotesBottomSheetProps> = ({
  visible,
  onClose,
  note,
}) => {
  const bottomSheetRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.open();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  // ✅ REMOVED: BackHandler is now handled by parent component (LiveScreen)
  // This prevents conflicts and ensures proper modal closing order

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const hasNote = note && note.trim().length > 0;
  const displayNote = hasNote ? note : 'No note added...';

  // Calculate dynamic height based on content
  const contentHeight = hasNote 
    ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, 400))
    : MIN_HEIGHT;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <RBSheet
      ref={bottomSheetRef}
      height={contentHeight + insets.bottom}
      openDuration={300}
      draggable={true}
      closeDuration={250}
      closeOnPressMask={true}
      closeOnPressBack={true}
      onClose={onClose}
      customStyles={{
        wrapper: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        },
        draggableIcon: {
          backgroundColor: '#666',
          width: 40,
          height: 5,
          marginTop: 8,
          marginBottom: 8,
        },
        container: {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: '#1a1a1a',
          paddingBottom: insets.bottom,
        },
      }}
    >
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Image
              source={
              {uri:  hasNote
                  ? noteWhite
                : noteYellow}
              }
              style={styles.titleIcon}
            />
            <Text style={[styles.headerText, hasNote && styles.headerTextActive]}>
              Show note
            </Text>
          </View>
        </View>

        {/* Note Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={hasNote ? true : false}
          scrollEnabled={hasNote ? true : false}
        >
          <View style={[styles.noteContainer, !hasNote && styles.noteContainerEmpty]}>
            <Text
              style={[styles.noteText, !hasNote && styles.noteTextEmpty]}
              selectable={hasNote ? true : false}
            >
              {displayNote}
            </Text>
          </View>
        </ScrollView>

        {/* Footer Info (Optional) */}
        {true
        //hasNote
         && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Swipe down or tap outside to close
            </Text>
          </View>
        )}
      </View>
    </RBSheet>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  headerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff', //'#FFC100',
  },
  headerTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    marginBottom: 12,
  },
  scrollContent: {
    flexGrow: 1,
  },
  noteContainer: {
   // backgroundColor: 'rgba(217, 217, 217, 0.25)',
    borderRadius: 16,
    padding: 16,
    minHeight: 150,
  },
  noteContainerEmpty: {
   // backgroundColor: 'rgba(217, 217, 217, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#ffffff',
    fontWeight: '400',
  },
  noteTextEmpty: {
    color: '#888888',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    paddingTop: 12,
    //paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
});

export default NotesBottomSheet;
