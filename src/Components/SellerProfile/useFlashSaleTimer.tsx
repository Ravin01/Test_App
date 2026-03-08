import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export default function useFlashSaleTimer(product) {
  const [timeLeft, setTimeLeft] = useState({});

  const calculateTimeLeft = () => {
    const endDate = new Date(product?.flashSale?.endsAt);
    if (isNaN(endDate.getTime())) return {};

    const difference = endDate.getTime() - new Date().getTime();
    if (difference <= 0) return {};

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  useEffect(() => {
    if (!product?.flashSale?.isActive) return;

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTime = calculateTimeLeft();
      setTimeLeft(newTime);
      if (Object.keys(newTime).length === 0) {
        clearInterval(timer);
      }
    }, 1000);

    // Recalculate when app comes to foreground
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setTimeLeft(calculateTimeLeft());
      }
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [product?.flashSale?.isActive, product?.flashSale?.endsAt]);

  return timeLeft;
}
