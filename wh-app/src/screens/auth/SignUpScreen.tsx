import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Easing,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Eye, EyeSlash, CloseCircle, ArrowLeft } from 'iconsax-react-nativejs';
import { getApiUrl, API_ENDPOINTS } from '../../constants/config';
import OTPInput from '../../components/auth/OTPInput';
import { signUpStyles as styles } from '../../styles/signUpStyles';
import { useToast } from '../../hooks/useToast';
import PinInputModal from '../../components/common/PinInputModal';
import settingsService from '../../services/settingsService';
import { useTranslation } from '../../hooks/useTranslation';
import ReactNativeBiometrics from 'react-native-biometrics';

interface SignUpScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: (sessionData?: any) => void;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({
    firstName: false as boolean | string,
    lastName: false as boolean | string,
    email: false as boolean | string,
    password: false as boolean | string,
  });
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const { showSuccess, showError } = useToast();
  const { t, changeLanguage } = useTranslation();

  const containerOpacity = useRef(new Animated.Value(0)).current;
  const containerScale = useRef(new Animated.Value(1.1)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const closeButtonOpacity = useRef(new Animated.Value(0)).current;

  const [resendTimer, setResendTimer] = useState(60);
  const [isOtpComplete, setIsOtpComplete] = useState(false);

  const progressIndicator1 = useRef(new Animated.Value(100)).current;
  const progressIndicator2 = useRef(new Animated.Value(0)).current;
  const progressIndicator3 = useRef(new Animated.Value(0)).current;
  const progressIndicator4 = useRef(new Animated.Value(0)).current;
  const progressIndicator5 = useRef(new Animated.Value(0)).current;

  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(0); 
  const animationRef = useRef<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'portuguese'>('english');
  const [wantsPin, setWantsPin] = useState<boolean | null>(null); 
  const [wantsBiometric, setWantsBiometric] = useState<boolean | null>(null);
  const [onboardingPin, setOnboardingPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    if (isVisible && !isAnimating && step === 0) {
      const timer = setTimeout(() => {
        if (firstNameRef.current) {
          firstNameRef.current.focus();
        }
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isVisible, isAnimating, step]);

  useEffect(() => {
    if (isVisible && !isAnimating && step === 1) {
      const timer = setTimeout(() => {
        if (emailRef.current) {
          emailRef.current.focus();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [step, isAnimating, isVisible]);

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    if (isVisible) {
      containerOpacity.setValue(0);
      containerScale.setValue(1.1);
      formTranslateY.setValue(50);
      formOpacity.setValue(0);
      closeButtonOpacity.setValue(0);

      progressIndicator1.setValue(100);
      progressIndicator2.setValue(step >= 1 ? 100 : 0);
      progressIndicator3.setValue(step >= 2 ? 100 : 0);

      animationRef.current = Animated.sequence([
        Animated.parallel([
          Animated.timing(containerOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(containerScale, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
        ]),

        Animated.timing(closeButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),

        Animated.parallel([
          Animated.timing(formTranslateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]);

      animationRef.current.start();
    } else {
      setShowPassword(false);
      setStep(0);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setEnteredCode('');
      setErrors({
        firstName: false,
        lastName: false,
        email: false,
        password: false,
      });
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && !isAnimating) {
      progressIndicator1.setValue(100);
      progressIndicator2.setValue(step >= 1 ? 100 : 0);
      progressIndicator3.setValue(step >= 2 ? 100 : 0);
    }
  }, [isVisible, isAnimating, step]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0 && step === 2) {
      interval = setInterval(() => {
        setResendTimer(prevTimer => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, step]);

  const handleClose = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    animationRef.current = Animated.sequence([
      Animated.parallel([
        Animated.timing(formTranslateY, {
          toValue: 50,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(formOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(closeButtonOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),

      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(containerScale, {
          toValue: 1.1,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ]),
    ]);

    animationRef.current.start(() => {
      if (onClose) onClose();
    });
  };

  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const rnBiometrics = new ReactNativeBiometrics();
        const { available } = await rnBiometrics.isSensorAvailable();
        setBiometricAvailable(available);
      } catch (error) {
        console.error('Error checking biometric availability:', error);
        setBiometricAvailable(false);
      }
    };
    checkBiometric();
  }, []);

  const updateProgressIndicators = (newStep: number) => {
    progressIndicator1.setValue(100);

    Animated.timing(progressIndicator2, {
      toValue: newStep >= 1 ? 100 : 0,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.cubic),
    }).start();

    Animated.timing(progressIndicator3, {
      toValue: newStep >= 2 ? 100 : 0,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.cubic),
    }).start();

    Animated.timing(progressIndicator4, {
      toValue: newStep >= 3 ? 100 : 0,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.cubic),
    }).start();

    Animated.timing(progressIndicator5, {
      toValue: newStep >= 4 ? 100 : 0,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.cubic),
    }).start();
  };

  const handleContinue = async () => {
    if (isAnimating) return;

    if (step === 0) {
      if (!firstName.trim() || !lastName.trim()) {
        setErrors({
          ...errors,
          firstName: !firstName.trim() ? 'required' : false,
          lastName: !lastName.trim() ? 'required' : false,
        });
        if (!firstName.trim()) {
          showError('O primeiro nome é obrigatório');
        }
        if (!lastName.trim()) {
          showError('O último nome é obrigatório');
        }
        return;
      }

      setIsAnimating(true);

      Animated.timing(formOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        updateProgressIndicators(1);
        setStep(1);

        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          setIsAnimating(false);
        });
      });
    } else if (step === 1) {
      const newErrors = {
        firstName: false,
        lastName: false,
        email: !email.trim()
          ? 'required'
          : !isValidEmail(email.trim())
          ? 'invalid'
          : false,
        password: !password.trim()
          ? 'required'
          : password.length < 8
          ? 'short'
          : false,
      };

      if (newErrors.email || newErrors.password) {
        setErrors(newErrors);
        if (newErrors.email === 'required') {
          showError('O email é obrigatório');
        } else if (newErrors.email === 'invalid') {
          showError('Por favor insere um email válido');
        }
        if (newErrors.password === 'required') {
          showError('A palavra-passe é obrigatória');
        } else if (newErrors.password === 'short') {
          showError('A palavra-passe deve ter pelo menos 8 caracteres');
        }
        return;
      }

      setIsAnimating(true);
      setIsLoading(true);

      Animated.timing(formOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(async () => {
        try {
          
          const response = await fetch(getApiUrl(API_ENDPOINTS.auth.signup), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email.trim(),
              password,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            }),
          });

          const result = await response.json();

          if (!result.success) {
            showError(result.message || 'Falha ao criar conta');

            Animated.timing(formOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }).start(() => {
              setIsAnimating(false);
              setIsLoading(false);
            });
            return;
          }

          if (result.data?.needsVerification) {
            
            try {
              const codeResponse = await fetch(
                getApiUrl(API_ENDPOINTS.verification.sendCode),
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ email: email.trim() }),
                },
              );

              const codeResult = await codeResponse.json();

              if (!codeResult.success) {
                console.error(
                  'Failed to send verification code:',
                  codeResult.message,
                );
                showError(
                  'Conta criada mas falha ao enviar código de verificação. Por favor tenta iniciar sessão.',
                );
              }
            } catch (codeError) {
              console.error('Error sending verification code:', codeError);
            }

            setResendTimer(60);
            updateProgressIndicators(2);
            setStep(2);

            Animated.timing(formOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }).start(() => {
              setIsAnimating(false);
              setIsLoading(false);
            });
          } else {
            
            showSuccess('Conta criada com sucesso!');

            const session = result.data?.session || result.data;

            let userData = result.data?.user || {};

            if (!userData.name && !userData.first_name) {
              userData = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                name: `${firstName.trim()} ${lastName.trim()}`.trim(),
              };
            }
            
            const sessionData = {
              success: true,
              data: {
                user: userData,
                session: session,
              },
            };

            setIsLoading(false);
            if (onSuccess) {
              setTimeout(() => {
                onSuccess(sessionData);
              }, 500);
            }
          }
        } catch (error) {
          console.error('Error in signup process:', error);
          showError('Ocorreu um erro. Por favor tenta novamente.');

          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setIsAnimating(false);
            setIsLoading(false);
          });
        }
      });
    } else if (step === 2) {
      setIsLoading(true);

      try {
        
        const verifyResponse = await fetch(
          getApiUrl(API_ENDPOINTS.verification.verifyCode),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              code: enteredCode,
            }),
          },
        );

        const verifyResult = await verifyResponse.json();

        if (!verifyResult.success) {
          showError('Código de verificação inválido');
          setIsLoading(false);
          return;
        }

        showSuccess('Email verificado com sucesso!');

        let session = verifyResult.data?.session || (verifyResult.data?.access_token ? verifyResult.data : null);

        if (!session || !session.access_token) {
          try {
            const signInResponse = await fetch(getApiUrl(API_ENDPOINTS.auth.signin), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email.trim(),
                password: password,
              }),
            });

            const signInResult = await signInResponse.json();
            
            if (signInResult.success && signInResult.data?.session) {
              session = signInResult.data.session;
            } else {
            }
          } catch (signInError) {
            console.error('Error during auto sign in:', signInError);
            
          }
        }

        let userData = verifyResult.data?.user || {};

        if (!userData.name && !userData.first_name) {
          userData = {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          };
        }
        
        const sessionData = {
          success: true,
          data: {
            user: userData,
            ...(session && { session: session }), 
          },
        };

        setIsLoading(false);
        updateProgressIndicators(3);
        setStep(3);
        
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          setIsAnimating(false);
        });
      } catch (error) {
        console.error('Verification error:', error);
        showError('Ocorreu um erro. Por favor tenta novamente.');
      } finally {
        setIsLoading(false);
      }
    } else if (step === 3) {
      
      await changeLanguage(selectedLanguage);
      await settingsService.updatePreferences({ language: selectedLanguage });
      
      setIsAnimating(true);
      Animated.timing(formOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        updateProgressIndicators(4);
        setStep(4);
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          setIsAnimating(false);
        });
      });
    } else if (step === 4) {
      
      if (wantsPin === null) {
        showError('Por favor escolhe uma opção');
        return;
      }
      
      if (wantsPin) {
        
        setShowPinModal(true);
      } else {
        
        await completeOnboarding();
      }
    } else if (step === 5) {
      
      if (wantsBiometric === null) {
        showError('Por favor escolhe uma opção');
        return;
      }
      
      if (wantsBiometric && onboardingPin) {
        
        const response = await settingsService.setBiometric(true, onboardingPin);
        if (!response.success) {
          showError(response.message || 'Falha ao ativar autenticação biométrica');
        }
      }
      
      await completeOnboarding();
    }
  };

  const handlePinComplete = async (pin: string) => {
    setShowPinModal(false);
    setOnboardingPin(pin);

    const response = await settingsService.setPin(pin);
    if (!response.success) {
      showError(response.message || 'Falha ao definir PIN');
      return;
    }

    if (biometricAvailable) {
      setIsAnimating(true);
      Animated.timing(formOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        updateProgressIndicators(5);
        setStep(5);
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          setIsAnimating(false);
        });
      });
    } else {
      
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    
    const sessionData = {
      success: true,
      data: {
        user: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      },
    };
    
    if (onSuccess) {
      setTimeout(() => {
        onSuccess(sessionData);
      }, 500);
    }
  };

  const handleBack = () => {
    if (isAnimating || step === 0) return;

    setIsAnimating(true);

    Animated.timing(formOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      const newStep = step - 1;
      updateProgressIndicators(newStep);
      setStep(newStep);

      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setIsAnimating(false);
      });
    });
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    try {
      const response = await fetch(
        getApiUrl(API_ENDPOINTS.verification.resendCode),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        },
      );

      const result = await response.json();

      if (result.success) {
        setResendTimer(60);
        showSuccess('Código reenviado com sucesso!');
      } else {
        showError(result.message || 'Falha ao reenviar código de verificação');
      }
    } catch (error) {
      console.error('Error resending code:', error);
      showError('Ocorreu um erro. Por favor tenta novamente.');
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.content}>
            <View style={styles.headerContainer}>
              <Animated.View style={{ opacity: closeButtonOpacity }}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseCircle size={24} color="#1A1A1A" />
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={{ opacity: closeButtonOpacity }}>
                <View style={styles.progressBar}>
                  <View style={styles.progressIndicatorContainer}>
                    <Animated.View
                      style={[
                        styles.progressIndicatorFill,
                        {
                          width: progressIndicator1.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressIndicatorContainer}>
                    <Animated.View
                      style={[
                        styles.progressIndicatorFill,
                        {
                          width: progressIndicator2.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressIndicatorContainer}>
                    <Animated.View
                      style={[
                        styles.progressIndicatorFill,
                        {
                          width: progressIndicator3.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                </View>
              </Animated.View>

              <View style={styles.headerRight} />
            </View>

            {}
            {(step === 0 || step === 1 || step === 2 || step === 3 || step === 4 || step === 5) && (
              <Animated.View
                style={{
                  opacity: formOpacity,
                  transform: [{ translateY: formTranslateY }],
                  flex: 1,
                }}
              >
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {step === 0 && (
                    <View style={styles.formStep}>
                      <Text style={styles.title}>{t('auth.fullName')}</Text>
                      
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('auth.firstName')}</Text>
                        <TextInput
                          ref={firstNameRef}
                          style={[
                            styles.input,
                            errors.firstName && styles.inputError,
                          ]}
                          placeholder={t('auth.enterFirstName')}
                          placeholderTextColor="#9CA3AF"
                          autoCapitalize="words"
                          selectionColor="#1C1C1E"
                          value={firstName}
                          returnKeyType="next"
                          onSubmitEditing={() => lastNameRef.current?.focus()}
                          blurOnSubmit={false}
                          onChangeText={text => {
                            setFirstName(text);
                            if (text.trim()) {
                              setErrors({ ...errors, firstName: false });
                            } else {
                              setErrors({ ...errors, firstName: 'required' });
                            }
                          }}
                        />
                      </View>
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('auth.lastName')}</Text>
                        <TextInput
                          ref={lastNameRef}
                          style={[
                            styles.input,
                            errors.lastName && styles.inputError,
                          ]}
                          placeholder={t('auth.enterLastName')}
                          placeholderTextColor="#9CA3AF"
                          autoCapitalize="words"
                          selectionColor="#1C1C1E"
                          value={lastName}
                          returnKeyType="next"
                          onSubmitEditing={() => emailRef.current?.focus()}
                          blurOnSubmit={false}
                          onChangeText={text => {
                            setLastName(text);
                            if (text.trim()) {
                              setErrors({ ...errors, lastName: false });
                            } else {
                              setErrors({ ...errors, lastName: 'required' });
                            }
                          }}
                        />
                      </View>
                    </View>
                  )}

                {step === 1 && (
                  <View style={styles.formStep}>
                    <Text style={styles.title}>{t('auth.emailAndPassword')}</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>{t('auth.email')}</Text>
                      <TextInput
                        ref={emailRef}
                        style={[
                          styles.input,
                          errors.email && styles.inputError,
                        ]}
                        placeholder={t('auth.email')}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        selectionColor="#1C1C1E"
                        value={email}
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        blurOnSubmit={false}
                        onChangeText={text => {
                          setEmail(text);
                          if (text.trim()) {
                            if (!isValidEmail(text.trim())) {
                              setErrors({ ...errors, email: 'invalid' });
                            } else {
                              setErrors({ ...errors, email: false });
                            }
                          } else {
                            setErrors({ ...errors, email: 'required' });
                          }
                        }}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>{t('auth.password')}</Text>
                      <View
                        style={[
                          styles.passwordContainer,
                          errors.password && styles.inputError,
                        ]}
                      >
                        <TextInput
                          ref={passwordRef}
                          style={styles.passwordInput}
                          placeholder={t('auth.minimumCharacters')}
                          placeholderTextColor="#9CA3AF"
                          secureTextEntry={!showPassword}
                          selectionColor="#1C1C1E"
                          value={password}
                          returnKeyType="next"
                          onSubmitEditing={() =>
                            confirmPasswordRef.current?.focus()
                          }
                          blurOnSubmit={false}
                          onChangeText={text => {
                            setPassword(text);
                            if (text.trim()) {
                              if (text.length < 8) {
                                setErrors({ ...errors, password: 'short' });
                              } else {
                                setErrors({ ...errors, password: false });
                              }
                            } else {
                              setErrors({ ...errors, password: 'required' });
                            }
                          }}
                        />
                        <TouchableOpacity
                          style={styles.eyeIcon}
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeSlash size={24} color="#6B7280" />
                          ) : (
                            <Eye size={24} color="#6B7280" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {step === 2 && (
                  <View style={styles.formStep}>
                    <Text style={styles.title}>{t('auth.verifyYourEmail')}</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t('auth.enterVerificationCodeSent')}
                      </Text>
                      <Text style={styles.labelSecondary}>{email}</Text>
                      <OTPInput
                        codeLength={6}
                        onCodeFilled={code => {
                          setEnteredCode(code);
                          setIsOtpComplete(true);
                        }}
                        onCodeChanged={code => {
                          setEnteredCode(code);
                          setIsOtpComplete(code.length === 6);
                        }}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={handleResendCode}
                      disabled={resendTimer > 0}
                    >
                      <Text style={styles.label}>
                        {t('auth.didntReceiveCode')}{' '}
                        <Text
                          style={{
                            color: resendTimer > 0 ? '#666' : '#582FFF',
                          }}
                        >
                          {resendTimer > 0
                            ? t('auth.resendIn', { seconds: resendTimer })
                            : t('auth.resend')}
                        </Text>
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.labelSecondaryTwo}>
                      {t('auth.noteCheckSpam')}
                    </Text>
                  </View>
                )}

                {}
                {step === 3 && (
                  <View style={styles.formStep}>
                    <Text style={styles.title}>{t('auth.chooseLanguage')}</Text>
                    <Text style={styles.subtitle}>
                      {t('auth.selectLanguagePreference')}
                    </Text>
                    
                    <TouchableOpacity
                      style={[
                        styles.languageOption,
                        selectedLanguage === 'english' && styles.languageOptionSelected,
                      ]}
                      onPress={() => setSelectedLanguage('english')}
                    >
                      <Text style={[
                        styles.languageOptionText,
                        selectedLanguage === 'english' && styles.languageOptionTextSelected,
                      ]}>
                        {t('auth.english')}
                      </Text>
                      {selectedLanguage === 'english' && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkIcon}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.languageOption,
                        selectedLanguage === 'portuguese' && styles.languageOptionSelected,
                      ]}
                      onPress={() => setSelectedLanguage('portuguese')}
                    >
                      <Text style={[
                        styles.languageOptionText,
                        selectedLanguage === 'portuguese' && styles.languageOptionTextSelected,
                      ]}>
                        {t('auth.portuguese')}
                      </Text>
                      {selectedLanguage === 'portuguese' && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkIcon}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {}
                {step === 4 && (
                  <View style={styles.formStep}>
                    <Text style={styles.title}>{t('auth.pinSecurity')}</Text>
                    <Text style={styles.subtitle}>
                      {t('auth.setupPinQuestion')}
                    </Text>
                    
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        wantsPin === true && styles.optionButtonSelected,
                      ]}
                      onPress={() => setWantsPin(true)}
                    >
                      <Text style={[
                        styles.optionButtonText,
                        wantsPin === true && styles.optionButtonTextSelected,
                      ]}>
                        {t('auth.yesSetupPin')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        wantsPin === false && styles.optionButtonSelected,
                      ]}
                      onPress={() => setWantsPin(false)}
                    >
                      <Text style={[
                        styles.optionButtonText,
                        wantsPin === false && styles.optionButtonTextSelected,
                      ]}>
                        {t('auth.noMaybeLater')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {}
                {step === 5 && (
                  <View style={styles.formStep}>
                    <Text style={styles.title}>{t('auth.biometricAuth')}</Text>
                    <Text style={styles.subtitle}>
                      {t('auth.useBiometricQuestion', { 
                        biometricType: Platform.OS === 'ios' ? t('auth.faceId') : t('auth.fingerprint')
                      })}
                    </Text>
                    
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        wantsBiometric === true && styles.optionButtonSelected,
                      ]}
                      onPress={() => setWantsBiometric(true)}
                    >
                      <Text style={[
                        styles.optionButtonText,
                        wantsBiometric === true && styles.optionButtonTextSelected,
                      ]}>
                        {t('auth.yesEnableBiometric')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        wantsBiometric === false && styles.optionButtonSelected,
                      ]}
                      onPress={() => setWantsBiometric(false)}
                    >
                      <Text style={[
                        styles.optionButtonText,
                        wantsBiometric === false && styles.optionButtonTextSelected,
                      ]}>
                        {t('auth.noPinOnly')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                </ScrollView>
              </Animated.View>
            )}

            <Animated.View style={{ opacity: closeButtonOpacity }}>
              <View style={styles.bottomButtonContainer}>
                {step > 0 && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                    disabled={isAnimating}
                  >
                    <ArrowLeft size={24} color="#1A1A1A" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    {
                      width: step === 0 ? '100%' : '83%',
                      opacity:
                        (step === 2 && !isOtpComplete) ||
                        isLoading ||
                        isAnimating
                          ? 0.5
                          : 1,
                    },
                  ]}
                  onPress={handleContinue}
                  disabled={
                    (step === 2 && !isOtpComplete) || isLoading || isAnimating
                  }
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.continueButtonText}>
                      {step === 2 
                        ? t('auth.verify')
                        : step === 3 
                        ? t('auth.continue')
                        : step === 4 
                        ? t('auth.continue')
                        : step === 5 
                        ? t('auth.complete')
                        : t('auth.continue')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

    </Animated.View>
  );
};

export default SignUpScreen;
