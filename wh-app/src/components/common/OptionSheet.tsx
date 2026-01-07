import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

interface Option {
  label: string;
  value: string;
  destructive?: boolean;
}

interface OptionSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: Option[];
  onSelect: (value: string) => void;
  onCancel: () => void;
}

const OptionSheet: React.FC<OptionSheetProps> = ({
  visible,
  title,
  subtitle,
  options,
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get('window').height),
  ).current;

  useEffect(() => {
    if (visible) {
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSelect = (value: string) => {
    onSelect(value);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {}
              <View style={styles.handle} />

              {}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>

              {}
              <View style={styles.optionsContainer}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      index === 0 && styles.optionButtonFirst,
                      index === options.length - 1 && styles.optionButtonLast,
                      option.destructive && styles.optionButtonDestructive,
                    ]}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        option.destructive && styles.optionTextDestructive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  optionButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionButtonFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  optionButtonLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  optionButtonDestructive: {
    
  },
  optionText: {
    fontSize: 17,
    fontWeight: '500',
    color: COLORS.primary,
    textAlign: 'center',
  },
  optionTextDestructive: {
    color: '#EF4444',
  },
  cancelButton: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default OptionSheet;

