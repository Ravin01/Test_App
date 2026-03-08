import {AlertCircle, ArrowLeftCircle,  MoreVertical} from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useDebouncedGoBack} from '../../../Utils/useDebouncedGoBack';
const {width, height} = Dimensions.get('window');

const SellerHeader = ({navigation, message, onOptionsPress=null}) => {
  const handleGoBack = useDebouncedGoBack(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, 500);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeftCircle color="#fff" size={24} />
        </TouchableOpacity>
        <LinearGradient
          colors={['#B38728', '#FFD700']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.headerTitleContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>{message}</Text>
          </View>
        </LinearGradient>
        {/* <View style={styles.headerSpacer} /> */}
        {message === 'Profile' && <TouchableOpacity onPress = {()=>onOptionsPress?.()} style={[styles.backButton, {marginRight: 4}]} >
          < MoreVertical color="#fff" size={24} />
        </TouchableOpacity>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    // marginTop: Platform.select({ios: 10, android: height * 0.01}),
    alignItems: 'center',
    gap: width * 0.1,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
    marginBottom: 10,
    // backgroundColor: '#000',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
});

export default SellerHeader;
