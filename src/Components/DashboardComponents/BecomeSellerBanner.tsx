import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import SwipeableBuyButton from '../AnimatedButtons';
import { becomeSeller } from '../../assets/assets';

interface GradientBoxProps {
  onBecomeSellerPress: () => void;
}

const GradientBox: React.FC<GradientBoxProps> = ({ onBecomeSellerPress }) => {
  return (
    <>
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.98)', '#FFC100']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.box}>
        <View style={styles.content}>
          <Image
            source={{uri:becomeSeller}}
            style={styles.image}
          />
          <View style={styles.textContainer}>
            <Text style={styles.title1}>Why are you waiting ?</Text>
            <Text style={styles.subtitle}>Time to take your store alive</Text>
            <Text style={styles.subText}>Let your customers buy live</Text>
          </View>
        </View>
      </LinearGradient>
      <SwipeableBuyButton
        onComplete={onBecomeSellerPress}
        text="Become seller"
      />
    </>
  );
};

const styles = StyleSheet.create({
  box: {
    height: 123,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title1: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default React.memo(GradientBox);
