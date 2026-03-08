"use client"

import React, { forwardRef, useCallback, useMemo } from "react"
import { View, Text, FlatList, StyleSheet } from "react-native"
import { ActivityIndicator } from "react-native-paper"
import MessageItem from "../MessageItem"
import { colors } from "../../../Utils/Colors"

const MessageList = forwardRef(
  (
    {
      messages,
      loading,
      currentUserId,
      otherParticipant,
      navigation,
      onMessageReaction,
      onRemoveReaction,
      typingUsers,
    },
    ref,
  ) => {
    // Memoize the render function to prevent unnecessary re-renders
    const renderMessage = useCallback(
      ({ item: message, index }) => (
        <MessageItem
          message={message}
          index={index}
          messages={messages}
          currentUserId={currentUserId}
          otherParticipant={otherParticipant}
          navigation={navigation}
          onReaction={onMessageReaction}
          onRemoveReaction={onRemoveReaction}
        />
      ),
      [messages, currentUserId, otherParticipant, navigation, onMessageReaction, onRemoveReaction],
    )

    const keyExtractor = useCallback((item) => item._id, [])

    // Memoize empty state
    const EmptyComponent = useMemo(
      () => (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Start a conversation with {otherParticipant?.userId?.name || "this user"}
          </Text>
        </View>
      ),
      [otherParticipant?.userId?.name],
    )

    // Memoize typing indicator
    const TypingIndicator = useMemo(
      () =>
        typingUsers.length > 0 ? (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>{otherParticipant?.userId?.name || "User"} is typing...</Text>
          </View>
        ) : null,
      [typingUsers.length, otherParticipant?.userId?.name],
    )

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primaryButtonColor} size="small" />
        </View>
      )
    }

    return (
      <View style={styles.container}>
        <FlatList
          ref={ref}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          ListEmptyComponent={EmptyComponent}
          contentContainerStyle={messages.length === 0 ? styles.emptyContentContainer : styles.messagesContainer}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          initialNumToRender={15}
          updateCellsBatchingPeriod={50}
          // Scroll optimizations
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // Scroll behavior
          onContentSizeChange={() => {
            // Use requestAnimationFrame for better performance
            requestAnimationFrame(() => {
              ref.current?.scrollToEnd({ animated: false })
            })
          }}
          onLayout={() => {
            requestAnimationFrame(() => {
              ref.current?.scrollToEnd({ animated: false })
            })
          }}
          // Maintain scroll position when new content is added
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          // Reduce re-renders
          extraData={`${messages.length}-${typingUsers.length}`}
        />

        {TypingIndicator}
      </View>
    )
  },
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
  },
  messagesContainer: {
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    color: "#999",
    fontStyle: "italic",
    fontSize: 14,
  },
})

export default React.memo(MessageList)
