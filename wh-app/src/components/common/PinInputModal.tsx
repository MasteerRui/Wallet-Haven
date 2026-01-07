import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  Vibration,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../constants/theme';

interface PinInputModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onComplete: (pin: string) => void;
  onCancel: () => void;
}

const PinInputModal: React.FC<PinInputModalProps> = ({
  visible,
  title,
  subtitle,
  onComplete,
  onCancel,
}) => {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get('window').height),
  ).current;

  useEffect(() => {
    if (visible) {
      
      setPin(['', '', '', '', '', '']);
      setError('');

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

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 400);
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
  const handlePinChange = (value: string, index: number) => {
    
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const fullPin = newPin.join('');
      if (fullPin.length === 6) {
        onComplete(fullPin);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      
      inputRefs.current[index - 1]?.focus();
    }
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showError = (message: string) => {
    setError(message);
    Vibration.vibrate(400);
    shake();
    setPin(['', '', '', '', '', '']);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
      setError('');
    }, 1500);
  };

  const handleCancel = () => {
    setPin(['', '', '', '', '', '']);
    setError('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCancel}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                { translateY: slideAnim },
                { translateX: shakeAnimation },
              ],
            },
          ]}
        >
          {}
          <View style={styles.handleBar} />

          {}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          {}
          <View style={styles.pinContainer}>
            {pin.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.pinInput,
                  digit && styles.pinInputFilled,
                  error && styles.pinInputError,
                ]}
                value={digit}
                onChangeText={value => handlePinChange(value, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                secureTextEntry
              />
            ))}
          </View>

          {}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <View style={styles.errorPlaceholder} />
          )}

          {}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                pin.join('').length !== 6 && styles.submitButtonDisabled,
              ]}
              onPress={() => {
                const fullPin = pin.join('');
                if (fullPin.length === 6) {
                  onComplete(fullPin);
                }
              }}
              disabled={pin.join('').length !== 6}
            >
              <Text
                style={[
                  styles.submitButtonText,
                  pin.join('').length !== 6 && styles.submitButtonTextDisabled,
                ]}
              >
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textSecondary + '40',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  pinInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.textSecondary + '20',
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  pinInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  pinInputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '10',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    height: 20,
  },
  errorPlaceholder: {
    height: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textSecondary + '40',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
});

export default PinInputModal;
