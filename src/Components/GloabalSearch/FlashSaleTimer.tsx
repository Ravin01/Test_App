import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FlashSaleTimerProps {
  endsAt: string | Date;
}

const FlashSaleTimer: React.FC<FlashSaleTimerProps> = ({ endsAt }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const endTime = new Date(endsAt).getTime();
      const now = Date.now();
      const difference = endTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  if (isExpired) {
    return (
      <View style={styles.container}>
        <Text style={styles.expiredText}>Expired</Text>
      </View>
    );
  }

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  return (
    <View style={styles.container}>
      <View style={styles.timeBlock}>
        <Text style={styles.timeText}>{formatNumber(timeLeft.hours)}</Text>
      </View>
      <Text style={styles.separator}>:</Text>
      <View style={styles.timeBlock}>
        <Text style={styles.timeText}>{formatNumber(timeLeft.minutes)}</Text>
      </View>
      <Text style={styles.separator}>:</Text>
      <View style={styles.timeBlock}>
        <Text style={styles.timeText}>{formatNumber(timeLeft.seconds)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBlock: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  timeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  separator: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginHorizontal: 1,
  },
  expiredText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
});

export default FlashSaleTimer;
