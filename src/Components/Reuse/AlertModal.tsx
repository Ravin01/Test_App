import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  X,
} from 'lucide-react-native';

const GlobalConfirmModal = ({
  visible = false,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  content = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  mode = 'normal', // 'normal', 'error', 'success', 'warning'
  isLoading = false,
  showIcon = true,
}) => {
  const getModeConfig = () => {
    switch (mode) {
      case 'error':
        return {
          icon: <AlertTriangle size={40} color="#dc2626" />,
          confirmButtonClass: 'bg-red-600 active:bg-red-700',
          titleClass: 'text-red-400',
          borderClass: 'border-red-500/40',
          iconBgClass: 'bg-red-500/10',
        };
      case 'success':
        return {
          icon: <CheckCircle size={40} color="#16a34a" />,
          confirmButtonClass: 'bg-green-600 active:bg-green-700',
          titleClass: 'text-green-400',
          borderClass: 'border-green-500/40',
          iconBgClass: 'bg-green-500/10',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={40} color="#ca8a04" />,
          confirmButtonClass: 'bg-brand-yellow active:bg-yellow-500',
          titleClass: 'text-brand-yellow',
          borderClass: 'border-brand-yellow/40',
          iconBgClass: 'bg-brand-yellow/10',
        };
      default: // normal
        return {
          icon: <Info size={40} color="#ca8a04" />,
          confirmButtonClass: 'bg-brand-yellow active:bg-yellow-500',
          titleClass: 'text-brand-yellow',
          borderClass: 'border-brand-yellow/30',
          iconBgClass: 'bg-brand-yellow/10',
        };
    }
  };

  const config = getModeConfig();

  const handleConfirm = () => {
    if (onConfirm && !isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onClose && !isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent>
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View className="flex-1 bg-black/70 justify-center items-center px-4">
          <TouchableWithoutFeedback onPress={() => {}}>
            <View className={`bg-secondary-color rounded-2xl w-full max-w-sm overflow-hidden ${config.borderClass} shadow-2xl`}>
              
              {/* Header */}
              <View className="flex-row justify-between items-center p-5 border-b border-gray-800">
                <Text className={`text-xl font-bold ${config.titleClass}`}>
                  {title}
                </Text>
                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={isLoading}
                  className="p-2 rounded-full bg-[#222] border border-gray-700">
                  <X size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View className="p-6 items-center">
                {/* Icon */}
                {showIcon && (
                  <View className={`mb-6 p-4 rounded-full ${config.iconBgClass}`}>
                    {config.icon}
                  </View>
                )}

                {/* Content Text */}
                <Text className="text-gray-300 text-center text-base leading-7 mb-8">
                  {content}
                </Text>

                {/* Action Buttons */}
                <View className="flex-row space-x-4 gap-2 w-full">
                  {/* Cancel Button */}
                  <TouchableOpacity
                    onPress={handleCancel}
                    disabled={isLoading}
                    className={`flex-1 bg-primary-color py-3 px-4 rounded-xl border border-gray-600 ${isLoading ? 'opacity-50' : 'active:bg-gray-700'}`}>
                    <Text className="text-gray-300 font-semibold text-center text-base">
                      {cancelText}
                    </Text>
                  </TouchableOpacity>

                  {/* Confirm Button */}
                  <TouchableOpacity
                    onPress={handleConfirm}
                    disabled={isLoading}
                    className={`flex-1 py-3 px-4 rounded-xl ${config.confirmButtonClass} ${isLoading ? 'opacity-50' : ''} shadow-lg`}>
                    {isLoading ? (
                      <View className="flex-row items-center justify-center space-x-2">
                        <ActivityIndicator size="small" color="#000000" />
                        <Text className="text-black font-bold text-base">
                          Processing...
                        </Text>
                      </View>
                    ) : (
                      <Text className={`${mode=='error'?'text-white':'text-black'} font-bold text-center text-base`}>
                        {confirmText}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default GlobalConfirmModal;