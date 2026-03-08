import {useNavigation} from '@react-navigation/native';
import { Eye } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from 'react-native';
import { AWS_CDN_URL } from '../../../Utils/aws';


const ShoppableVideoTab = ({video}) => {
  const navigation = useNavigation(); // Assuming you're using React Navigation

  if (!video) return null;

  // useEffect(()=>{
  //   console.log(video?.host?.userInfo)
  // },[video])

  return (
     <View style={styles.gridContainer}>
    <TouchableWithoutFeedback
      onStartShouldSetResponder={() => false}
      onMoveShouldSetResponder={() => false}
     onPress={() =>
        navigation.navigate('reel', {id: video._id})
       // navigation.navigate('ShoppableVideoDetail', {id: video._id})
      }>
     
        <View style={styles.card}>
          <View style={styles.imageWrapper}>
            <Image
              source={{uri:video.thumbnailBlobName?`${AWS_CDN_URL}${video.thumbnailBlobName}`:'https://st4.depositphotos.com/15648834/23779/v/450/depositphotos_237795804-stock-illustration-unknown-person-silhouette-profile-picture.jpg'}}
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
          <View style={styles.topInfo}>
            <TouchableOpacity  onPress={() =>
                navigation.navigate('ViewSellerProdile', {
                  id: video?.host?.userInfo?.userName,
                })
              }>
            <View style={styles.sellerInfo}>
              {video?.host?.userInfo?.profileURL?.key ? (
                <Image
                  source={{uri:`${AWS_CDN_URL}${video?.host?.userInfo?.profileURL?.key}`}}
                  style={{height: 20, width: 20, borderRadius:1000}}
                />
              ) : (
                <TouchableOpacity style={styles.sellerProfile}>
                  <Text
                    style={{
                      textTransform: 'capitalize',
                      color: '#fff',
                      fontSize: 10,
                    }}>
                    {video?.host?.companyName?.charAt(0)||'S'}
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={styles.sellerText}>{video?.host?.companyName || 'Unknown'}</Text>
            </View>
            {/* <Image
              source={require('../../../assets/images/video.png')}
              style={{height: 20, width: 20}}
            /> */}
            </TouchableOpacity>
          </View>
          <View style={styles.bottomInfo}>
            <Eye size={13} color={'#fff'}/>
            <Text style={{color:'#fff',fontWeight:'600',fontSize:11}}>2K</Text>
          </View>
        </View>
      
    </TouchableWithoutFeedback>
    </View>
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
    justifyContent: 'space-between',
    width: '90%',
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
  },
  sellerText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    height: 230,
    
    // backgroundColor: '#777',
  },
  image: {
    width: '100%',
    // backgroundColor:'#777',
    height: '100%',
    resizeMode: 'cover',
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

export default React.memo(ShoppableVideoTab);
