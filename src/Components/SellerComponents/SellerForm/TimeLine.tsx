import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HorizontalTimeline = ({ 
  activeIndex = 0, 
  dotSize = 16,
  activeDotColor = '#10B981',
  inactiveDotColor = '#E5E7EB',
  activeLineColor = '#10B981',
  inactiveLineColor = '#E5E7EB',
  lineWidth = 70,
  text='',
  showStepNumbers = false,
  showCheckmarks = true,
  totalDots = 4
}) => {
  // const totalDots = 4;
  
  const renderCheckmark = () => (
    <View style={styles.checkmarkContainer}>
      <Text style={styles.checkmark}>{' '}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.timeline}>
        {Array.from({ length: totalDots }, (_, index) => (
          <React.Fragment key={index}>
            {/* Dot */}
            <View>
            <View style={styles.dotContainer}>
              <View style={[
                styles.dot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: index <= activeIndex ? activeDotColor : inactiveDotColor,
                  borderColor: index <= activeIndex ? activeDotColor : inactiveDotColor,
                }
              ]}>
                {showCheckmarks && index < activeIndex && renderCheckmark()}
              </View>
              
              {/* Step number below dot */}
            </View>
            
           {/* {index == activeIndex && 
              <Text style={styles.stepNumber}>{text}</Text>} */}
            </View>

             
            {/* Line between dots */}
            {index < totalDots - 1 && (
              <View style={[styles.lineContainer, { width: lineWidth }]}>
                <View style={[
                  styles.line,
                  { backgroundColor: inactiveLineColor }
                ]} />
                <View style={[
                  styles.activeLine,
                  {
                    backgroundColor: activeLineColor,
                    width: index < activeIndex ? lineWidth : 0,
                  }
                ]} />
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    // paddingVertical: 20,
    marginBottom:20
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotContainer: {
    alignItems: 'center',
  },
  dot: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    width: 100,
    flexShrink:2,
    textAlign: 'center',
    // marginTop: 8,
  },
  lineContainer: {
    position: 'relative',
    // marginHorizontal: 8,
  },
  line: {
    height: 3,
  },
  activeLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
  },
});

export default HorizontalTimeline;

// Example usage in your component:
/*
import HorizontalTimeline from './HorizontalTimeline';

const MyComponent = () => {
  const [currentStep, setCurrentStep] = useState(2); // Active index 2

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <HorizontalTimeline 
        activeIndex={currentStep}
        activeDotColor="#10B981"
        inactiveDotColor="#E5E7EB"
        activeLineColor="#10B981"
        inactiveLineColor="#E5E7EB"
      />
    </View>
  );
};
*/