"use client"

import React, { useState, useCallback } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native"
import Ionicons from "react-native-vector-icons/Ionicons"

const MessageInput = ({ onSendMessage, onTyping, sending, disabled, onEmojiPress }) => {
  const [inputText, setInputText] = useState("")

  const handleSend = useCallback(() => {
    if (inputText.trim().length === 0 || disabled) return

    onSendMessage({ text: inputText.trim() })
    setInputText("")
    onTyping(false)
  }, [inputText, disabled, onSendMessage, onTyping])

  const handleTextChange = useCallback(
    (text) => {
      setInputText(text)
      onTyping(text.length > 0)
    },
    [onTyping],
  )

  const handleBlur = useCallback(() => {
    onTyping(false)
  }, [onTyping])

  if (disabled) {
    return (
      <View style={[styles.inputContainer, styles.disabledContainer]}>
        <Text style={styles.disabledText}>Cannot send messages due to blocking</Text>
      </View>
    )
  }

  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="add" size={24} color="#F7CE45" />
        </TouchableOpacity>

        <TextInput
          value={inputText}
          onChangeText={handleTextChange}
          onBlur={handleBlur}
          placeholder="Message..."
          placeholderTextColor="#999"
          style={styles.input}
          multiline
          maxLength={1000}
          textAlignVertical="center"
          editable={!disabled}
        />

        <TouchableOpacity style={styles.emojiButton} onPress={onEmojiPress}>
          <Text style={styles.emojiText}>😊</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleSend}
        style={[styles.sendButton, { opacity: inputText.trim().length === 0 ? 0.5 : 1 }]}
        disabled={inputText.trim().length === 0 || sending}
      >
        {sending ? (
          <Ionicons name="hourglass-outline" size={20} color="#000" />
        ) : (
          <Ionicons name="send" size={20} color="#000" />
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#1A1A1A",
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    alignItems: "flex-end",
  },
  disabledContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  disabledText: {
    color: "#999",
    fontSize: 14,
    fontStyle: "italic",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#2A2A2A",
    borderRadius: 25,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    minHeight: 40,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 4,
    textAlignVertical: "center",
  },
  attachButton: {
    marginRight: 8,
    padding: 4,
  },
  emojiButton: {
    marginLeft: 8,
    padding: 4,
  },
  emojiText: {
    fontSize: 20,
  },
  sendButton: {
    backgroundColor: "#F7CE45",
    borderRadius: 20,
    padding: 15,
    justifyContent: "center",
    alignItems: "center",
  },
})

export default React.memo(MessageInput)
