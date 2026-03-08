// EmojiPicker.tsx - Professional emoji picker component for React Native

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Search, Clock, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EmojiPickerProps {
  visible: boolean;
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  position?: 'center' | 'bottom';
  onSend?: () => void;
  canSend?: boolean;
}

interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ 
  visible, 
  onEmojiSelect, 
  onClose, 
  position = 'center',
  onSend,
  canSend = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  // Emoji categories with emojis
  const emojiCategories: Record<string, EmojiCategory> = {
    smileys: {
      name: 'Smileys & People',
      icon: '😀',
      emojis: [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
        '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
        '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
        '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
        '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
        '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
      ]
    },
    hearts: {
      name: 'Hearts & Love',
      icon: '❤️',
      emojis: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💯'
      ]
    },
    gestures: {
      name: 'Gestures',
      icon: '👍',
      emojis: [
        '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
        '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋',
        '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✊', '👊', '🤛'
      ]
    },
    objects: {
      name: 'Objects',
      icon: '🎉',
      emojis: [
        '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟',
        '💫', '✨', '🔥', '💯', '💢', '💥', '💦', '💨', '🕳️', '💬'
      ]
    },
    symbols: {
      name: 'Symbols',
      icon: '💡',
      emojis: [
        '💡', '💭', '🗯️', '💬', '👁️‍🗨️', '🗨️', '🔔', '🔕', '📢', '📣',
        '💤', '💯', '💮', '💰', '💴', '💵', '💶', '💷', '💸', '💳'
      ]
    }
  };

  // Load recent emojis from AsyncStorage on mount
  useEffect(() => {
    const loadRecentEmojis = async () => {
      try {
        const saved = await AsyncStorage.getItem('recentEmojis');
        if (saved) {
          setRecentEmojis(JSON.parse(saved));
        }
      } catch (error) {
        console.log('Error loading recent emojis:', error);
      }
    };

    if (visible) {
      loadRecentEmojis();
    }
  }, [visible]);

  const handleEmojiClick = async (emoji: string) => {
    try {
      // Add to recent emojis
      const updatedRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 20);
      setRecentEmojis(updatedRecent);
      await AsyncStorage.setItem('recentEmojis', JSON.stringify(updatedRecent));

      // Call the selection handler
      onEmojiSelect(emoji);
      
      // Don't close the picker automatically - let parent handle it
      // onClose();
    } catch (error) {
      console.log('Error saving recent emoji:', error);
      // Still call selection handler even if saving fails
      onEmojiSelect(emoji);
    }
  };

  const getFilteredEmojis = (): string[] => {
    if (!searchQuery) return emojiCategories[activeCategory]?.emojis || [];
    
    // Search across all categories
    const allEmojis = Object.values(emojiCategories).flatMap(cat => cat.emojis);
    return allEmojis.filter(emoji => {
      // Simple emoji search - in a real app you'd have emoji names/keywords
      return emoji.includes(searchQuery);
    });
  };

  const getCurrentEmojis = (): string[] => {
    if (searchQuery) {
      return getFilteredEmojis();
    }
    if (activeCategory === 'recent') {
      return recentEmojis;
    }
    return emojiCategories[activeCategory]?.emojis || [];
  };

  const renderEmojiItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      key={`emoji-${index}`}
      onPress={() => handleEmojiClick(item)}
      className="aspect-square flex items-center justify-center active:bg-gray-700 rounded-lg"
      style={{ width: '12.5%' }} // 8 columns = 12.5% width each
    >
      <Text className="text-2xl">{item}</Text>
    </TouchableOpacity>
  );

  const renderCategoryTab = (key: string, category: EmojiCategory) => (
    <TouchableOpacity
      key={key}
      onPress={() => setActiveCategory(key)}
      className={`flex-shrink-0 px-3 py-2 rounded-lg mx-1 ${
        activeCategory === key 
          ? 'bg-yellow-400' 
          : 'bg-transparent'
      }`}
    >
      <Text className="text-lg">{category.icon}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 justify-end"
        style={{paddingBottom: 140}}
        onPress={onClose}
      >
        <Pressable 
          className="bg-secondary-color rounded-t-2xl max-h-[100%]"
          style={{height: 350}}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header with search and close */}
          <View className="p-4 border-b border-gray-700 ">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white text-lg font-semibold">Select Emoji</Text>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <View className="relative">
              <Search 
                size={16} 
                color="#9CA3AF" 
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 12,
                  zIndex: 1
                }}
              />
              <TextInput
                placeholder="Search emojis..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="w-full pl-10 pr-4 py-3 bg-secondary-color border border-gray-600 rounded-lg text-white placeholder:text-gray-400"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Category tabs */}
          {!searchQuery && (
            <View className="flex-row px-2 py-2 border-b border-gray-700">
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 8 }}
              >
                {/* Recent emojis tab */}
                {recentEmojis.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setActiveCategory('recent')}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg mx-1 ${
                      activeCategory === 'recent' 
                        ? 'bg-yellow-400' 
                        : 'bg-transparent'
                    } items-center justify-center`}
                  >
                    <Clock size={16} color={activeCategory === 'recent' ? '#000000' : '#ffffff'} />
                  </TouchableOpacity>
                )}
                
                {Object.entries(emojiCategories).map(([key, category]) => 
                  renderCategoryTab(key, category)
                )}
              </ScrollView>
            </View>
          )}

          {/* Emoji grid */}
          <View className="flex-1 px-2 py-2">
            {getCurrentEmojis().length > 0 ? (
              <FlatList
                data={getCurrentEmojis()}
                renderItem={renderEmojiItem}
                numColumns={8}
                keyExtractor={(item, index) => `${activeCategory}-${index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            ) : (
              <View className="flex-1 justify-center items-center">
                <Text className="text-gray-400 text-center text-lg">
                  {searchQuery ? 'No emojis found' : 'No emojis available'}
                </Text>
                {searchQuery && (
                  <Text className="text-gray-500 text-center text-sm mt-1">
                    Try a different search term
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Footer */}
          <View className="px-4 py-3 border-t border-gray-700">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-400 text-xs">
                {searchQuery 
                  ? `${getCurrentEmojis().length} results` 
                  : activeCategory === 'recent' 
                    ? 'Recently used'
                    : emojiCategories[activeCategory]?.name || 'Select an emoji'
                }
              </Text>
              <View className="flex-row items-center gap-2">
                {onSend && canSend && (
                  <TouchableOpacity 
                    onPress={onSend}
                    className="bg-yellow-400 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-black text-xs font-semibold">Send</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose}>
                  <Text className="text-gray-400 text-xs">Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default EmojiPicker;

// Usage Example:
/*
import EmojiPicker from './EmojiPicker';

const MyComponent = () => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('');

  const handleEmojiSelect = (emoji) => {
    setSelectedEmoji(emoji);
    console.log('Selected emoji:', emoji);
  };

  return (
    <View>
      <TouchableOpacity 
        onPress={() => setShowEmojiPicker(true)}
        className="bg-blue-500 px-4 py-2 rounded-lg"
      >
        <Text className="text-white">Open Emoji Picker {selectedEmoji}</Text>
      </TouchableOpacity>

      <EmojiPicker
        visible={showEmojiPicker}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />
    </View>
  );
};
*/
