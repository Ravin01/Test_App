/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import FontAwesome icons
import {useFocusEffect} from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import * as Animatable from 'react-native-animatable';
import api from '../../Utils/Api';
import FastImage from 'react-native-fast-image';
import { colors } from '../../Utils/Colors';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';


const Shows=React.memo(({navigation})=> {
  const [shows, setShows] = useState([]);
  const [filteredShows, setFilteredShows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuerry, setSearchQuerry] = useState('');
  const [pagenation, setpageination] = useState({hasMore: true, limit: 20, currentPage: 1});
    const [isInitialLoad, setIsInitialLoad] = useState(true); 
  const renderShow =(({item}) => {
    // console.log(item)
    return (
      <View style={styles.showCard}>
        <FastImage source={{uri: item.thumbnailImageURL,priority: FastImage.priority.normal,}} style={styles.thumbnail} />
        <View
          style={{
            flexDirection: 'row',
            position: 'absolute',
            gap: item.showStatus=="live"? 55:15,
            left: 10,
            alignItems: 'center',
            top: 15,
            justifyContent: 'space-between',
          }}>
          <Text
            style={{
              borderRadius: 10,
              paddingHorizontal: 5,
              // paddingVertical: 5,
              height: 20,
              backgroundColor: item.showStatus=="live"?'red':'#333',
              color: 'white',
            }}>
           {item.showStatus=="live"?'Live':'UpComing'}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: 'white',
              // borderWidth: 1,
              // borderColor: '#ccc',
              borderRadius: 20,
              alignItems: 'center',
              padding: 5,
            }}>
            <AntDesign name="heart" size={15} color={'red'}/>
          </TouchableOpacity>
        </View>
        <View style={styles.showContent}>
          <Text style={styles.title}>{item.title}</Text>
         

          <View style={[styles.detailsRow, {justifyContent: 'space-evenly'}]}>
            <View style={styles.detailsRow}>
              <Icon name="thumbs-up" size={14} color="#555" />
              <Text style={styles.likes}> {item.likes}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Icon name="language" size={14} color="#555" />
              <Text style={styles.language}> {item.language}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Icon name="clock-o" size={14} color="#555" />
              <Text style={styles.time}> {item.time}</Text>
            </View>
          </View>
          <View style={styles.selectedTagsContainer}>
            {item?.tags?.length > 0 ? (
              item?.tags?.map((tag, index) => (
                <Text key={index} style={styles.selectedTags}>
                  {tag}
                </Text>
              ))
            ) : (
              // <Text style={styles.noTags}>No Tags</Text>
              null
            )}
          </View>
          {/* {console.log("Navigate to stream URL: ", item)} */}
          <TouchableOpacity style={[styles.detailsRow,{}]}    onPress={() => {
              navigation.navigate('SellerInfo', {id:item?.sellerUserName});
            }}>
              {item.sellerProfileURL?<Image
              source={{uri: item.sellerProfileURL}}
              style={styles.avatar}
              />:  <TouchableOpacity style={styles.avatar}>
              <Text style={{color:'white',fontWeight:'500',textTransform:'capitalize'}}>{item?.sellerUserName?.charAt(0)}</Text>
            </TouchableOpacity>}
          
            <View>
            <Text style={styles.category}>{item?.sellerCompanyName}</Text>
            <Text style={{color:'#777',fontSize:11}}>@{item?.sellerUserName}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.watchButton}
            onPress={() => {
              // console.log("Navigate to stream URL: ", item.streamUrl);
              navigation.navigate('LiveScreen', {stream: item});
            }}>
            <Icon name="play" color="white" size={17} />
            <Text style={styles.watchButtonText}>Watch Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  });
  const fetchShows = async () => {
        
    if (!isInitialLoad || !pagenation?.hasMore) return;
        // setLoading(true);
        if(pagenation.currentPage===1){
          setLoading(true);
        }
        try {
          // const response = await api.get('/shows/live');
          // const response = await api.get('/live/shows/get');
          // const response = await api.get('/live/shows');
          const response = await api.get('/search/shows');     
          // console.log(response.data)
            
          setpageination(response.data?.pagination);
          setShows(response.data.data);
          // console.log(response.data.messae)
        } catch (error) {
          console.log('Error while fetching shows:', error);
        } finally {
          setLoading(false);
          setIsInitialLoad(false); // Set to false after the initial load
        }
      };
  useEffect(() => {
fetchShows();
 },[] );
   useEffect(() => {
      
      if (searchQuerry) {
        const query = searchQuerry.toLowerCase();
        setFilteredShows(
          shows?.filter(p => 
            p?.title?.toLowerCase()?.includes(query) || 
            p?.category?.toLowerCase()?.includes(query) ||
            p?.subCategory?.toLowerCase()?.includes(query)
          )
        );
      } else {
        setFilteredShows(shows);
      }
    }, [shows, searchQuerry]);
// console.log(shows)
  return (
    <>
      <View style={styles.container}>
        {loading ? (
          null
        ) : (
          <FlatList
            data={filteredShows}
            renderItem={renderShow}
            onEndReached={fetchShows}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <>
                <View style={styles.inputContainer}>
                  <AntDesign name="search1" size={20} color='#777' />
                  <TextInput
                    placeholder="search by name, category, subCategory "
                    placeholderTextColor={'#777'}
                    value={searchQuerry}
                    onChangeText={setSearchQuerry}
                  />
                </View>
              </>
            }
            ListEmptyComponent={
              <View style={{marginTop: 100, justifyContent: 'center', flex: 1}}>
                <Animatable.View
                  animation={'pulse'}
                  iterationCount="infinite"
                  style={{alignItems: 'center', gap: 10}}>
                  <AntDesign
                    name="notification"
                    size={25}
                    color="#777"
                  />
                  <Text style={{fontSize: 16, color: '#777',fontWeight:'500'}}>
                    No Shows Available
                  </Text>
                  <Text style={{color:'#777',fontWeight:'500'
                  }}>Currently there are now shows available. </Text>
                </Animatable.View>
              </View>
            }
            ListFooterComponent={<View style={{height: 100}} />}
            keyExtractor={item => item._id}
          />
        )}
      </View>
    
    </>
  );
})

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  avatar:{
    height:27,
    width:27,
    backgroundColor:'red',
    borderRadius:20,
    alignItems:'center',
    justifyContent:'center'

  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.SecondaryColor,
    borderRadius: 5,
    height: 50,
    // justifyContent: 'space-between',

    marginBottom: 20,
    paddingHorizontal: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9dd7c',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
    paddingVertical: 8,
    width: 100,
    marginBottom: 20,
  },
  showCard: {
    flexDirection: 'row',
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    marginBottom: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    gap:10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  thumbnail: {
    width: 130,
    height: 180,
    resizeMode: 'cover',
    borderRadius: 10,
    backgroundColor:'#333'
    // marginRight: 15,
  },
  showContent: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#fff',
  },
  category: {
    fontSize: 14,
    color: '#777',
    // marginVertical: 5,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  language: {
    fontSize: 12,
    color: '#555',
  },
  time: {
    fontSize: 12,
    color: '#555',
  },
  likes: {
    fontSize: 12,
    color: '#555',
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  selectedTags: {
    color: '#777',
    fontSize: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
  noTags: {
    fontSize: 12,
    color: '#aaa',
  },
  watchButton: {
    backgroundColor: '#333',
    borderRadius: 5,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
    marginTop: 15,
  },
  watchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default Shows;
