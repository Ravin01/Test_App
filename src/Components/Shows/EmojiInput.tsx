import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const EMOJIS = ['😀', '😂', '😍', '🤔', '🥳', '😎', '😢', '👍', '🎉'];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EmojiInputProps {
  onEmojiSelect?: (emoji: string) => void;
}

export default function EmojiInput({ onEmojiSelect }: EmojiInputProps) {
  const [confetti, setConfetti] = useState([]);

  const insertEmoji = (emoji) => {
    // Notify parent component about emoji selection
    if (onEmojiSelect) {
      onEmojiSelect(emoji);
    }

    // Emoji float animation disabled as per requirement
    // floatEmoji(emoji, 3);
  };

 const floatEmoji = (emoji, count = 1) => {
  const emojiSize = 28;
  const horizontalPadding = 20;

  const newParticles = Array.from({ length: count }).map((_, i) => {
    const id = Date.now() + i;
    const animation = new Animated.Value(0);
    const startLeft =
      Math.random() * (SCREEN_WIDTH - emojiSize - horizontalPadding * 2) + horizontalPadding;
    const drift = Math.random() * 60 - 30;

    return {
      id,
      emoji,
      animation,
      left: startLeft,
      drift,
    };
  });

  setConfetti((prev) => [...prev, ...newParticles]);

  newParticles.forEach((particle) => {
    Animated.timing(particle.animation, {
      toValue: 1,
      duration: 3000 + Math.random() * 1000,
      useNativeDriver: true,
    }).start(() => {
      setConfetti((prev) => prev.filter((p) => p.id !== particle.id));
    });
  });
};

  const renderConfetti = () =>
    confetti.map((particle) => {
      const translateY = particle.animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -SCREEN_HEIGHT * 0.4],
      });

      const translateX = particle.animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, particle.drift],
      });

      const opacity = particle.animation.interpolate({
        inputRange: [0, 0.8, 1],
        outputRange: [1, 1, 0],
      });

      const scale = particle.animation.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [0.6, 1.3, 1],
      });

      return (
        <Animated.Text
          key={particle.id}
          style={{
            position: 'absolute',
            bottom: 60,
            left: particle.left,
            transform: [{ translateY }, { translateX }, { scale }],
            opacity,
            fontSize: 28,
          }}
        >
          {particle.emoji}
        </Animated.Text>
      );
    });

  return (
    <View style={styles.container}>
      {renderConfetti()}
      {/*
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        onSelectionChange={({ nativeEvent: { selection } }) => setSelection(selection)}
        selection={selection}
        multiline
      />   */}

      <FlatList
        data={EMOJIS}
        horizontal
    showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={() => insertEmoji(item)}
          >
            <Text style={styles.emoji}>{item}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.emojiPicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 0, flex: 1, justifyContent: 'flex-end'},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    minHeight: 100,
    fontSize: 18,
    borderRadius: 8,
  },
  emojiPicker: {
    marginTop: 10,
    paddingBottom: 6,
  },
  emojiButton: {
    padding: 2,
    paddingHorizontal: 4,
    borderRadius: 1000,
    marginRight: 5,
  //  borderWidth: StyleSheet.hairlineWidth,
 //   borderColor: '#eee',
     backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  emoji: {
    fontSize: 24,
  },
});
