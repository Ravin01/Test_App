import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';

const useCountdown = (targetDate) => {
  const countDownDate = useMemo(() => new Date(targetDate).getTime(), [targetDate]);
  const intervalRef = useRef(null);
  
  const [countDown, setCountDown] = useState(() => {
    const now = new Date().getTime();
    return Math.max(0, countDownDate - now);
  });

  // Memoize the calculation function to prevent unnecessary re-renders
  const getReturnValues = useCallback((countDown) => {
    if (countDown <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    
    const days = Math.floor(countDown / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (countDown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((countDown % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  }, []);

  useEffect(() => {
    if (countDownDate <= new Date().getTime()) {
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const newCountDown = Math.max(0, countDownDate - now);
      
      // Get current and new minute values to check if we need to update
      const currentMinutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
      const newMinutes = Math.floor((newCountDown % (1000 * 60 * 60)) / (1000 * 60));
      
      // Only update state when minutes change (not seconds)
      if (newCountDown <= 0) {
        setCountDown(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (currentMinutes !== newMinutes) {
        setCountDown(newCountDown);
      }
    };

    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [countDownDate, countDown]);

  // Memoize the return values to prevent unnecessary re-renders of components
  return useMemo(() => getReturnValues(countDown), [countDown, getReturnValues]);
};

export { useCountdown };

// Alternative: High-performance countdown hook with RAF
export const useCountdownRAF = (targetDate) => {
  const countDownDate = useMemo(() => new Date(targetDate).getTime(), [targetDate]);
  const rafRef = useRef(null);
  const lastUpdateRef = useRef(0);
  
  const [countDown, setCountDown] = useState(() => {
    const now = Date.now();
    return Math.max(0, countDownDate - now);
  });

  const getReturnValues = useCallback((countDown) => {
    if (countDown <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    
    const days = Math.floor(countDown / (1000 * 60 * 60 * 24));
    const hours = Math.floor((countDown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((countDown % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
  }, []);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      
      // Only update once per second to prevent excessive re-renders
      if (now - lastUpdateRef.current >= 1000) {
        const newCountDown = Math.max(0, countDownDate - now);
        setCountDown(newCountDown);
        lastUpdateRef.current = now;
        
        if (newCountDown <= 0) {
          return; // Stop animation when countdown reaches 0
        }
      }
      
      rafRef.current = requestAnimationFrame(animate);
    };

    if (countDownDate > Date.now()) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [countDownDate]);

  return useMemo(() => getReturnValues(countDown), [countDown, getReturnValues]);
};