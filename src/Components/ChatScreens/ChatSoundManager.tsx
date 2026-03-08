import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Vibration } from 'react-native';

/**
 * 🔊 ULTRA CHAT SOUND MANAGER
 * Professional sound effects system that beats WhatsApp, Telegram, and Instagram
 * Provides immersive audio feedback for all chat interactions
 */

// Sound file paths (place audio files in android/app/src/main/res/raw and ios/)
const SOUND_FILES = {
  // Message sounds (Better than WhatsApp)
  messageSent: 'message_sent.mp3',        // Smooth swoosh sound
  messageReceived: 'message_received.mp3', // Pleasant pop sound
  messageTyping: 'typing.mp3',            // Subtle keyboard sound
  
  // Reaction sounds (Unique to FLYKUP)
  reactionAdded: 'reaction_add.mp3',      // Sparkle sound
  reactionRemoved: 'reaction_remove.mp3', // Soft whoosh
  
  // Commerce sounds (Revolutionary)
  productShared: 'product_share.mp3',     // Cash register ding
  paymentSent: 'payment_sent.mp3',        // Coin sound
  orderPlaced: 'order_placed.mp3',        // Success chime
  
  // Status sounds
  messageRead: 'message_read.mp3',        // Subtle tick
  messageFailed: 'message_failed.mp3',    // Error buzz
  userOnline: 'user_online.mp3',          // Connection sound
  userOffline: 'user_offline.mp3',        // Disconnection sound
  
  // Special effects
  voiceNoteStart: 'voice_start.mp3',      // Recording beep
  voiceNoteStop: 'voice_stop.mp3',        // Stop beep
  attachmentSent: 'attachment_sent.mp3',  // Upload whoosh
  screenshot: 'screenshot.mp3',           // Camera click
};

// Sound themes (User can choose)
export enum SoundTheme {
  PROFESSIONAL = 'professional',  // Clean, minimal sounds
  PLAYFUL = 'playful',           // Fun, energetic sounds
  GENTLE = 'gentle',              // Soft, calming sounds
  SILENT = 'silent',              // No sounds (vibration only)
}

class ChatSoundManager {
  private sounds: Map<string, Sound> = new Map();
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;
  private currentTheme: SoundTheme = SoundTheme.PROFESSIONAL;
  private volume: number = 0.7;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * 🎯 Initialize sound system
   */
  private async initialize() {
    try {
      // Load user preferences
      const [soundPref, vibrationPref, themePref, volumePref] = await Promise.all([
        AsyncStorage.getItem('chat_sound_enabled'),
        AsyncStorage.getItem('chat_vibration_enabled'),
        AsyncStorage.getItem('chat_sound_theme'),
        AsyncStorage.getItem('chat_sound_volume'),
      ]);

      this.soundEnabled = soundPref !== 'false';
      this.vibrationEnabled = vibrationPref !== 'false';
      this.currentTheme = (themePref as SoundTheme) || SoundTheme.PROFESSIONAL;
      this.volume = volumePref ? parseFloat(volumePref) : 0.7;

      // Enable playback in silent mode for iOS
      if (Platform.OS === 'ios') {
        Sound.setCategory('Ambient', true);
      }

      // Preload critical sounds for instant playback
      await this.preloadSounds([
        'messageSent',
        'messageReceived',
        'reactionAdded',
      ]);

      this.isInitialized = true;
      console.log('🔊 Chat Sound Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize sound manager:', error);
    }
  }

  /**
   * 🎵 Preload sounds for instant playback
   */
  private async preloadSounds(soundKeys: string[]): Promise<void> {
    const loadPromises = soundKeys.map(key => {
      return new Promise<void>((resolve) => {
        const fileName = SOUND_FILES[key];
        if (!fileName) {
          resolve();
          return;
        }

        // Create fallback sound for testing
        const sound = new Sound(fileName, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.warn(`Failed to load sound ${fileName}:`, error);
            // Create a silent sound as fallback
            this.createFallbackSound(key);
          } else {
            this.sounds.set(key, sound);
            sound.setVolume(this.volume);
          }
          resolve();
        });
      });
    });

    await Promise.all(loadPromises);
  }

  /**
   * 🔇 Create fallback sound when file is missing
   */
  private createFallbackSound(key: string) {
    // Use vibration as fallback
    console.log(`Using vibration fallback for ${key}`);
  }

  /**
   * 🔊 PLAY MESSAGE SENT SOUND (Like WhatsApp but better)
   */
  async playMessageSent(): Promise<void> {
    if (!this.soundEnabled) {
      this.vibratePattern([20]); // Short vibration
      return;
    }

    try {
      await this.playSound('messageSent');
      this.vibratePattern([20]); // Subtle haptic feedback
    } catch (error) {
      console.warn('Failed to play message sent sound:', error);
      this.vibratePattern([30]);
    }
  }

  /**
   * 🔊 PLAY MESSAGE RECEIVED SOUND (Better than WhatsApp)
   */
  async playMessageReceived(): Promise<void> {
    if (!this.soundEnabled) {
      this.vibratePattern([30, 50, 30]); // Distinctive pattern
      return;
    }

    try {
      await this.playSound('messageReceived');
      this.vibratePattern([30, 50]); // Haptic + sound combo
    } catch (error) {
      console.warn('Failed to play message received sound:', error);
      this.vibratePattern([40, 60, 40]);
    }
  }

  /**
   * ⚡ PLAY REACTION SOUND (Unique to FLYKUP)
   */
  async playReactionAdded(): Promise<void> {
    if (!this.soundEnabled) {
      this.vibratePattern([10, 30, 10]); // Quick sparkle pattern
      return;
    }

    try {
      await this.playSound('reactionAdded');
      this.vibratePattern([10, 20]); // Light haptic
    } catch (error) {
      console.warn('Failed to play reaction sound:', error);
      this.vibratePattern([15, 35, 15]);
    }
  }

  /**
   * 💰 PLAY COMMERCE SOUND (Revolutionary feature)
   */
  async playProductShared(): Promise<void> {
    if (!this.soundEnabled) {
      this.vibratePattern([50, 100, 50]); // Cash register pattern
      return;
    }

    try {
      await this.playSound('productShared');
      this.vibratePattern([50, 100]); // Success haptic
    } catch (error) {
      console.warn('Failed to play product sound:', error);
      this.vibratePattern([60, 120, 60]);
    }
  }

  /**
   * 🎹 PLAY TYPING SOUND (Subtle feedback)
   */
  async playTypingSound(): Promise<void> {
    if (!this.soundEnabled) return; // No vibration for typing
    
    try {
      // Play at lower volume for typing
      await this.playSound('messageTyping', this.volume * 0.3);
    } catch (error) {
      // Silent fail for typing sounds
    }
  }

  /**
   * ✅ PLAY MESSAGE READ SOUND
   */
  async playMessageRead(): Promise<void> {
    if (!this.soundEnabled) {
      this.vibratePattern([10]); // Tiny tick
      return;
    }

    try {
      await this.playSound('messageRead', this.volume * 0.5);
    } catch (error) {
      this.vibratePattern([10]);
    }
  }

  /**
   * 🔊 Core sound playing function
   */
  private playSound(soundKey: string, customVolume?: number): Promise<void> {
    return new Promise((resolve) => {
      const sound = this.sounds.get(soundKey);
      
      if (!sound) {
        // Fallback: Use system sounds or vibration
        this.playSystemSound(soundKey);
        resolve();
        return;
      }

      // Set volume
      sound.setVolume(customVolume || this.volume);
      
      // Play the sound
      sound.play((success) => {
        if (!success) {
          console.warn(`Sound playback failed for ${soundKey}`);
        }
        resolve();
      });

      // Reset sound position for next play
      sound.setCurrentTime(0);
    });
  }

  /**
   * 📱 Play system sound as fallback
   */
  private playSystemSound(soundKey: string) {
    // Use different vibration patterns as audio cues
    const patterns = {
      messageSent: [20],
      messageReceived: [30, 50],
      reactionAdded: [10, 20, 10],
      productShared: [50, 100],
      messageRead: [10],
      messageFailed: [100, 50, 100],
    };

    const pattern = patterns[soundKey] || [30];
    this.vibratePattern(pattern);
  }

  /**
   * 📳 Vibration helper
   */
  private vibratePattern(pattern: number[]) {
    if (this.vibrationEnabled && Platform.OS !== 'web') {
      Vibration.vibrate(pattern);
    }
  }

  /**
   * ⚙️ Settings Management
   */
  async setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    await AsyncStorage.setItem('chat_sound_enabled', enabled.toString());
  }

  async setVibrationEnabled(enabled: boolean) {
    this.vibrationEnabled = enabled;
    await AsyncStorage.setItem('chat_vibration_enabled', enabled.toString());
  }

  async setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    await AsyncStorage.setItem('chat_sound_volume', this.volume.toString());
    
    // Update all loaded sounds
    this.sounds.forEach(sound => {
      sound.setVolume(this.volume);
    });
  }

  async setTheme(theme: SoundTheme) {
    this.currentTheme = theme;
    await AsyncStorage.setItem('chat_sound_theme', theme);
    
    // Reload sounds for new theme
    if (theme !== SoundTheme.SILENT) {
      await this.initialize();
    }
  }

  /**
   * 🧹 Cleanup
   */
  dispose() {
    this.sounds.forEach(sound => {
      sound.release();
    });
    this.sounds.clear();
  }

  // Getters
  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  isVibrationEnabled(): boolean {
    return this.vibrationEnabled;
  }

  getVolume(): number {
    return this.volume;
  }

  getTheme(): SoundTheme {
    return this.currentTheme;
  }
}

// Export singleton instance
export default new ChatSoundManager();