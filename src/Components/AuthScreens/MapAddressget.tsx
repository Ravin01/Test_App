import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { ChevronLeft, MapPin, Navigation, Edit3 } from 'lucide-react-native';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const MapDeliveryAddressScreen = ({navigation}) => {
  const [region, setRegion] = useState({
    latitude: 13.0827,
    longitude: 80.2707,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('25th Phoenix Towers, Indira Nagar, Chennai, Tamil Nadu 600038, India');
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [mapError, setMapError] = useState(null);
  
  const mapRef = useRef(null);
  const watchId = useRef(null);
  const isMounted = useRef(true);

  // Cleanup 
/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/

// function
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (watchId.current) {
        try {
          Geolocation.clearWatch(watchId.current);
        } catch (error) {
          console.log('Error clearing watch:', error);
        }
      }
    };
  }, []);

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        await requestLocationPermission();
      } catch (error) {
        console.error('Error initializing location:', error);
        setMapError('Failed to initialize location services');
      }
    };
    
    initializeLocation();
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to show your current position on the map.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasLocationPermission(true);
          // getCurrentLocation();
        } else {
          setHasLocationPermission(false);
          console.log('Location permission denied');
        }
      } else {
        // For iOS
        const result = await Geolocation.requestAuthorization('whenInUse');
        if (result === 'granted') {
          setHasLocationPermission(true);
          getCurrentLocation();
        } else {
          setHasLocationPermission(false);
        }
      }
    } catch (error) {
      console.error('Permission error:', error);
      setHasLocationPermission(false);
    }
  };

  const getCurrentLocation = useCallback(() => {
    if (isLoading || !isMounted.current) return;
    
    setIsLoading(true);
    setMapError(null);
    
    try {
      Geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted.current) return;
          
          try {
            const { latitude, longitude } = position.coords;
            
            // Validate coordinates
            if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
              throw new Error('Invalid coordinates received');
            }
            
            const newRegion = {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            
            setRegion(newRegion);
            setSelectedLocation({ 
              latitude: parseFloat(latitude), 
              longitude: parseFloat(longitude) 
            });

            // Animate to region only if map is ready
            setTimeout(() => {
              if (isMapReady && mapRef.current && isMounted.current) {
                try {
                  mapRef.current.animateToRegion(newRegion, 1000);
                } catch (animationError) {
                  console.log('Animation error:', animationError);
                }
              }
            }, 100);
            
          } catch (error) {
            console.error('Error processing location:', error);
            setMapError('Unable to process your location');
          } finally {
            if (isMounted.current) {
              setIsLoading(false);
            }
          }
        },
        (error) => {
          if (!isMounted.current) return;
          
          console.error('Location error:', error);
          setIsLoading(false);
          
          let errorMessage = 'Unable to get your location';
          switch (error.code) {
            case 1:
              errorMessage = 'Location permission denied';
              break;
            case 2:
              errorMessage = 'Location unavailable';
              break;
            case 3:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = 'Location error occurred';
          }
          
          setMapError(errorMessage);
        },
        { 
          enableHighAccuracy: Platform.OS === 'ios',
          timeout: 15000, 
          maximumAge: 60000,
          distanceFilter: 10
        }
      );
    } catch (error) {
      console.error('Geolocation error:', error);
      setIsLoading(false);
      setMapError('Location service unavailable');
    }
  }, [isLoading, isMapReady]);

  const handleMapPress = useCallback((event) => {
    try {
      if (!event?.nativeEvent?.coordinate) return;
      
      const coordinate = event.nativeEvent.coordinate;
      
      // Validate coordinate
      if (!coordinate || isNaN(coordinate.latitude) || isNaN(coordinate.longitude)) {
        return;
      }
      
      const validatedCoordinate = {
        latitude: parseFloat(coordinate.latitude),
        longitude: parseFloat(coordinate.longitude)
      };
      
      setSelectedLocation(validatedCoordinate);
      
      // Update region to center on selected location
      const newRegion = {
        ...region,
        latitude: validatedCoordinate.latitude,
        longitude: validatedCoordinate.longitude,
      };
      setRegion(newRegion);
    } catch (error) {
      console.error('Error handling map press:', error);
    }
  }, [region]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!hasLocationPermission) {
      Alert.alert(
        'Permission Required',
        'Location permission is required to use this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestLocationPermission }
        ]
      );
      return;
    }
    getCurrentLocation();
  }, [getCurrentLocation, hasLocationPermission]);

  const handleSaveAddress = useCallback(() => {
    if (selectedLocation) {
      Alert.alert('Success', 'Address saved successfully!');
      // Here you would typically save the address and navigate back
    } else {
      Alert.alert('Error', 'Please select a location on the map');
    }
  }, [selectedLocation]);

  const handleMapReady = useCallback(() => {
    console.log('Map is ready');
    setIsMapReady(true);
  }, []);

  const handleMapError = useCallback((error) => {
    console.error('Map error:', error);
    setMapError('Map failed to load');
  }, []);

  const renderMarker = useCallback(() => {
    if (!selectedLocation) return null;
    
    return (
      <Marker
        key={`marker-${selectedLocation.latitude}-${selectedLocation.longitude}`}
        coordinate={selectedLocation}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
      >
        <View style={styles.markerContainer}>
          <View style={styles.markerPin}>
            <MapPin color="#FFF" size={20} />
          </View>
        </View>
      </Marker>
    );
  }, [selectedLocation]);

  const renderCircle = useCallback(() => {
    if (!selectedLocation) return null;
    
    return (
      <Circle
        key={`circle-${selectedLocation.latitude}-${selectedLocation.longitude}`}
        center={selectedLocation}
        radius={200}
        fillColor="rgba(230, 184, 0, 0.2)"
        strokeColor="rgba(230, 184, 0, 0.5)"
        strokeWidth={2}
      />
    );
  }, [selectedLocation]);

  // Error boundary for map
  if (mapError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#E6B800" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <ChevronLeft color="#000" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add delivery address</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{mapError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setMapError(null);
              requestLocationPermission();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E6B800" />
      
      {/* Header */}
      <View style={styles.header}>
        {/* <TouchableOpacity style={styles.backButton}onPress={()=>navigation.goBack()}>
          <ChevronLeft color="#000" size={24} />
        </TouchableOpacity> */}
        <Text style={styles.headerTitle}>Add delivery address</Text>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {/* <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onMapReady={handleMapReady}
          onPress={handleMapPress}
          onError={handleMapError}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          loadingEnabled={true}
          mapType="standard"
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled={true}
          zoomEnabled={true}
          moveOnMarkerPress={false}
          initialRegion={region}
        >
          {isMapReady && renderMarker()}
          {isMapReady && renderCircle()}
        </MapView> */}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E6B800" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}

        {/* Close button */}
        <TouchableOpacity style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.addressContainer}>
          <View style={styles.addressRow}>
            <MapPin color="#FFF" size={20} />
            <Text style={styles.addressText} numberOfLines={2}>
              {currentAddress}
            </Text>
            <TouchableOpacity style={styles.editButton}>
              <Edit3 color="#FFF" size={16} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.currentLocationButton, isLoading && styles.buttonDisabled]}
            // onPress={handleUseCurrentLocation}
            disabled={isLoading}
          >
            <Navigation color="#000" size={18} />
            <Text style={styles.currentLocationButtonText}>
              {isLoading ? 'Getting Location...' : 'Use My Current Location'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveAddress}
          >
            <Text style={styles.saveButtonText}>Save Address</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6B800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6B800',
    paddingHorizontal: 16,
    justifyContent:'center',
    paddingVertical: 12,
    elevation: 0,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  mapContainer: {
    flex: 1,
    backgroundColor:'#fff',
    borderTopLeftRadius:15,
    borderTopRightRadius:15,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#E6B800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6B800',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomPanel: {
    backgroundColor: '#2D2D1A',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  addressContainer: {
    marginBottom: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressText: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
  },
  editButton: {
    padding: 4,
  },
  buttonsContainer: {
    gap: 12,
  },
  currentLocationButton: {
    backgroundColor: '#E6B800',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  currentLocationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#E6B800',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default MapDeliveryAddressScreen;