import { useState } from 'react';

const useConfirmModal = () => {
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    content: '',
    mode: 'normal',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    showIcon: true,
    isLoading: false,
    onConfirm: null,
  });

  const showModal = ({
    title = 'Confirm Action',
    content = 'Are you sure you want to proceed?',
    mode = 'normal',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    showIcon = true,
    onConfirm = null,
  }) => {
    setModalConfig({
      visible: true,
      title,
      content,
      mode,
      confirmText,
      cancelText,
      showIcon,
      isLoading: false,
      onConfirm,
    });
  };

  const hideModal = () => {
    setModalConfig(prev => ({
      ...prev,
      visible: false,
      isLoading: false,
    }));
  };

  const setLoading = (loading) => {
    setModalConfig(prev => ({
      ...prev,
      isLoading: loading,
    }));
  };

  const handleConfirm = async () => {
    if (modalConfig.onConfirm) {
      setLoading(true);
      try {
        await modalConfig.onConfirm();
        hideModal();
      } catch (error) {
        // Handle error if needed
        console.error('Modal confirm error:', error);
        setLoading(false);
      }
    } else {
      hideModal();
    }
  };

  return {
    modalConfig,
    showModal,
    hideModal,
    handleConfirm,
    setLoading,
  };
};

export default useConfirmModal;