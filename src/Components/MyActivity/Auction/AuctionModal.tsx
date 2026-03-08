import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
import AntDesign from 'react-native-vector-icons/AntDesign';
const {width, height} = Dimensions.get('window');

const AuctionModal = ({isVisible, onClose, onSubmit}) => {
  const [price, setPrice] = useState('');
  const [instructionVisible, setInstructionVisible] = useState(false);
  const [prebidSuccess, setPrebidSuccess] = useState(false);

  const [expanded, setExpanded] = useState(false);

  const fullText = `Lorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, Lorel ipsum dolar sit amet Lorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, 
Lorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, Lorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, Lorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, 
Lorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, Lorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, 
Lorel ipsum dolar sit ametLorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, Lorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, 
Lorel ipsum dolar sit ametLorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, Lorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, 
Lorel ipsum dolar sit ametLorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, Lorel ipsum dolar sit ametLorel ipsum dolar sit amet, Lorel ipsum dolar sit amet, 
Lorel ipsum dolar sit amet`;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="dark"
                blurAmount={12}
                reducedTransparencyFallbackColor="rgba(0,0,0,0.7)"
              />

              <TouchableOpacity
                onPress={() => {
                  onClose();
                }}
                style={styles.closeIcon}>
                <AntDesign name="closecircle" size={18} color="#fff" />
              </TouchableOpacity>

              {instructionVisible ? (
                <View>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: '#fff',
                      fontSize: 18,
                      fontWeight: 'bold',
                    }}>
                    How it <Text style={{color: '#FFD700'}}>Pre-Bidding</Text>{' '}
                    works?
                  </Text>

                  {expanded ? (
                    <ScrollView
                      style={{maxHeight: 390, marginVertical: 20}}
                      showsVerticalScrollIndicator={true}>
                      <Text style={{color: '#eee', marginVertical: 6}}>
                        {fullText}
                      </Text>
                    </ScrollView>
                  ) : (
                    <Text
                      style={{color: '#eee', marginVertical: 20}}
                      numberOfLines={10}>
                      {fullText}
                    </Text> // 👈 just this line handles preview
                  )}

                  <View style={{flexDirection: 'row', gap: 40}}>
                    <TouchableOpacity
                      style={styles.LearnMoreButton}
                      onPress={() => setExpanded(prev => !prev)}>
                      <Text style={styles.submitText}>
                        {expanded ? 'Read Less' : 'Read More'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.gotItButton}
                      onPress={() => setInstructionVisible(false)}>
                      <Text style={styles.submitText}>Got it</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : !prebidSuccess ? (
                <>
                  <Text style={styles.title}>Set Max Bid Before Auction</Text>

                  <Text style={styles.subtitle}>
                    👟 Step up your style – one pair at a time!
                  </Text>
                  <Text style={[styles.product, styles.price]}>
                    Nike shoe – ₹199
                  </Text>

                  <Text
                    style={{
                      color: '#ddd',
                      marginBottom: 20,
                      textAlign: 'left',
                    }}>
                    We'll automatically set bits for you upto this amount when
                    auction begins.
                  </Text>

                  <Text style={styles.biddingLabel}>
                    Set your Bidding price
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter the price"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />

                  <Text style={styles.shipping}>+ ₹150 shipping charge</Text>

                  <Text style={styles.note}>
                    <Text style={{fontWeight: 'bold'}}>Note: </Text>
                    You can increase your max bid anytime, but you can't lower
                    it. Changes are allowed until the auction ends for this
                    item.
                  </Text>

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => {
                      setPrebidSuccess(true);
                      //onSubmit(price)
                    }}>
                    <Text style={styles.submitText}>Submit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setInstructionVisible(true)}>
                    <Text style={styles.howItWorks}>
                      How it works?{' '}
                      <Text style={styles.tapToLearn}>Tap to learn more</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View>
                  <Image
                    // source={require('../../../assets/images/payment_Success.png')}
                    style={styles.Image}
                  />
                  <Text
                    style={{
                      textAlign: 'center',
                      color: '#fff',
                      fontSize: 20,
                      fontWeight: 'bold',
                      marginVertical: 20,
                    }}>
                    Pre Bid Placed {'\n'}Successfully{' '}
                  </Text>

                  <Text
                    style={{
                      textAlign: 'center',
                      color: '#fff',
                      fontSize: 26,
                      fontWeight: 'bold',
                    }}>
                    Max Bid: <Text style={{color: '#FFD700'}}>$ 210</Text>{' '}
                  </Text>

                  <Text
                    style={{
                      color: '#eee',
                      marginVertical: 20,
                      textAlign: 'center',
                    }}>
                    We'll automatically set bits for you upto this amount when
                    auction begins.
                  </Text>

                  <TouchableOpacity
                    style={styles.gotItButton}
                    onPress={onClose}>
                    <Text style={{textAlign: 'center'}}>
                      🔔 Notify Me when auction starts
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    // backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    width: width * 0.9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
    paddingTop: 40,
    overflow: 'hidden',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  product: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  price: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  biddingLabel: {
    color: '#FFD700',
    alignSelf: 'flex-start',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    borderColor: '#555',
    borderWidth: 1,
    borderRadius: 10,
    color: '#fff',
    padding: 10,
    fontSize: 16,
    marginBottom: 4,
  },
  shipping: {
    color: '#FF5E5E',
    fontSize: 12,
    marginBottom: 16,
  },
  note: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#FFD700',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 40,
    marginBottom: 16,
  },
  submitText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  LearnMoreButton: {
    backgroundColor: '#999',
    borderRadius: 30,
    paddingVertical: 4,
    paddingHorizontal: 36,
    marginBottom: 16,
  },
  gotItButton: {
    backgroundColor: '#FFD700',
    borderRadius: 30,
    paddingVertical: 4,
    paddingHorizontal: 36,
    marginBottom: 16,
  },
  howItWorks: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'center',
  },
  tapToLearn: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  Image: {
    width: 110,
    height: 110,
    alignSelf: 'center',
  },
  closeIcon: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginRight: 10,
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
});

export default AuctionModal;
