import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Modal,
  ToastAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import axiosInstance from '../../Utils/Api';
import { colors } from '../../Utils/Colors';
import { Fashion, Beauty, Sports, Gifts, BabyKids, Electronics,
   HomeLiving, Food, Health, Books, Automobiles, Industrial, Pets, Gaming, Tools, Construction, Misc, Luxury, fashion } from '../../assets/assets';
import { Toast } from '../../Utils/dateUtils';


const { width } = Dimensions.get('window');

// Categories data with more descriptive categories
const CATEGORIES = [
  {
    id: 'cat1',
    value: 'Fashion & Accessories',
    iconPath: Fashion
  },
  {
    id: 'cat2',
    value: 'Beauty & Personal Care',
    iconPath: Beauty
  },
  {
    id: 'cat3',
    value: 'Sports & Fitness',
    iconPath: Sports
  },
  {
    id: 'cat4',
    value: 'Gifts & Festive Needs',
    iconPath: Gifts
  },
  {
    id: 'cat5',
    value: 'Baby & Kids',
    iconPath: BabyKids
  },
  {
    id: 'cat6',
    value: 'Electronics & Gadgets',
    iconPath: Electronics
  },
  {
    id: 'cat7',
    value: 'Home & Living',
    iconPath: HomeLiving
  },
  {
    id: 'cat8',
    value: 'Food & Beverages',
    iconPath: Food
  },
  {
    id: 'cat9',
    value: 'Health & Wellness',
    iconPath: Health
  },
  {
    id: 'cat10',
    value: 'Books, Hobbies & Stationery',
    iconPath: Books
  },
  {
    id: 'cat11',
    value: 'Automobiles & Accessories',
    iconPath: Automobiles
  },
  {
    id: 'cat12',
    value: 'Industrial & Scientific',
    iconPath: Industrial
  },
  {
    id: 'cat13',
    value: 'Pets',
    iconPath: Pets
  },
  {
    id: 'cat14',
    value: 'Gaming',
    iconPath: Gaming
  },
  {
    id: 'cat15',
    value: 'Tools & Hardware',
    iconPath: Tools
  },
  {
    id: 'cat16',
    value: 'Construction Materials',
    iconPath: Construction
  },
  {
    id: 'cat17',
    value: 'Miscellaneous',
    iconPath: Misc
  },
  {
    id: 'cat18',
    value: 'Luxury & Collectibles',
    iconPath: Luxury
  },
];

// Maximum number of categories that can be selected
const MAX_CATEGORIES = 18;

interface CategoriesScreenProps {
  categoryModalVisible: boolean;
  setCategoryModalVisible: (visible: boolean) => void;
  onCategoriesSelected?: (categories: string[]) => void;
}

const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  categoryModalVisible,
  setCategoryModalVisible,
}) => {
  // State to manage selected categories
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Handler to toggle category selection
  const handleCategoryPress = useCallback((categoryValue: string) => {
    setSelectedCategories(prev => {
      const updated = new Set(prev);
      if (updated.has(categoryValue)) {
        updated.delete(categoryValue);
      } else {
        // Prevent selecting more than MAX_CATEGORIES
        if (updated.size < MAX_CATEGORIES) {
          updated.add(categoryValue);
        } else {
          // Optional: Add an alert or toast to inform user of max selection
          ToastAndroid.show(`You can select a maximum of ${MAX_CATEGORIES} categories`,ToastAndroid.SHORT);
        }
      }
      return updated;
    });
  }, []);

  // Submit selected categories
  const submitCategories = async () => {
    try {
      const categoriesArray = Array.from(selectedCategories);
      const payload = { categories: categoriesArray };
      
      const response = await axiosInstance.post('/user/categories/add', payload);
    ToastAndroid.show(response.data.message,ToastAndroid.SHORT)
      // Close modal
      setCategoryModalVisible(false);
    } catch (err) {
      Toast(err.response.data.message || 'Failed to submit categories');
      console.log('Submit Error:', err.response.data);
      // Optional: Add error handling (e.g., show error toast)
    }finally{
        setCategoryModalVisible(false);
    }
  };

  // Memoized category render item
  const renderCategoryItem = useCallback(({ item }) => {
    const isSelected = selectedCategories.has(item.value);
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleCategoryPress(item.value)}
      >
	  <LinearGradient
    colors={isSelected?['#F7CE45','#F7CE45']:['rgba(255,255,255,0)', 'rgba(245,245,245,0.29)']}
    start={{ x: 0.5, y: 0 }}
    end={{ x: 0.5, y: 1 }}
    style={styles.categoryContainer}
  >
	    <View
  style={[
    styles.imageWrapper,
    isSelected && { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
  ]}
>
        <FastImage
          source={{ uri: item.iconPath }}    //item.image
          style={styles.categoryImage}
          resizeMode={FastImage.resizeMode.contain}
        />
		 </View>
         <Text 
          style={[
            styles.categoryLabel, 
            isSelected && styles.selectedCategoryLabel
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.value}
        </Text> 
		</LinearGradient>
      </TouchableOpacity>
    );
  }, [selectedCategories, handleCategoryPress]);

  // Render
  return (
    <View style={{height:'90%',justifyContent:'center',position: 'relative'}}>
    <Modal    
      visible={categoryModalVisible}
      onRequestClose={() => {
      //  setCategoryModalVisible(false) // Disable default close on back button
      }
      }
      onDismiss={() => setCategoryModalVisible(false)}
      style={styles.modal}
      animationType='slide'
    >
      <View style={{width: '100%', height: 55, backgroundColor: '#f7ce45', marginBottom: 0,
        alignItem: 'center', justifyContent: 'center'
      }}>
        <Text style= {{alignSelf: 'center', fontSize: 20,fontWeight: '500', lineHeight: 20}}>Category</Text>
      </View>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>
          "Let's Set Up Your Shop"
        </Text>

         <Text style={styles.subTitle}>
          Pick the categories that match your products{'\n'}
          You can always update this later
        </Text>

        {/* <Text style={styles.modalTitle}>
          Select Your Interests 
          <Text style={styles.categoryCount}>
            {` (${selectedCategories.size}/${MAX_CATEGORIES})`}
          </Text>
        </Text> */}
        
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryItem}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.categoriesGrid}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
        
        <TouchableOpacity
          style={[
            styles.submitButton, 
            selectedCategories.size === 0 && styles.submitButtonDisabled,
             { position: 'absolute', bottom: 80, left: 20, right: 20 }
          ]}
          onPress={submitCategories}
          disabled={selectedCategories.size === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            NEXT
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modal: {
    // justifyContent: 'flex-end',
    // margin: 20,
    // backgroundColor:'red'
  },
  modalContent: {
    backgroundColor: colors.primaryColor,
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 124,     //80,
    height:'100%',
  },
  modalTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
    subTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#eee',
    marginBottom: 25,
    //marginTop: 16,
    alignSelf: 'center',
    textAlign: 'center'
  },
  categoryCount: {
    color: '#f7ce45',   //'#FF6B00',
    fontSize: 16,
  },
  categoriesGrid: {
    paddingHorizontal: 26,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  categoryContainer: {
	  width: (width - width * 0.08 * 2) / 3,
    //width: width * 0.38,
    aspectRatio: 1,
    backgroundColor: 'transparent',   //'#2A2A2A',
     borderRadius: 14,
     overflow: 'hidden',
     alignItems: 'center',
     justifyContent: 'center',
    // marginBottom: 10,
    // borderWidth: 2,
     borderColor: 'transparent',
  },
  selectedCategory: {
   // borderColor: '#f7ce45',   //'#FF6B00',
   // backgroundColor: '#f7ce4580',  //'#f7ce45'
   backgroundColor: '#f7ce45'
  },
  categoryImage: {
    width: '99%',
    height: '99%',
    borderRadius: 10,
    resizeMode: 'cover',
  },
  categoryLabel: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 5,
    marginTop: 5,
  },
  selectedCategoryLabel: {
    color: '#000'   //'#f7ce45',    //'#FF6B00',
  },
  submitButton: {
    backgroundColor: '#f7ce45',   //'#FF6B00',
    paddingVertical: 15,
    marginHorizontal: 60,
    borderRadius: 10,  //25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#666666',
  },
  submitButtonText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
    imageWrapper: {
  width: '50%',
  aspectRatio: 1,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  borderRadius: 1000, // large number to ensure it's a circle
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
  padding: 4
},
});

export default CategoriesScreen;
