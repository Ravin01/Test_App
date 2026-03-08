"use client"

import { useState, useEffect, useCallback } from "react"
import axiosInstance from "../../../Utils/Api"
import { Toast } from "../../../Utils/dateUtils"

export const useBlockStatus = (participants, currentUserId) => {
  const [blockStatus, setBlockStatus] = useState({
    isBlocked: false,
    blockedByCurrentUser: false,
    blockedByOtherUser: false,
    blockMessage: null,
    canUnblock: false,
  })

  const otherParticipant = participants?.find((p) => p?.userId?._id && p.userId._id !== currentUserId)

  const checkBlockStatus = useCallback(async () => {
    if (!otherParticipant) return

    try {
      const response = await axiosInstance.get(`/chat/blocked-status/${otherParticipant.userId._id}`)
      if (response.data.status) {
        setBlockStatus(response.data.data)
      }
    } catch (error) {
      console.error("Error checking block status:", error)
    }
  }, [otherParticipant])

  const handleBlockUser = useCallback(async () => {
    if (!otherParticipant) return

    try {
      const endpoint = `/chat/block/${otherParticipant.userId._id}`

      if (blockStatus.blockedByCurrentUser) {
        // Unblock user
        await axiosInstance.delete(endpoint)
        setBlockStatus({
          isBlocked: false,
          blockedByCurrentUser: false,
          blockedByOtherUser: false,
          blockMessage: null,
          canUnblock: false,
        })
        Toast("User unblocked successfully")
      } else {
        // Block user
        await axiosInstance.post(endpoint, {
          reason: "Blocked from chat",
          blockType: "block",
        })
        setBlockStatus({
          isBlocked: true,
          blockedByCurrentUser: true,
          blockedByOtherUser: false,
          blockMessage: "You have blocked this user. Messages cannot be sent or received.",
          canUnblock: true,
        })
        Toast("User blocked successfully")
      }
    } catch (error) {
      console.error("Error blocking/unblocking user:", error)
      Toast(error.response?.data?.message || "Failed to block/unblock user")
    }
  }, [otherParticipant, blockStatus.blockedByCurrentUser])

  useEffect(() => {
    checkBlockStatus()
  }, [checkBlockStatus])

  return {
    blockStatus,
    handleBlockUser,
  }
}
