"use client"

import { useState, useCallback, useEffect } from "react"
import axiosInstance from "../../../Utils/Api"
import { Toast } from "../../../Utils/dateUtils"



export const useChatMessages = (chatRoomId, user, socket, socketConnected, isVisible, onNewUnreadMessage) => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true) // Loading for initial history fetch
  const [sending, setSending] = useState(false)

  const markMessageAsRead = useCallback(
    async (messageId) => {
      if (!chatRoomId || !messageId || !user || !isVisible) return

      try {
        // Find the message to check if it's from another user
        const message = messages.find((m) => m._id === messageId)
        if (!message || message.senderId._id === user._id) return

        await axiosInstance.patch(`/chat/rooms/${chatRoomId}/messages/read`, {
          messageIds: [messageId],
        })

        if (socketConnected) {
          socket.emit("mark_message_read", {
            messageId,
            chatRoomId,
          })
        }
        // Update local state to reflect read status
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, status: "read" } : msg)),
        )
      } catch (error) {
        console.error("Error marking message as read:", error)
      }
    },
    [chatRoomId, user, socket, socketConnected, messages, isVisible],
  )

  const sendMessage = useCallback(
    async (messageData) => {
      if (!messageData.text?.trim() || !user || !chatRoomId) return

      try {
        setSending(true)

        const tempId = `temp_${Date.now()}`
        const tempMessage = {
          _id: tempId,
          chatRoomId,
          senderId: {
            _id: user._id,
            name: user.name || "You",
            profileURL: user.profileURL || null,
          },
          messageType: "text",
          content: { text: messageData.text.trim() },
          createdAt: new Date().toISOString(),
          status: "sending",
          deliveryStatus: [],
          reactions: [],
          metadata: {
            editHistory: [],
            editedAt: null,
            isEdited: false,
          },
        }

        setMessages((prev) => {
          const exists = prev.some((m) => m._id === tempId)
          if (exists) return prev
          return [...prev, tempMessage]
        })

        const response = await axiosInstance.post(`chat/rooms/${chatRoomId}/messages`, {
          messageType: "text",
          content: { text: messageData.text.trim() },
          metadata: {},
        })

        if (response.data.status) {
          const newMessage = response.data.data
          setMessages((prev) => prev.map((msg) => (msg._id === tempId ? newMessage : msg)))
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== tempId))
          Toast(response.data.message || "Failed to send message")
        }
      } catch (error) {
        console.error("Error sending message:", error)
        setMessages((prev) => prev.filter((m) => !m._id.startsWith("temp_")))
        Toast("Failed to send message")
      } finally {
        setSending(false)
      }
    },
    [chatRoomId, user],
  )

  const markAllMessagesAsRead = useCallback(async () => {
    if (!chatRoomId || !user) return

    try {
      await axiosInstance.patch(`/chat/rooms/${chatRoomId}/messages/read`, {
        messageIds: "all",
      })

      if (socketConnected) {
        socket.emit("mark_all_messages_read", { chatRoomId })
      }
      // Update local state for messages sent by other users to 'read'
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.senderId._id !== user._id) {
            return { ...msg, status: "read" }
          }
          return msg
        }),
      )
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }, [chatRoomId, user, socket, socketConnected])

  const addReaction = useCallback(
    async (messageId, emoji) => {
      if (!socketConnected || !user) return

      try {
        socket.emit("add_reaction", {
          messageId,
          emoji,
          chatRoomId,
        })
      } catch (error) {
        console.error("Error adding reaction:", error)
        Toast("Failed to add reaction")
      }
    },
    [socket, socketConnected, user, chatRoomId],
  )

  const removeReaction = useCallback(
    async (messageId, emoji) => {
      if (!socketConnected || !user) return

      try {
        socket.emit("remove_reaction", {
          messageId,
          emoji,
          chatRoomId,
        })
      } catch (error) {
        console.error("Error removing reaction:", error)
        Toast("Failed to remove reaction")
      }
    },
    [socket, socketConnected, user, chatRoomId],
  )

  // Socket event listeners for real-time updates and initial history
  useEffect(() => {
    if (!socketConnected || !chatRoomId || !user) return

    // Request chat history when socket connects and chatRoomId is available
    setLoading(true) // Set loading true when requesting history
    socket.emit("request_chat_history", { chatRoomId, userId: user._id })

    const handleChatHistory = (data) => {
      if (data.chatRoomId === chatRoomId) {
        setMessages(data.messages || []) // Populate messages with history
        setLoading(false) // History loaded
      }
    }

    const handleNewMessage = (message) => {
      if (message.chatRoomId === chatRoomId) {
        setMessages((prev) => {
          const filteredPrev = prev.filter((m) => !m._id.startsWith("temp_"))
          const exists = filteredPrev.some((m) => m._id === message._id)
          if (exists) return filteredPrev

          const newMessages = [...filteredPrev, message]

          // Auto-mark as read if chat is visible and message is from another user
          if (message.senderId._id !== user._id && isVisible) {
            setTimeout(() => {
              markMessageAsRead(message._id)
            }, 1000)
          } else if (message.senderId._id !== user._id) {
            // Increment unread count and show notification if not visible
            onNewUnreadMessage(message) // Pass the message object to the callback
          }
          return newMessages
        })
      }
    }

    const handleMessageRead = (data) => {
      if (data.chatRoomId === chatRoomId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === data.messageId ? { ...msg, status: "read", readAt: data.readAt } : msg)),
        )
      }
    }

    const handleAllMessagesRead = (data) => {
      if (data.chatRoomId === chatRoomId && data.readBy !== user._id) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.senderId._id === user._id) {
              return { ...msg, status: "read", readAt: data.readAt }
            }
            return msg
          }),
        )
      }
    }

    const handleReactionAdded = (data) => {
      if (data.messageId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg._id === data.messageId) {
              const updatedReactions = [...(msg.reactions || [])]
              const existingIndex = updatedReactions.findIndex(
                (r) => r.userId === data.reaction.userId && r.emoji === data.reaction.emoji,
              )
              if (existingIndex === -1) {
                updatedReactions.push(data.reaction)
              }
              return { ...msg, reactions: updatedReactions }
            }
            return msg
          }),
        )
      }
    }

    const handleReactionRemoved = (data) => {
      if (data.messageId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg._id === data.messageId) {
              const updatedReactions = (msg.reactions || []).filter(
                (r) => !(r.userId === data.userId && r.emoji === data.emoji),
              )
              return { ...msg, reactions: updatedReactions }
            }
            return msg
          }),
        )
      }
    }

    socket.on("chat_history", handleChatHistory)
    socket.on("new_message", handleNewMessage)
    socket.on("message_read", handleMessageRead)
    socket.on("all_messages_read", handleAllMessagesRead)
    socket.on("reaction_added", handleReactionAdded)
    socket.on("reaction_removed", handleReactionRemoved)

    return () => {
      socket.off("chat_history", handleChatHistory)
      socket.off("new_message", handleNewMessage)
      socket.off("message_read", handleMessageRead)
      socket.off("all_messages_read", handleAllMessagesRead)
      socket.off("reaction_added", handleReactionAdded)
      socket.off("reaction_removed", handleReactionRemoved)
    }
  }, [socket, socketConnected, chatRoomId, user, isVisible, markMessageAsRead, onNewUnreadMessage])
 const fetchMessages = useCallback(async () => {
    if (!chatRoomId) return

    try {
      setLoading(true)
      const response = await axiosInstance.get(`/chat/rooms/${chatRoomId}/messages`, { params: { page: 1, limit: 50 } })
    console.log("fething")
      if (response.data.status) {
        const fetchedMessages = response.data.data || []
        setMessages(fetchedMessages)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      Toast("Failed to load messages")
    } finally {
      setLoading(false)
    }
  }, [chatRoomId])
  return {
    messages,
    loading,
    sending,
    sendMessage,
    fetchMessages,
    markAllMessagesAsRead,
    addReaction,
    removeReaction,
  }
}
