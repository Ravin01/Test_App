import {useNavigation} from '@react-navigation/native';
import { Eye } from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from 'react-native';
import { overlay } from '../../Utils/Colors';
import { AWS_CDN_URL } from '../../Utils/aws';
import { formatFollowerCount } from '../../Utils/dateUtils';
import { videoImg } from '../../assets/assets';


const VideoResults = ({video, error}) => {
  const navigation = useNavigation(); // Assuming you're using React Navigation
  if (!video || error) return null;
  // console.log(video)
  return (
    <TouchableWithoutFeedback
      onStartShouldSetResponder={() => false}
      onMoveShouldSetResponder={() => false}
      onPress={() =>
        navigation.navigate('reel', {id: video._id})
      }>
      <View style={styles.gridContainer}>
        <View style={styles.card}>
          <View style={[styles.imageWrapper ]}>
            <Image
              source={{uri:video.thumbnailBlobName?`${AWS_CDN_URL}${video.thumbnailBlobName}`:undefined}}
              style={styles.image}
              resizeMode='cover'
            />
            
          </View>
          {/* <View style={styles.contentContainer}>
          <Text style={styles.title}>{video?.title || 'No Title'}</Text>
          {video?.createdAt && (
            <Text style={styles.uploadDate}>
              Uploaded: {new Date(video.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View> */}
        <View style={overlay.cardOverlay}>
          <View style={styles.topInfo}>
           <TouchableOpacity style={styles.sellerInfo} onPress={()=>navigation.navigate('ViewSellerProdile', {id: video?.sellerUserName||video?.host?.userInfo?.userName})}>
            
              {video?.sellerProfileURL ? (
                <Image
                  source={{uri:`${AWS_CDN_URL}${video?.sellerProfileURL}`}}
                  style={{height: 20, width: 20,borderRadius:100}}
                />
              ) : (
                <TouchableOpacity style={styles.sellerProfile}>
                  <Text
                    style={{
                      textTransform: 'capitalize',
                      color: '#fff',
                      
                      fontSize: 10,
                    }}>
                    {video?.sellerCompanyName? video?.sellerCompanyName.charAt(0):video?.host?.companyName?.charAt(0)}
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={styles.sellerText} numberOfLines={1}>{video?.sellerCompanyName || video?.host?.companyName}</Text>
            </TouchableOpacity>



            <Image
              source={{uri:videoImg}}
              style={{height: 20, width: 20}}
            />
          </View>
        {/* {video?.viewCount>0&&<View style={styles.bottomInfo}>
            <Eye size={13} color={'#fff'}/>
            <Text style={{color:'#fff',fontWeight:'600',fontSize:11,textShadowColor: 'rgba(0, 0, 0, 0.8)',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,}}>{formatFollowerCount(video?.viewCount) || 0}</Text>
          </View>} */}
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    margin: 3,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    // borderColor: '#e1e1e1',
    backgroundColor: '#313236',
    // padding: 3,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: {width: 0, height: 1},
    shadowRadius: 2,
    elevation: 2,
  },
  bottomInfo:{
    position: 'absolute',
    top: 180,
    bottom: 0,
    left: 3,
    flexDirection:'row',
    alignItems:'center',gap:3
  },
  topInfo: {
    position: 'absolute',
    top: 10,
    bottom: 0,
    left: 3,
    flexDirection: 'row',
    // alignItems:'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  sellerProfile: {
    borderRadius: 20,
    height: 20,
    backgroundColor: '#435862',
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInfo: {
    flexDirection: 'row',
    gap: 5,
    height:30,
    // backgroundColor:'#000'
    // alignItems:'center'
    // alignItems:'center'
  },
  sellerText: {
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
  flexShrink:1,
  maxWidth:'88%',
  // backgroundColor:'rgba(0,0,0,0.3)',
    fontSize:10,marginTop:5,
  },
  card: {
    width: '100%',
  },
  imageWrapper: {
   // width: '100%',
    height: 230,
    // aspectRatio: 1,
    // borderWidth:3,
    // borderColor:'red',
    // backgroundColor: 'red',
  },
  image: {
    width: '100%',
    backgroundColor:'#777',
    height: '100%',
    
    // borderWidth:3,
    // borderColor:'yellow',
    // resizeMode: 'cover',
  },
  contentContainer: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  uploadDate: {
    fontSize: 12,
    color: '#7f7f7f',
    marginTop: 4,
  },
  playIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -15,
  },
});

export default VideoResults;
