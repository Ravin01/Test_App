import { useCallback } from 'react'
import axiosInstance from './Api'
const pageLimit=20
export const useFollowApi = () => {
  const getFollowers = useCallback(async (userId, searchTerm, page) => {
    try {
      const response = await axiosInstance.get(
        `/follow/user-followers?userId=${userId}&userName=${searchTerm}&page=${page}&limit=${pageLimit}`
      )
      // console.log("followers response",response.data)
      return response.data
    } catch (err) {
      console.log('getFollowers error:', err?.response?.data || err.message)
      throw err
    }
  }, [])

  const getFollowing = useCallback(async (userId, searchTerm, page) => {
    try {
      const response = await axiosInstance.get(
        `/follow/user-followings?userId=${userId}&userName=${searchTerm}&page=${page}`
      )
      return response.data
    } catch (err) {
      console.log('getFollowing error:', err?.response?.data || err.message)
      throw err
    }
  }, [])

  const followUser = useCallback(async (userId) => {
    try {
      return await axiosInstance.post('/follow', { targetUserId: userId })
    } catch (err) {
      console.log('followUser error:', err?.response?.data || err.message)
      throw err
    }
  }, [])

  const unfollowUser = useCallback(async (userId) => {
    try {
      return await axiosInstance.delete('/follow', { data: { targetUserId: userId } })
    } catch (err) {
      console.log('unfollowUser error:', err?.response?.data || err.message)
      throw err
    }
  }, [])
  // ✅ Add checkFollowStatus here
  const checkFollowStatus = useCallback(async (userId) => {
    try {
      // const url = CHECK_FOLLOW_STATUS.replace(":targetUserId", userId);
      const response = await axiosInstance.get(`/follow/status/${userId}`);
      return response.data.data; // { isFollowing, followersCount }
    } catch (error) {
      console.log("Error checking follow status:", error.response.data,userId);
      // throw error;
    }
  }, []);
  const followUserReel = useCallback(async (userId) => {
    try {
      const response = await axiosInstance.post("follow", { targetUserId: userId });
      return response.data.data;
    } catch (error) {
      console.log("Error following user:", error);
      throw error;
    }
  }, []);

  const unfollowUserReel = useCallback(async (userId) => {
    try {
      const response = await axiosInstance.delete("follow", {
        data: { targetUserId: userId },
      });
      return response.data.data;
    } catch (error) {
      console.log("Error unfollowing user:", error.response.data,userId);
      throw error;
    }
  }, []);

  return { getFollowers, getFollowing, followUser, unfollowUser,checkFollowStatus,followUserReel,unfollowUserReel }
}