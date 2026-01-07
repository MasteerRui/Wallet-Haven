import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../constants/theme';
import CategoryIcon from './CategoryIcon';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'success',
  duration = 3000,
  onHide,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#10B981'; 
      case 'error':
        return '#EF4444'; 
      case 'warning':
        return '#F59E0B'; 
      case 'info':
        return COLORS.primary; 
      default:
        return COLORS.primary;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'TickCircle';
      case 'error':
        return 'CloseCircle';
      case 'warning':
        return 'Warning2';
      case 'info':
        return 'InfoCircle';
      default:
        return 'InfoCircle';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={hideToast}
        style={[styles.toast, { backgroundColor: getBackgroundColor() }]}
      >
        <View style={styles.iconContainer}>
          <CategoryIcon iconName={getIcon()} size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <CategoryIcon
            iconName="Close"
            size={16}
            color="rgba(255, 255, 255, 0.8)"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 56,
  },
  iconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Toast;
