"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { io } from "socket.io-client"
import { socketurl } from "../../../../Config"

const socket = io(socketurl, {
  transports: ["websocket"],
})

export const useChatSocket = (chatRoomId, userId) => {
  const [socketConnected, setSocketConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [userOnlineStatus, setUserOnlineStatus] = useState("offline")
  const typingTimeoutRef = useRef(null)

  const connectSocket = useCallback(async () => {
    try {
      if (socket.connected) {
        setSocketConnected(true)
        return
      }

      await new Promise((resolve) => {
        socket.on("connect", resolve)
        socket.connect()
      })

      setSocketConnected(true)

      if (userId) {
        socket.emit("identify_user", { userId })
      }

      if (chatRoomId) {
        socket.emit("join_chat_room", { chatRoomId })
      }
    } catch (error) {
      console.error("Socket connection failed:", error)
      setSocketConnected(false)
    }
  }, [chatRoomId, userId])

  const handleTyping = useCallback(
    (isTyping) => {
      if (!socketConnected || !chatRoomId) return

      if (isTyping) {
        socket.emit("typing_start", { chatRoomId })

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }

        // Set timeout to stop typing
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit("typing_stop", { chatRoomId })
        }, 3000)
      } else {
        socket.emit("typing_stop", { chatRoomId })
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
      }
    },
    [socketConnected, chatRoomId],
  )

  // Socket event handlers
  useEffect(() => {
    if (!socketConnected || !chatRoomId) return

    const handleUserTyping = (data) => {
      if (data.chatRoomId === chatRoomId && data.userId !== userId) {
        setTypingUsers((prev) => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId]
          }
          return prev
        })
      }
    }

    const handleUserStoppedTyping = (data) => {
      if (data.chatRoomId === chatRoomId) {
        setTypingUsers((prev) => prev.filter((id) => id !== data.userId))
      }
    }

    const handleUserStatusChanged = (data) => {
      setUserOnlineStatus(data.status)
    }

    socket.on("user_typing", handleUserTyping)
    socket.on("user_stopped_typing", handleUserStoppedTyping)
    socket.on("user_status_changed", handleUserStatusChanged)

    return () => {
      socket.off("user_typing", handleUserTyping)
      socket.off("user_stopped_typing", handleUserStoppedTyping)
      socket.off("user_status_changed", handleUserStatusChanged)
    }
  }, [socketConnected, chatRoomId, userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chatRoomId) {
        socket.emit("leave_chat_room", { chatRoomId })
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [chatRoomId])

  return {
    socket,
    socketConnected,
    typingUsers,
    userOnlineStatus,
    connectSocket,
    handleTyping,
  }
}
