import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import {
  AlertTriangle,
  Trash2,
  Eye,
  StopCircle,
  X,
  Edit3,
  Pause,
} from 'lucide-react-native';

const FlashSaleModal = ({
  visible,
  onClose,
  type,
  title,
  message,
  onConfirm,
  onViewDetails,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}) => {
  const getModalIcon = () => {
    switch (type) {
      case 'delete':
        return <Trash2 size={48} color="#ef4444" />;
      case 'stop':
        return <Pause size={48} color="#FF453A" />;
      case 'edit_active':
        return <AlertTriangle size={48} color="#f59e0b" />;
      case 'edit_completed':
        return <AlertTriangle size={48} color="#6b7280" />;
      default:
        return <AlertTriangle size={48} color="#f59e0b" />;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'delete':
        return 'bg-red-500 hover:bg-red-600';
      case 'stop':
        return 'bg-red-500 hover:bg-orange-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const getConfirmTextColor = () => {
    return 'text-white font-semibold';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View className="bg-secondary-color rounded-2xl w-full max-w-sm mx-4 overflow-hidden border border-gray-700 shadow-2xl">
              {/* Header */}
              <View className="flex-row justify-between items-center p-4 border-b border-gray-700">
                <View className="flex-1">
                  <Text className="text-white text-lg font-bold">{title}</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="p-1 rounded-full bg-primary-color ml-2">
                  <X size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View className="p-6 items-center">
                {/* Icon */}
                <View className="mb-4">{getModalIcon()}</View>

                {/* Message */}
                <Text className="text-gray-300 text-center text-base leading-6 mb-6">
                  {message}
                </Text>

                {/* Action Buttons */}
                <View className="flex-row space-x-3 gap-2 w-full">
                  {/* Cancel Button */}
                  <TouchableOpacity
                    onPress={onClose}
                    disabled={isLoading}
                    className="flex-1 bg-gray-700 py-3 px-4 rounded-lg border border-gray-600">
                    <Text className="text-gray-300 font-medium text-center">
                      {cancelText}
                    </Text>
                  </TouchableOpacity>

                  {/* View Details Button (for edit cases) */}
                  {(type === 'edit_active' || type === 'edit_completed') && onViewDetails && (
                    <TouchableOpacity
                      onPress={() => {
                        onViewDetails();
                        onClose();
                      }}
                      disabled={isLoading}
                      className="flex-1 bg-blue-500 py-3 px-4 rounded-lg">
                      <View className="flex-row items-center justify-center space-x-2">
                        <Eye size={16} color="white" />
                        <Text className="text-white font-semibold">
                          View Details
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Primary Action Button */}
                  {onConfirm && (
                    <TouchableOpacity
                      onPress={() => {
                        onConfirm();
                        onClose();
                      }}
                      disabled={isLoading}
                      className={`flex-1 py-3 px-4 rounded-lg ${getConfirmButtonStyle()} ${
                        isLoading ? 'opacity-50' : ''
                      }`}>
                      <Text className={`text-center ${getConfirmTextColor()}`}>
                        {isLoading ? 'Processing...' : confirmText}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default FlashSaleModal;