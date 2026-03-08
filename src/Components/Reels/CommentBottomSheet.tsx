import React, {useRef, useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ToastAndroid,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import {
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import Icon from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../../Utils/Api';
import {AWS_CDN_URL} from '../../Utils/aws';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MessageCircleOff, Smile, Trash} from 'lucide-react-native';
import { colors } from '../../Utils/Colors';
import { useNavigation } from '@react-navigation/native';


const CommentBottomSheet = ({isOpen, onClose, videoId, item}) => {
  const refRBSheet = useRef();
  const navigation=useNavigation()
  const hostId = item?.host?.userInfo?._id;
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState({reply:false,add:false});
  const [loadingReplies, setLoadingReplies] = useState(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [userId, setUserId] = useState('');
  useEffect(() => {
    if (isOpen && refRBSheet.current) {
      refRBSheet.current.open();
      if (videoId && comments?.length === 0) {
        fetchComments(true);
      }
    } else if (!isOpen && refRBSheet.current) {
      refRBSheet.current.close();
    }
  }, [isOpen]);

  const toast = msg => {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  };
  // console.log(userId)
  // Fetch comments from backend
  const fetchComments = async (reset = false) => {
    if (!videoId || isLoading) return;

    try {
      setIsLoading(true);
      const currentPage = reset ? 1 : page;
      const id = (await AsyncStorage.getItem('userId')) || '';

      setUserId(id);
      const response = await axiosInstance.get(
        `/shoppable-videos/${videoId}/comments`,
        {
          params: {page: currentPage, limit: 20},
        },
      );

      // Normalize comment data - Backend sends userId populated data
      const normalizedComments = response?.data?.data?.comments.map(comment => ({
        ...comment,
        // Backend sends 'userId' populated, frontend expects 'user'
        user: comment.userId || {
          _id: 'unknown-user',
          name: 'Unknown User',
          profileURL: {},
          userName: 'unknown',
        },
        isLiked: comment.isLiked || false,
        likes: comment.likes || 0,
        repliesCount: comment.repliesCount || 0,
        replies: comment.replies || [],
      }));

      if (reset) {
        setComments(normalizedComments);
        setPage(2);
      } else {
        setComments(prev => [...prev, ...normalizedComments]);
        setPage(currentPage + 1);
      }
      // console.log(response.data)
      setHasMore(response?.data?.data?.hasMore);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };
  // console.log(comments)

  // Load more comments (pagination)
  const loadMoreComments = async () => {
    if (!hasMore || isLoadingMore || isLoading) return;

    setIsLoadingMore(true);
    await fetchComments(false);
    setIsLoadingMore(false);
  };

  // Add new comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !videoId) return;
    setIsSending(prev=>({...prev,
      add:true}));
    try {
      const response = await axiosInstance.post(
        `/shoppable-videos/${videoId}/comments`,
        {
          text: newComment,
        },
      );

      // Normalize the new comment data
      const normalizedComment = {
        ...response.data.data,
        user: response.data.data.userId || {
          _id: 'unknown-user',
          name: 'Unknown User',
          profileURL: {},
          userName: 'unknown',
        },
        isLiked: false,
        likes: 0,
        repliesCount: 0,
        replies: [],
      };

      setComments(prev => [normalizedComment, ...prev]);
      setNewComment('');
      toast('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast('Failed to add comment');
    }finally{ setIsSending(prev=>({...prev,
      add:false}));}
  };

  // Like/Unlike comment or reply
  const handleLike = async (
    commentId,
    isReply = false,
    parentCommentId = null,
  ) => {
    try {
      const response = await axiosInstance.post(
        `/shoppable-videos/comments/${commentId}/like`,
      );

      if (isReply && parentCommentId) {
        setComments(prev =>
          prev.map(comment => {
            if (comment._id === parentCommentId) {
              return {
                ...comment,
                replies: comment.replies.map(reply => {
                  if (reply._id === commentId) {
                    return {
                      ...reply,
                      likes: response.data.data.likes,
                      isLiked: response.data.data.isLiked,
                    };
                  }
                  return reply;
                }),
              };
            }
            return comment;
          }),
        );
      } else {
        setComments(prev =>
          prev.map(comment => {
            if (comment._id === commentId) {
              return {
                ...comment,
                likes: response.data.data.likes,
                isLiked: response.data.data.isLiked,
              };
            }
            return comment;
          }),
        );
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast('Failed to like comment');
    }
  };

  // Add reply to comment
  const handleReply = async commentId => {
    if (!replyText.trim() || !commentId) return;

    try {
      setIsSending(prev=>({...prev,
      reply:true}));
      const response = await axiosInstance.post(
        `/shoppable-videos/comments/${commentId}/reply`,
        {
          text: replyText,
        },
      );

      // Normalize reply data
      const normalizedReply = {
        ...response.data.data,
        user: response.data.data.userId || {
          _id: 'unknown-user',
          name: 'Unknown User',
          profileURL: {},
          userName: 'unknown',
        },
        isLiked: false,
        likes: 0,
      };

      // Update the comment with the new reply
      setComments(prev =>
        prev.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              repliesCount: comment.repliesCount + 1,
              replies: comment.replies
                ? [normalizedReply, ...comment.replies]
                : [normalizedReply],
            };
          }
          return comment;
        }),
      );

      setReplyText('');
      setReplyingTo(null);
      toast('Reply added successfully');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast('Failed to add reply');
    }finally{
      setIsSending(prev=>({...prev,
      reply:false}));
    }
  };

  // Delete comment or reply
  const handleDeleteComment = async () => {
    if (!deleteItem) return;

    try {
      await axiosInstance.delete(`/shoppable-videos/comments/${deleteItem.id}`);

      if (deleteItem.isReply && deleteItem.parentId) {
        setComments(prev =>
          prev.map(comment => {
            if (comment._id === deleteItem.parentId) {
              return {
                ...comment,
                repliesCount: comment.repliesCount - 1,
                replies: comment.replies.filter(
                  reply => reply._id !== deleteItem.id,
                ),
              };
            }
            return comment;
          }),
        );
      } else {
        setComments(prev =>
          prev.filter(comment => comment._id !== deleteItem.id),
        );
      }

      setShowDeleteModal(false);
      setDeleteItem(null);
      toast('Comment deleted successfully');
    } catch (error) {
      console.log('Error deleting comment:', error.response.data
      );
      toast(error.response.data.message);
    }
  };
  const formatCount = useCallback((count) => {
    if (!count|| count<0) return '0';
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
    } else if (count >= 100000) {
      return (count / 100000).toFixed(1).replace('.0', '') + 'L';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    return count.toString();
  }, []);
  // Fetch replies for a comment
  const fetchReplies = async commentId => {
    if (loadingReplies.has(commentId)) return;

    try {
      setLoadingReplies(prev => new Set(prev).add(commentId));
      const response = await axiosInstance.get(
        `/shoppable-videos/comments/${commentId}/replies`,
      );

      // Normalize replies data
      const normalizedReplies = response.data.data.replies.map(reply => ({
        ...reply,
        user: reply.userId || {
          _id: 'unknown-user',
          name: 'Unknown User',
          profileURL: {},
          userName: 'unknown',
        },
        isLiked: reply.isLiked || false,
        likes: reply.likes || 0,
      }));

      setComments(prev =>
        prev.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              replies: normalizedReplies,
            };
          }
          return comment;
        }),
      );

      setExpandedComments(prev => new Set(prev).add(commentId));
    } catch (error) {
      console.error('Error fetching replies:', error);
      toast('Failed to load replies');
    } finally {
      setLoadingReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  // Toggle replies visibility
  const toggleReplies = commentId => {
    const comment = comments.find(c => c._id === commentId);

    if (expandedComments.has(commentId)) {
      // Hide replies
      setExpandedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    } else {
      // Show replies - fetch if not already loaded
      if (!comment.replies || comment.replies.length === 0) {
        fetchReplies(commentId);
      } else {
        setExpandedComments(prev => new Set(prev).add(commentId));
      }
    }
  };

  const showDeleteConfirm = item => {
    setDeleteItem(item);
    setShowDeleteModal(true);
  };

  const formatTimeAgo = date => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInMinutes = Math.floor((now - commentDate) / (1000 * 60));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const renderReply = (reply, parentCommentId) => (
     <TouchableWithoutFeedback   onStartShouldSetResponder={() => false}
      onMoveShouldSetResponder={() => false}>
    <View key={reply._id} style={styles.replyContainer}>
      <View style={styles.replyContent}>
        <View style={styles.replyHeader}>
          {  reply.user.profileURL?.key?
          <Image
            source={
              reply.user.profileURL?.key
                ? {uri: `${AWS_CDN_URL}${reply.user.profileURL?.key}`}
                : undefined
            }
            style={styles.replyAvatar}
          />:<View style={styles.replyAvatar}>
            <Text style={{color:'#fff',fontSize:18,fontWeight:'bold'}}>{reply?.user?.chatAt(0)}</Text>
            </View>}
          <View style={styles.replyInfo}>
            <View style={styles.replyUserInfo}>
              <Text style={styles.replyUsername}>
                {reply.user.name || reply.user.userName}
              </Text>
              <Text style={styles.timeAgo}>
                {formatTimeAgo(reply.createdAt)}
              </Text>
            </View>
            <Text style={styles.replyText}>{reply.text}</Text>
          </View>
        </View>
        <View style={styles.replyActions}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleLike(reply._id, true, parentCommentId)}>
            <Icon
              name={reply.isLiked ? 'heart' : 'heart-outline'}
              size={16}
              color={reply.isLiked ? '#FF6B6B' : 'white'}
            />
            <Text style={styles.likeCount}>{formatCount(reply.likes)}</Text>
          </TouchableOpacity>
          {/* Add delete button for user's own replies */}
          {/* {console.log(item?.host?.userInfo?._id)} */}
          {userId == hostId && (
            <TouchableOpacity
              onPress={() =>
                showDeleteConfirm({
                  id: reply._id,
                  isReply: true,
                  parentId: parentCommentId,
                })
              }
              style={styles.deleteButton}>
              <Icon name="trash-outline" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
    </TouchableWithoutFeedback>
  );

  const renderComment = ({item}) => (
    <TouchableWithoutFeedback   onStartShouldSetResponder={() => false}
      onMoveShouldSetResponder={() => false}>
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        {/* {console.log(item?.user)} */}
        {item?.user?.profileURL?.key?
        <Image
          source={
            item?.user?.profileURL?.key
              ? {uri: `${AWS_CDN_URL}${item?.user?.profileURL?.key}`}
              : undefined
          }
          style={styles.avatar}
        />:<View style={styles.avatar}>
            <Text style={{color:'#fff',fontSize:18}}>{item?.user?.name?.charAt(0)}</Text>
          </View>}
        <View style={styles.commentInfo}>
          <View style={styles.userInfo}>
            <Text style={styles.username}>
              {item.user.name || item.user.userName}
            </Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
        </View>
      </View>

      <View style={styles.commentActions}>
        <TouchableOpacity
          style={[styles.likeButton,{marginRight:10}]}
          onPress={() => handleLike(item._id)}>
          <Icon
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={item.isLiked ? '#FF6B6B' : 'white'}
          />
          <Text style={styles.likeCount}>{formatCount(item.likes)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => setReplyingTo(item._id)}>
          <Icon name="chatbubble-outline" size={16} color="white" />
          <Text style={styles.replyButtonText}>Reply</Text>
        </TouchableOpacity>
        {/* {console.log(userId,item?.host?.userInfo?._id)} */}
        {/* Add delete button for user's own comments */}
        {userId == hostId && (
          <TouchableOpacity
            onPress={() => showDeleteConfirm({id: item._id, isReply: false})}
            style={styles.deleteButton}>
              {/* <Trash/> */}
            <Icon name="trash-outline" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      {item.repliesCount > 0 && (
        <TouchableOpacity
          style={styles.viewRepliesButton}
          onPress={() => toggleReplies(item._id)}>
          <Text style={styles.viewRepliesText}>
            {expandedComments.has(item._id) ? 'Hide' : 'View'}{' '}
            {formatCount(item.repliesCount)} replies
          </Text>
          {loadingReplies.has(item._id) ? (
            <ActivityIndicator size="small" color="#888" style={{marginLeft:5}}/>
          ) : (
            <Icon
              name={
                expandedComments.has(item._id) ? 'chevron-up' : 'chevron-down'
              }
              size={16}
              color="#888"
            />
          )}
        </TouchableOpacity>
      )}
{item.replies.map((reply, index) =>
  <React.Fragment key={reply._id || `${item._id}-reply-${index}`}>
    {renderReply(reply, item._id)}
  </React.Fragment>
)}

      {replyingTo === item._id && (
        <View style={styles.replyInputContainer}>
          <TextInput
            placeholder={`Reply to ${item.user.name || item.user.userName}...`}
            placeholderTextColor="#999"
            style={styles.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            multiline
          />
          <View style={styles.replyInputActions}>
            <TouchableOpacity
              onPress={() => setReplyingTo(null)}
              style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleReply(item._id)}
              style={styles.sendReplyButton}>
                 {isSending.reply?<ActivityIndicator size={'small'} color={'#fff'}/>:
              <Text style={styles.sendReplyButtonText}>Send</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
    </TouchableWithoutFeedback>
  );

  const renderFooter = () => {
    // if (!isLoadingMore) return null;
    return (
      <>
        {isLoadingMore && (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Loading more comments...</Text>
          </View>
        )}
      </>
    );
  };

  //  useEffect(() => {
  //     const onBackPress = async () => {
  //       console.log('works')
  //       if(isOpen){
  //     onClose()
  //     return}
  //       // if (navigation.canGoBack()) {
  //       //   navigation.goBack();
  //       //   return true;
  //       // }
       
  //     }
  //     const backHandler = BackHandler.addEventListener(
  //       'hardwareBackPress',
  //       onBackPress,
  //     );
  
  //     return () => backHandler.remove();
  //   }, [navigation,isOpen,onClose]);
  

  return (
    <>
      <RBSheet
        ref={refRBSheet}
        height={Dimensions.get('window').height * 0.6}
        openDuration={250}
        closeOnDragDown
        dragOnContent
        draggable
        closeOnPressBack
        onClose={onClose}
        customStyles={{
          wrapper: {backgroundColor: 'rgba(0,0,0,0.5)'},
          draggableIcon: {backgroundColor: '#777'},
          container: {
            backgroundColor: '#2A2A2A',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 0,
          },
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{flex: 1}}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} >
            <View style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.commentsLabel}>
                  Comments 
                </Text>
                {/* <TouchableOpacity onPress={onClose}>
                  <Icon name="close" size={24} color="white" />
                </TouchableOpacity> */}
              </View>
{comments?.length==0&& !isLoading &&<View style={styles.loadingContainer}>
                    <MessageCircleOff size={30} color='#fff'/>
                    <Text style={styles.emptyTitle}>No Comments yet</Text>
                  </View>}
              {isLoading  ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.loadingText}>Loading comments...</Text>
                </View>
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={(item,index) => index.toString()}
                  scrollEnabled={true}
                  renderItem={renderComment}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.commentsList}
                  onEndReached={loadMoreComments}
                
                  onEndReachedThreshold={0.1}
                  ListFooterComponent={renderFooter}
                />
              )}
              
              <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.emojiButton}>
                  <Smile color={'#fff'} />
                </TouchableOpacity>
                <TextInput
                  placeholder="Add a comment..."
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  style={styles.sendButton}>
                    {isSending.add?<ActivityIndicator size={'small'} color={'#fff'}/>:
                  <Icon name="send" size={20} color="white" />}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </RBSheet>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Comment</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleDeleteComment}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2A2A2A',
  },
  
  emptyContainer: {
    alignItems: 'center',
    // padding: 40,
    // flex:1,
    justifyContent:'center'
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    // borderBottomWidth: 1,
    // borderBottomColor: '#444',
  },
  commentsLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  commentsList: {
    paddingHorizontal: 16,
    // paddingBottom: 100,
  },
  commentContainer: {
    marginBottom: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
        backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFD700',
  },
  commentInfo: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
  },
  timeAgo: {
    color: '#888',
    fontSize: 12,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft:42
    // justifyContent:'space-evenly'
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginRight: 10,
  },
  likeCount: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  deleteButton: {
    padding: 4,
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 52,
  },
  viewRepliesText: {
    color: '#888',
    fontSize: 12,
    marginRight: 4,
  },
  replyContainer: {
    marginLeft: 52,
    marginTop: 8,
    backgroundColor:'#333',
    // elevation:1//,
    borderRadius: 8,
    padding: 12,
  },
  replyContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  replyHeader: {
    flexDirection: 'row',
    flex: 1,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
        backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFD700',
  },
  replyInfo: {
    flex: 1,
  },
  replyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyUsername: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 6,
  },
  replyText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginLeft: 8,
  },
  replyInputContainer: {
    marginLeft: 52,
    marginTop: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
  },
  replyInput: {
    color: '#fff',
    fontSize: 14,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  replyInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 12,
  },
  sendReplyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  sendReplyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    // position: 'absolute',
    // bottom: 0,
    // left: 0,
    // right: 0,
    backgroundColor: '#D9D9D945',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 20,
    // marginBottom: 10,
    margin:10,
    // paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#555',
  },
  emojiButton: {
    marginRight: 8,
  },
  emoji: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#555',
    borderRadius: 20,
    textAlignVertical: 'top',
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalMessage: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  modalCancelText: {
    color: '#888',
    fontSize: 14,
  },
  modalDeleteButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CommentBottomSheet;
