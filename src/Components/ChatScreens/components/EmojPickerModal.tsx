"use client"
import React, { useState, useEffect } from "react"
import { Modal, View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native"
import EmojiPicker from "rn-emoji-keyboard"

const EmojiPickerModal = ({ visible, onClose, onEmojiSelected }) => {
  const [isEmojiPickerReady, setIsEmojiPickerReady] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (visible) {
      // Reset error state when modal opens
      setHasError(false)
      
      // Add a small delay to ensure the component is ready
      const timer = setTimeout(() => {
        setIsEmojiPickerReady(true)
      }, 100)
      
      return () => clearTimeout(timer)
    } else {
      setIsEmojiPickerReady(false)
    }
  }, [visible])

  const handleEmojiSelected = (emoji) => {
    try {
      if (emoji && emoji.emoji) {
        onEmojiSelected(emoji.emoji)
      }
    } catch (error) {
      console.log('Error selecting emoji:', error)
      setHasError(true)
    }
  }

  const handleClose = () => {
    setIsEmojiPickerReady(false)
    setHasError(false)
    onClose()
  }

  const handleEmojiPickerError = (error) => {
    console.log('Emoji picker error:', error)
    setHasError(true)
  }

  // Fallback emoji list for when the picker fails
  const fallbackEmojis = ['😀', '😂', '😍', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '💯', '🎉']

  const handleFallbackEmojiSelect = (emoji) => {
    onEmojiSelected(emoji)
    handleClose()
  }

  if (!visible) return null

  return (
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="slide" 
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {hasError ? (
            // Fallback UI when emoji picker fails
            <View style={styles.fallbackContainer}>
              <Text style={styles.fallbackTitle}>Quick Emojis</Text>
              <View style={styles.fallbackGrid}>
                {fallbackEmojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.fallbackEmoji}
                    onPress={() => handleFallbackEmojiSelect(emoji)}
                  >
                    <Text style={styles.fallbackEmojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Main emoji picker
            <EmojiPicker
              open={visible && isEmojiPickerReady}
              onClose={handleClose}
              onEmojiSelected={handleEmojiSelected}
              allowMultipleSelections={false}
              // heigh
              theme={{
                knob: "#766dfc",
                container: "#282829",
                header: "#fff",
                skinTonesContainer: "#252427",
                category: {
                  icon: "#766dfc",
                  iconActive: "#fff",
                  container: "#252427",
                  containerActive: "#766dfc",
                },
                customButton: {
                  icon: "#766dfc",
                  iconPressed: "#fff",
                  background: "#252427",
                  backgroundPressed: "#766dfc",
                },
                search: {
                  text: "#fff",
                  placeholder: "#ffffff2c",
                  icon: "#fff",
                  background: "#333",
                },
              }}
              categoryPosition="top"
              enableRecentlyUsed={true}
              enableSearchBar={true}
              enableCategoryChangeAnimation={true}
              defaultHeight={500}
              // Add error handling props if available
              onError={handleEmojiPickerError}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    flex: 1,
  },
  fallbackContainer: {
    backgroundColor: "#282829",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  fallbackTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  fallbackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  fallbackEmoji: {
    padding: 10,
    margin: 5,
    backgroundColor: "#333",
    borderRadius: 10,
    minWidth: 50,
    alignItems: "center",
  },
  fallbackEmojiText: {
    fontSize: 24,
  },
  closeButton: {
    backgroundColor: "#766dfc",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
})

export default React.memo(EmojiPickerModal)