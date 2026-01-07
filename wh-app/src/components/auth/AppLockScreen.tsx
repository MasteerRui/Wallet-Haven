import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReactNativeBiometrics from 'react-native-biometrics';
import { COLORS } from '../../constants/theme';
import settingsService from '../../services/settingsService';
import { useTranslation } from '../../hooks/useTranslation';

const appLogo = require('../../assets/images/logo.png');

interface AppLockScreenProps {
  onUnlock: () => void;
}

const AppLockScreen: React.FC<AppLockScreenProps> = ({ onUnlock }) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const shakeAnimation = useState(new Animated.Value(0))[0];
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [biometricAttempted, setBiometricAttempted] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const rnBiometrics = new ReactNativeBiometrics();

  useEffect(() => {
    
    let isMounted = true;

    const init = async () => {
      if (isMounted && !biometricAttempted) {
        await checkBiometricAndAuthenticate();
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const checkBiometricAndAuthenticate = async () => {
    try {
      const biometricEnabled = await settingsService.isBiometricEnabled();

      if (biometricEnabled) {
        const { available, biometryType } =
          await rnBiometrics.isSensorAvailable();

        if (available) {
          setBiometricAvailable(true);
          setBiometricType(biometryType || 'Biometric');

          if (!biometricAttempted && !isAuthenticating) {
            await authenticateWithBiometric();
          }
        }
      }
    } catch (error) {
      console.error('[AppLockScreen] Error checking biometric:', error);
    }
  };

  const authenticateWithBiometric = async () => {
    
    if (isAuthenticating || biometricAttempted) {
      return;
    }

    try {
      setIsAuthenticating(true);
      setBiometricAttempted(true);

      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: t('auth.authenticateToAccess'),
        cancelButtonText: t('auth.usePin'),
      });

      if (success) {
        onUnlock();
      }
    } catch (error) {
      console.error('[AppLockScreen] Biometric authentication error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinPress = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 6) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const verifyPin = async (pinToVerify: string) => {
    try {
      const response = await settingsService.verifyPin(pinToVerify);

      if (response.success) {
        onUnlock();
      } else {
        
        setError(t('auth.incorrectPin'));
        Vibration.vibrate(400);
        shake();
        setTimeout(() => {
          setPin('');
          setError('');
        }, 1000);
      }
    } catch (error) {
      console.error('[AppLockScreen] Error verifying PIN:', error);
      setError(t('auth.failedToVerifyPin'));
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

  const renderPinDots = () => {
    return (
      <Animated.View
        style={[
          styles.pinDotsContainer,
          {
            transform: [{ translateX: shakeAnimation }],
          },
        ]}
      >
        {[0, 1, 2, 3, 4, 5].map(index => (
          <View
            key={index}
            style={[styles.pinDot, index < pin.length && styles.pinDotFilled]}
          />
        ))}
      </Animated.View>
    );
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      [biometricAvailable ? 'bio' : '', '0', 'del'],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === '') {
                return <View key={keyIndex} style={styles.keypadButton} />;
              }

              if (key === 'bio') {
                return (
                  <TouchableOpacity
                    key={keyIndex}
                    style={styles.keypadButton}
                    onPress={authenticateWithBiometric}
                    activeOpacity={0.7}
                    disabled={isAuthenticating}
                  >
                    <Text style={styles.keypadButtonTextBio}>👆</Text>
                  </TouchableOpacity>
                );
              }

              if (key === 'del') {
                return (
                  <TouchableOpacity
                    key={keyIndex}
                    style={styles.keypadButton}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keypadButtonTextDel}>⌫</Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={keyIndex}
                  style={styles.keypadButton}
                  onPress={() => handlePinPress(key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keypadButtonText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={styles.appName}>WalletHaven</Text>
      </View>

      {}
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.enterPin')}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {renderPinDots()}
      </View>

      {}
      {renderKeypad()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  appName: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 40,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginBottom: 20,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.textSecondary + '40',
  },
  pinDotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  keypad: {
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  keypadButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonText: {
    fontSize: 28,
    fontWeight: '400',
    color: COLORS.text,
  },
  keypadButtonTextBio: {
    fontSize: 32,
  },
  keypadButtonTextDel: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
});

export default AppLockScreen;
