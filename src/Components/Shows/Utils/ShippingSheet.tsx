import { Truck } from 'lucide-react-native';
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { colors } from '../../../Utils/Colors';

// Constants
const SHEET_HEIGHT = 350;
const OPEN_DURATION = 150;
const SHIPPING_COST = 100;

// Shipping options data
const SHIPPING_OPTIONS = [
  {
    id: 'pay-once',
    title: 'Pay for Shipping once:',
    description: `Shipping is ${SHIPPING_COST} for this item`,
    icon: 'truck',
  },
  {
    id: 'add-more',
    title: 'Add more save more:',
    description: 'Shipping is free for every additional item in this show',
    icon: 'truck',
  },
];

// Memoized shipping option component
const ShippingOption = React.memo(({ option, onPress }) => (
  <TouchableOpacity style={styles.option} onPress={onPress}>
    <Truck color="#fff" style={styles.icon} />
    <View style={styles.optionContent}>
      <Text style={styles.text}>{option.title}</Text>
      <Text style={styles.description}>{option.description}</Text>
    </View>
  </TouchableOpacity>
));

const ShippingBottomSheet = ({ isOpen, isClose }) => {
  const refRBSheet = useRef();

  // Memoized callbacks
  const openBottomSheet = useCallback(() => {
    if (refRBSheet.current) {
      refRBSheet.current.open();
    }
  }, []);

  const closeBottomSheet = useCallback(() => {
    if (refRBSheet.current) {
      refRBSheet.current.close();
    }
  }, []);

  const handleClose = useCallback(() => {
    isClose?.(false);
  }, [isClose]);

  const handleOptionPress = useCallback(() => {
    closeBottomSheet();
  }, [closeBottomSheet]);

  // Memoized custom styles
  const customStyles = useMemo(() => ({
    container: styles.sheetContainer,
  }), []);

  // Effect to handle sheet open/close
  useEffect(() => {
    if (isOpen) {
      openBottomSheet();
    } else {
      closeBottomSheet();
    }
  }, [isOpen, openBottomSheet, closeBottomSheet]);

  // Memoized rendered options
  const renderedOptions = useMemo(() => 
    SHIPPING_OPTIONS.map(option => (
      <ShippingOption
        key={option.id}
        option={option}
        onPress={handleOptionPress}
      />
    )), [handleOptionPress]
  );

  return (
    <RBSheet
      ref={refRBSheet}
      height={SHEET_HEIGHT}
      openDuration={OPEN_DURATION}
      draggable
      dragOnContent
      onClose={handleClose}
      customStyles={customStyles}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Shipping Policy</Text>
        {renderedOptions}
      </View>
    </RBSheet>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: colors.SecondaryColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  content: {
    // flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: '#fff',
    marginBottom:6,
    // textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  icon: {
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default React.memo(ShippingBottomSheet);