import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { CheckCircle, Circle, X, Trophy, Target, Star, Key } from 'lucide-react-native';
import { colors } from '../../../Utils/Colors';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const socialSellerTasks = [
  {
    title: "Personal Details",
    tasks: [
      { key: 'name', label: 'Full Name Provided' },
      { key: 'mobileNumber', label: 'Mobile Number Entered' },
      { key: 'email', label: 'Email Address Entered' },
      { key: 'businessType', label: 'Business Type Selected' },
      { key: 'isAgeConfirmed', label: 'Age Confirmed (18+)' },
    ]
  },
    {
    title: "Business Address",
    tasks: [
      { key: 'streetAddress1', label: 'Street Address Provided' },
      { key: 'city', label: 'City & State Provided' },
      { key: 'pinCode', label: 'Pincode Entered' },
    ]
  },
  {
    title: "KYC & Address Verification",
    tasks: [
        {key:'gstVerified',label:'GST Data gathered'},
      // { key: 'aadharVerified', label: 'Aadhaar Verified' },
      // { key: 'panVerified', label: 'PAN Verified' },
      { key: 'aadhaarNumber', label: 'Aadhaar Verified' },
      { key: 'panNumber', label: 'PAN Verified' },]
  },
  {
    title: "Business Profile",
    tasks: [
      { key: 'sellerExperience', label: 'Experience Level Selected' },
      { key: 'productCategories', label: 'Product Categories Selected' },
      { key: 'productCatalog', label: 'Product Catalog Provided' },
    ]
  },
  {
    title: "Logistics",
    tasks: [
      { key: 'preferredShipping', label: 'Shipping Method Chosen' },
      { key: 'dispatchTime', label: 'Dispatch Time Selected' },
      { key: 'returnPolicy', label: 'Return Policy Selected' },
    ]
  },
];
const brandSellerTasks = [
  {
    title: "Brand Information",
    tasks: [
      { key: 'name', label: 'Business Name Provided' },
      { key: 'mobileNumber', label: 'Business Mobile Entered' },
      { key: 'email', label: 'Business Email Entered' },
      { key: 'businessType', label: 'Business Type Selected' },
    ]
  },
  {
    title: "Business Address",
    tasks: [
      { key: 'streetAddress1', label: 'Street Address Provided' },
      { key: 'city', label: 'City & State Provided' },
      { key: 'pinCode', label: 'Pincode Entered' },
    ]
  },
  {
    title: "KYC Verification",
    tasks: [
      { key: 'gstNumber', label: 'GST Details Completed' },
      { key: 'aadhaarNumber', label: 'Aadhaar Verified' },
      { key: 'panNumber', label: 'PAN Verified' },
    ]
  },
  {
    title: "Experience & Logistics",
    tasks: [
      { key: 'sellerExperience', label: 'Experience Level Selected' },
      { key: 'productCategories', label: 'Product Categories Selected' },
      { key: 'preferredShipping', label: 'Shipping Method Chosen' },
    ]
  },
];

// Helper function to check if a task is completed
const isTaskCompleted = (value: any, taskKey: string = '', formData?: any): boolean => {
  // Email is always considered completed (linked to account)
  if (taskKey === 'email') {
    return true;
  }
  
  // For Aadhaar: must have exactly 12 digits AND be verified
  if (taskKey === 'aadhaarNumber') {
    const aadhaarNumber = value;
    const isVerified = formData?.aadharVerified === true;
    const has12Digits = typeof aadhaarNumber === 'string' && aadhaarNumber.length === 12;
    return has12Digits && isVerified;
  }
  
  // For PAN: must have exactly 10 characters AND be verified
  if (taskKey === 'panNumber') {
    const panNumber = value;
    const isVerified = formData?.panVerified === true;
    const has10Chars = typeof panNumber === 'string' && panNumber.length === 10;
    return has10Chars && isVerified;
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'boolean') {
    return value === true;
  }
  if (typeof value === 'string') {
    return value && value.trim() !== '';
  }
  return !!value;
};

// Clean TaskList component
const TaskList = ({ tasksConfig, formData }: { tasksConfig: string; formData: any }) => {
  const data = tasksConfig === 'Brand' ? brandSellerTasks : socialSellerTasks;
  
  return (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="space-y-4">
        {data.map((section, sectionIndex) => (
          <View key={sectionIndex} className="space-y-3">
            {/* Section Header */}
            <View className="p-3 bg-yellow-500/20 rounded-lg border border-gray-700">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-2 h-2 bg-green-400 rounded-full" />
                  <Text className="font-semibold text-white">
                    {section.title}
                  </Text>
                </View>
                <View className="bg-gray-700 px-2 py-1 rounded-full">
                  <Text className="text-xs text-gray-300">
                    {section.tasks.filter(task => isTaskCompleted(formData[task.key], task.key, formData)).length}/{section.tasks.length}
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="space-y-2">
              {section.tasks.map((task, taskIndex) => {
                const completed = isTaskCompleted(formData[task.key], task.key, formData);
                return (
                <View 
                  key={taskIndex} 
                  className={`flex-row items-center gap-3 p-3 rounded-lg ${
                    completed 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-gray-900/30 border border-gray-700'
                  }`}
                >
                  {/* Completion indicator */}
                  {completed ? (
                    <CheckCircle size={18} color="#10B981" />
                  ) : (
                    <Circle size={18} color="#6B7280" />
                  )}
                  
                  {/* Task label */}
                  <Text className={`flex-1 ${
                    completed 
                      ? 'text-white font-medium' 
                      : 'text-gray-400'
                  }`}>
                    {task.label}
                  </Text>
                  
                  {/* Completion badge */}
                  {completed && (
                    <Star size={14} color="#FBBF24" />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  </ScrollView>
);
}
// Main Component
const OnboardingStatusWidget = ({ title, tasksConfig, formData, isOpen, onClose }: {
  title: string;
  tasksConfig: string;
  formData: any;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const bottomSheetRef = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const data = tasksConfig === 'Brand' ? brandSellerTasks : socialSellerTasks;
  
  const { percentage, completedTasks, totalTasks } = useMemo(() => {
    let completed = 0;
    let total = 0;
    data.forEach(section => {
      section.tasks.forEach(task => {
        total++;
        if (isTaskCompleted(formData[task.key], task.key, formData)) {
          completed++;
        }
      });
    });
    const calc = {
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      completedTasks: completed,
      totalTasks: total
    };
    
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: calc.percentage,
      duration: 600,
      useNativeDriver: false,
    }).start();
    
    return calc;
  }, [formData, tasksConfig, progressAnim, data]);

  const openBottomSheet = () => {
    bottomSheetRef.current?.open();
  };

  const closeBottomSheet = () => {
    bottomSheetRef.current?.close();
  };

  // Default floating trigger button
  const defaultTrigger = (
    <View className="flex-row items-center gap-3 bg-yellow-500 px-6 py-3 rounded-full shadow-lg">
      <Target size={16} color="#000" />
      <Text className="text-black font-bold text-sm">
        {percentage}% Complete
      </Text>
    </View>
  );
  useEffect(()=>{
    if(isOpen)
        openBottomSheet()
    else{
        closeBottomSheet()
    onClose()}
  },[isOpen])

  return (
    <>
      {/* Trigger Component */}
   

      {/* Bottom Sheet */}
      <RBSheet
        ref={bottomSheetRef}
        height={screenHeight * 0.65}
        openDuration={100}
        closeDuration={200}
        onClose={()=>onClose()}
        closeOnPressBack
        closeOnDragDown={true}
        closeOnPressMask={true}
        customStyles={{
          wrapper: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          },
          draggableIcon: {
            backgroundColor: colors.primaryColor,
            width: 50,
            height: 4,
          },
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: colors.primaryColor,
            paddingHorizontal: 0,
          },
        }}
      >
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-center p-6 pb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-primary-color rounded-lg items-center justify-center border border-gray-700">
                <Trophy size={20} color="#FBBF24" />
              </View>
              <Text className="text-xl font-bold text-white">
                {title}
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={closeBottomSheet} 
              className="p-2 text-gray-400 rounded-lg"
            >
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Progress Section */}
          <View className="mx-6 mb-6 p-4 bg-primary-color rounded-lg border border-gray-700">
            <View className="flex-row items-center gap-4 mb-3">
              <View className="bg-yellow-500 rounded-lg px-4 py-2">
                <Text className="text-black font-bold text-lg">
                  {percentage}%
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-medium">
                  Progress Overview
                </Text>
                <Text className="text-gray-400 text-xs">
                  <Text className="text-yellow-500 font-medium">{completedTasks}</Text> of {totalTasks} tasks completed
                </Text>
              </View>
            </View>
            
            {/* Progress bar */}
            <View className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
              <Animated.View
                className="bg-yellow-500 h-3 rounded-full"
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                }}
              />
            </View>
          </View>

          {/* Divider */}
          <View className="border-b border-gray-700 mx-6 mb-4" />
          
          {/* Task list container */}
          <View className="flex-1 px-6">
            <TaskList tasksConfig={tasksConfig} formData={formData} />
          </View>

          {/* Action Button */}
          <View className="p-6 pt-4 border-t border-gray-700">
            <TouchableOpacity 
              className="bg-yellow-500 rounded-lg p-4 items-center"
              onPress={closeBottomSheet}
            >
              <Text className="text-black font-semibold text-base">Continue Onboarding</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RBSheet>
    </>
  );
};

// Desktop/Tablet Inline Widget (Alternative Component)
const OnboardingStatusInlineWidget = ({ title, tasksConfig, formData }: {
  title: string;
  tasksConfig: string;
  formData: any;
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const data = tasksConfig === 'Brand' ? brandSellerTasks : socialSellerTasks;
  
  const { percentage, completedTasks, totalTasks } = useMemo(() => {
    let completed = 0;
    let total = 0;
    data.forEach(section => {
      section.tasks.forEach(task => {
        total++;
        if (isTaskCompleted(formData[task.key], task.key, formData)) {
          completed++;
        }
      });
    });
    const calc = {
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      completedTasks: completed,
      totalTasks: total
    };
    
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: calc.percentage,
      duration: 600,
      useNativeDriver: false,
    }).start();
    
    return calc;
  }, [formData, tasksConfig, progressAnim]);

  return (
    <View className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md mx-4">
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-2">
        <Trophy size={24} color="#FBBF24" />
        <Text className="text-xl font-bold text-white">
          {title}
        </Text>
      </View>
      
      {/* Progress section */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <View className="bg-yellow-500 rounded-lg px-3 py-1">
            <Text className="text-black font-bold text-lg">
              {percentage}%
            </Text>
          </View>
          <Text className="text-gray-400 text-sm">
            <Text className="text-yellow-500 font-medium">{completedTasks}</Text> of {totalTasks} complete
          </Text>
        </View>
        
        {/* Progress bar */}
        <View className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
          <Animated.View
            className="bg-yellow-500 h-2 rounded-full"
            style={{
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            }}
          />
        </View>
      </View>
      
      <View className="border-b border-gray-700 mb-6" />
      
      {/* Task List */}
      <View className="max-h-96">
        <TaskList tasksConfig={tasksConfig} formData={formData} />
      </View>
    </View>
  );
};

export default OnboardingStatusWidget;
export { OnboardingStatusInlineWidget };


// Floating Action Button Version
const FloatingProgressButton = ({ tasksConfig, onPress, formData }: {
  tasksConfig: string;
  onPress: () => void;
  formData: any;
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const data = tasksConfig === 'Brand' ? brandSellerTasks : socialSellerTasks;

  const { percentage, completedTasks, totalTasks } = useMemo(() => {
    let completed = 0;
    let total = 0;
    data.forEach(section => {
      section.tasks.forEach(task => {
        total++;
        if (isTaskCompleted(formData[task.key], task.key, formData)) {
          completed++;
        }
      });
    });
    const calc = {
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      completedTasks: completed,
      totalTasks: total
    };

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: calc.percentage,
      duration: 600,
      useNativeDriver: false,
    }).start();

    return calc;
  }, [formData]);

  const circumference = 2 * Math.PI * 22; // radius = 22
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="absolute bottom-28 right-6 items-center justify-center"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      {/* Circular Progress Background */}
      <View className="relative items-center justify-center">
        {/* Background Circle */}
        <View className="w-16 h-16 bg-gray-800 rounded-full border-2 border-gray-600 items-center justify-center">
          {/* Progress Ring using Animated View hack */}
          <View 
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: percentage > 0 ? '#06B6D4' : 'transparent',
              borderRightColor: percentage > 25 ? '#06B6D4' : 'transparent',
              borderBottomColor: percentage > 50 ? '#06B6D4' : 'transparent',
              borderLeftColor: percentage > 75 ? '#06B6D4' : 'transparent',
              transform: [{ rotate: '-90deg' }],
            }}
          />
          
          {/* Inner Content */}
          <View className="items-center justify-center">
            {percentage === 100 ? (
              <CheckCircle size={18} color="#10B981" />
            ) : (
              <Target size={18} color="#06B6D4" />
            )}
          </View>
        </View>

        {/* Percentage Badge */}
        <View className="absolute -bottom-1 -right-1 bg-cyan-500 rounded-full px-2 py-1 min-w-8 items-center">
          <Text className="text-white font-bold text-xs">{percentage}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Alternative: Compact Progress Ring FAB
const CompactProgressFAB = ({ tasksConfig, onPress, formData }: {
  tasksConfig: string;
  onPress: () => void;
  formData: any;
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const data = tasksConfig === 'Brand' ? brandSellerTasks : socialSellerTasks;

  const { percentage } = useMemo(() => {
    let completed = 0;
    let total = 0;
    data.forEach(section => {
      section.tasks.forEach(task => {
        total++;
        if (isTaskCompleted(formData[task.key], task.key, formData)) {
          completed++;
        }
      });
    });
    const calc = {
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };

    Animated.timing(progressAnim, {
      toValue: calc.percentage,
      duration: 600,
      useNativeDriver: false,
    }).start();

    return calc;
  }, [formData]);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="absolute bottom-28 right-6"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        // right:30,
        elevation: 8,
      }}
    >
      <View className="relative">
        {/* Main Circle */}
        <View className=" bg-secondary-color rounded-full border border-slate-600 items-center justify-center" style={{    width: 50,
    height: 50,}}>
          <Text className="text-brand-yellow font-bold text-sm">{percentage}%</Text>
        </View>
        
        {/* Progress Ring Overlay */}
        <View 
          className="absolute inset-0 rounded-full"
          style={{
            borderWidth: 3,
            borderColor: 'transparent',
            borderTopColor: percentage > 12.5 ? '#06B6D4' : '#374151',
            borderRightColor: percentage > 37.5 ? '#06B6D4' : '#374151',
            borderBottomColor: percentage > 62.5 ? '#06B6D4' : '#374151',
            borderLeftColor: percentage > 87.5 ? '#06B6D4' : '#374151',
            transform: [{ rotate: '-90deg' }],
          }}
        />
        
        {/* Completion Indicator */}
        {percentage === 100 && (
          <View className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
            <CheckCircle size={12} color="#FFF" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export {  CompactProgressFAB };
//


export { FloatingProgressButton };
