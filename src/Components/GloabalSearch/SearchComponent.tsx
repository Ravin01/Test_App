import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dimensions, StyleSheet,  TextInput,View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
// import Header from '../Reuse/Header';


const { width, height } = Dimensions.get('window');
export default function SearchComponent({ searchTerm, setSearchTerm,placeholder="Search an categories..." }) {
  
  // Use a single state variable and useMemo for debouncing
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');
  // console.log(searchTerm)
  // Use useRef to keep track of the debounce timer
  const debounceTimerRef = useRef(null);
  
  // Handle search input change
  const handleSearchChange = useCallback((text) => {
    setLocalSearchTerm(text);
    
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      setSearchTerm(text);
    }, 700);
  }, [setSearchTerm]);
  
  // Handle cancel/clear button press
  const handleCancelPress = useCallback(() => {
    setLocalSearchTerm('');
    setSearchTerm('');
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [setSearchTerm]);
  
  // Sync local state when parent state changes (if needed)
  useEffect(() => {
    if (searchTerm !== localSearchTerm) {
      setLocalSearchTerm(searchTerm);
    }
  }, [searchTerm]);
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  //  const fullPlaceholder = "Search for products categories...";
  // const [placeholder, setPlaceholder] = useState("Search an categories...");
  
  // useEffect(() => {
  //   let index = 0;
  //   const typingSpeed = 100; // milliseconds per character
  //   const interval = setInterval(() => {
  //     setPlaceholder((prev) => prev + fullPlaceholder[index]);
  //     index++;
  //     if (index < fullPlaceholder.length) {
  //       clearInterval(interval);
  //     }
  //   }, typingSpeed);
    
  //   return () => clearInterval(interval); // cleanup on unmount
  // }, []);
  
  return (
    <View style={styles.container}>
      {/* <Header/> */}
           <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#8B8B8B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={placeholder}
                value={localSearchTerm}
                onChangeText={handleSearchChange}
                placeholderTextColor="#8B8B8B"
              />
              {/* <TouchableOpacity style={{padding:5}}>
                <Ionicons name="options-outline" size={20} color="#8B8B8B" />
              </TouchableOpacity> */}
            </View>
      {/* <Searchbar
        style={styles.searchBar}
        placeholder="Search Here"
        value={localSearchTerm}
        onChangeText={handleSearchChange}
        placeholderTextColor="#777"
        
        onClearIconPress={handleCancelPress}
        iconColor="#000"
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1, // Ensure it's flexible for any layout
    height:50,
    marginHorizontal:10,
    justifyContent: 'center', // Center vertically
    // marginTop:10
    
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: height * 0.015,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B38728',
    paddingHorizontal: width * 0.025,
    marginHorizontal: width * 0.01,
  },
  searchIcon: {
    marginRight: width * 0.02,
  },
  searchInput: {
    flex: 1,
    height: height * 0.05,
    color: 'white',
  },
  searchBar: {
    height: 50, // Adjust the height
    borderWidth: 1, 
    borderRadius: 8, // Adjust border radius for rounded corners
    borderColor: '#ccc', // Light border color for the search bar
    paddingLeft: 5, // Padding inside the search bar (to avoid text touching edges)
    fontSize: 16, // Font size for the search text
    elevation: 3, // Optional: Add shadow to the search bar
  },
});
