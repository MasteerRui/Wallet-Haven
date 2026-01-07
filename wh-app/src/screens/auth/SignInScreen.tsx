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
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Eye, EyeSlash, CloseCircle, ArrowLeft } from 'iconsax-react-nativejs';
import Svg, { Path, G, Defs, ClipPath, Rect } from 'react-native-svg';
import { getApiUrl, API_ENDPOINTS } from '../../constants/config';
import OTPInput from '../../components/auth/OTPInput';
import { signInStyles as styles } from '../../styles/signInStyles';
import GoogleSignInWebView from '../../components/auth/GoogleSignInWebView';
import { useToast } from '../../hooks/useToast';
import { useTranslation } from '../../hooks/useTranslation';

interface SignInScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: (sessionData?: any) => void;
}

const SignInScreen: React.FC<SignInScreenProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const containerScale = useRef(new Animated.Value(1.1)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const closeButtonOpacity = useRef(new Animated.Value(0)).current;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const animationRef = useRef<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();
  const [resendTimer, setResendTimer] = useState(60);
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); 
  const [showGoogleWebView, setShowGoogleWebView] = useState(false);

  const [errors, setErrors] = useState({
    email: false as boolean | string,
    password: false as boolean | string,
    newPassword: false as boolean | string,
    confirmPassword: false as boolean | string,
  });

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    if (isVisible && !isAnimating && !isForgotPasswordView) {
      const timer = setTimeout(() => {
        if (emailRef.current) {
          emailRef.current.focus();
        }
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isVisible, isAnimating, isForgotPasswordView]);

  useEffect(() => {
    if (isVisible && !isAnimating && isForgotPasswordView) {
      const timer = setTimeout(() => {
        if (forgotPasswordStep === 1 && emailRef.current) {
          emailRef.current.focus();
        } else if (forgotPasswordStep === 3 && newPasswordRef.current) {
          newPasswordRef.current.focus();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isForgotPasswordView, forgotPasswordStep, isAnimating, isVisible]);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0 && isForgotPasswordView && forgotPasswordStep === 2) {
      interval = setInterval(() => {
        setResendTimer(prevTimer => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, isForgotPasswordView, forgotPasswordStep]);

  const handleSubmit = async () => {
    
    const newErrors = {
      email: !email.trim()
        ? 'required'
        : !isValidEmail(email.trim())
        ? 'invalid'
        : false,
      password: !password.trim() ? 'required' : false,
      newPassword: false,
      confirmPassword: false,
    };

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      if (newErrors.email === 'required') {
        showError(t('errors.emailRequired') || 'Email is required');
      } else if (newErrors.email === 'invalid') {
        showError(t('errors.invalidEmail') || 'Please enter a valid email');
      }
      if (newErrors.password === 'required') {
        showError(t('errors.passwordRequired') || 'Password is required');
      }
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.auth.signin), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.data.needsVerification) {
          
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

            if (codeResult.success) {
              showSuccess(t('auth.verificationCodeSent') || 'Verification code sent! Please check your email.');
            } else {
              showError(
                (t('errors.verificationCodeFailed') || 'Failed to send verification code: ') +
                  codeResult.message,
              );
            }
          } catch (codeError) {
            console.error('Error sending verification code:', codeError);
            showError(t('errors.contactSupport') || 'Please verify your email first. Please contact support.');
          }
        } else {
          showSuccess(t('success.signInSuccess') || 'Signed in successfully!');
          if (onSuccess) {
            setTimeout(() => {
              onSuccess(result);
            }, 500);
          }
        }
      } else {
        showError(result.message || 'Falha ao iniciar sessão');
      }
    } catch (error) {
      showError('Ocorreu um erro. Por favor tenta novamente.');
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    setIsAnimating(true);

    Animated.timing(formOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      setIsForgotPasswordView(true);
      setForgotPasswordStep(1);
      setErrors({
        email: false,
        password: false,
        newPassword: false,
        confirmPassword: false,
      });

      setTimeout(() => {
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }).start(() => {
          setIsAnimating(false);
        });
      }, 50);
    });
  };

  const handleBackToSignIn = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    setIsAnimating(true);

    Animated.timing(formOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      setIsForgotPasswordView(false);
      setForgotPasswordStep(1);
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setErrors({
        email: false,
        password: false,
        newPassword: false,
        confirmPassword: false,
      });

      setTimeout(() => {
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }).start(() => {
          setIsAnimating(false);
        });
      }, 50);
    });
  };

  const handleNextStep = () => {
    setIsAnimating(true);

    Animated.timing(formOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      setForgotPasswordStep(forgotPasswordStep + 1);

      setTimeout(() => {
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }).start(() => {
          setIsAnimating(false);
        });
      }, 50);
    });
  };

  const handlePreviousStep = () => {
    setIsAnimating(true);

    Animated.timing(formOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      setForgotPasswordStep(forgotPasswordStep - 1);

      setTimeout(() => {
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }).start(() => {
          setIsAnimating(false);
        });
      }, 50);
    });
  };

  const handleRequestReset = async () => {
    if (!email || !isValidEmail(email)) {
      setErrors({
        ...errors,
        email: email ? 'invalid' : 'required',
      });
      if (!email) {
        showError(t('errors.emailRequired') || 'Email is required');
      } else {
        showError(t('errors.invalidEmail') || 'Please enter a valid email');
      }
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        getApiUrl(API_ENDPOINTS.passwordReset.request),
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
        handleNextStep();
        showSuccess(t('auth.verificationCodeSent') || 'Verification code sent! Check your email.');
      } else {
        showError(result.message || 'Falha ao enviar código de verificação');
      }
    } catch (error) {
      showError('Ocorreu um erro. Por favor tenta novamente.');
      console.error('Request reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const newErrors = {
      email: false,
      password: false,
      newPassword: !newPassword.trim()
        ? 'required'
        : newPassword.length < 8
        ? 'short'
        : false,
      confirmPassword: !confirmPassword.trim()
        ? 'required'
        : newPassword !== confirmPassword
        ? 'mismatch'
        : false,
    };

    if (newErrors.newPassword || newErrors.confirmPassword) {
      setErrors(newErrors);
      if (newErrors.newPassword === 'required') {
        showError(t('errors.passwordRequired') || 'Password is required');
      } else if (newErrors.newPassword === 'short') {
        showError(t('errors.passwordMinLength') || 'Password must be at least 8 characters long');
      }
      if (newErrors.confirmPassword === 'required') {
        showError(t('errors.confirmPasswordRequired') || 'Please confirm your password');
      } else if (newErrors.confirmPassword === 'mismatch') {
        showError(t('errors.passwordMismatch') || 'Passwords do not match');
      }
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        getApiUrl(API_ENDPOINTS.passwordReset.reset),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            code: verificationCode,
            newPassword,
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        showSuccess(t('success.passwordResetSuccess') || 'Password reset successfully! Please sign in with your new password.');
        handleBackToSignIn();
      } else {
        showError(
          result.message ||
            'Falha ao redefinir a palavra-passe. Por favor tenta novamente.',
        );
      }
    } catch (error) {
      showError('Ocorreu um erro. Por favor tenta novamente.');
      console.error('Reset password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    if (isVisible) {
      setIsAnimating(true);
      containerOpacity.setValue(0);
      containerScale.setValue(1.1);
      formTranslateY.setValue(50);
      formOpacity.setValue(0);
      closeButtonOpacity.setValue(0);
      setIsForgotPasswordView(false);
      setForgotPasswordStep(1);
      setErrors({
        email: false,
        password: false,
        newPassword: false,
        confirmPassword: false,
      });

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

      animationRef.current.start(() => {
        setIsAnimating(false);
      });
    }
  }, [isVisible]);

  const handleGoogleSignInPress = () => {
    if (isLoading) return;
    setShowGoogleWebView(true);
  };

  const handleGoogleSuccess = (sessionData: any) => {
    showSuccess('Iniciado sessão com Google com sucesso!');
    if (onSuccess) {
      setTimeout(() => {
        onSuccess(sessionData);
      }, 500);
    }
  };

  const handleClose = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    setIsAnimating(true);

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
      setIsAnimating(false);
    });
  };

  const renderForgotPasswordStep = () => {
    switch (forgotPasswordStep) {
      case 1:
        return (
          <View style={styles.forgotPasswordView}>
            <Text style={styles.title}>{t('auth.resetPassword')}</Text>
            <Text style={styles.forgotPasswordDescription}>
              {t('auth.resetPasswordDescription')}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                ref={emailRef}
                style={[styles.input, errors.email && styles.inputError]}
                placeholder={t('auth.email')}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                selectionColor="#1C1C1E"
                value={email}
                returnKeyType="done"
                onSubmitEditing={handleRequestReset}
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

            <Animated.View style={{ opacity: closeButtonOpacity }}>
              <View style={styles.bottomButtonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToSignIn}
                >
                  <ArrowLeft size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    {
                      width: '83%',
                      opacity: errors.email || isLoading ? 0.5 : 1,
                    },
                  ]}
                  disabled={!!errors.email || isLoading}
                  onPress={handleRequestReset}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.continueButtonText}>
                      Enviar Código de Verificação
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        );
      case 2:
        return (
          <View style={styles.forgotPasswordView}>
            <Text style={styles.title}>{t('auth.enterVerificationCode')}</Text>
            <Text style={styles.forgotPasswordDescription}>
              {t('auth.verificationCodeSent', { email })}
            </Text>

            <View style={styles.inputContainer}>
              <OTPInput
                codeLength={6}
                onCodeFilled={code => {
                  setVerificationCode(code);
                }}
                onCodeChanged={code => {
                  setVerificationCode(code);
                }}
              />
            </View>

            <TouchableOpacity
              style={styles.resendCodeContainer}
              disabled={resendTimer > 0}
              onPress={handleRequestReset}
            >
              <Text style={styles.resendCodeText}>
                {resendTimer > 0
                  ? t('auth.resendIn', { seconds: resendTimer })
                  : t('auth.resend')}
              </Text>
            </TouchableOpacity>

            <Animated.View style={{ opacity: closeButtonOpacity }}>
              <View style={styles.bottomButtonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handlePreviousStep}
                >
                  <ArrowLeft size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    {
                      width: '83%',
                      opacity: verificationCode.length < 6 ? 0.5 : 1,
                    },
                  ]}
                  disabled={verificationCode.length < 6}
                  onPress={handleNextStep}
                >
                  <Text style={styles.continueButtonText}>
                    Verificar Código
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        );
      case 3:
        return (
          <View style={styles.forgotPasswordView}>
            <Text style={styles.title}>Criar Nova Palavra-passe</Text>
            <Text style={styles.forgotPasswordDescription}>
              Por favor insere a tua nova palavra-passe abaixo.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nova Palavra-passe</Text>
              <View
                style={[
                  styles.passwordContainer,
                  errors.newPassword && styles.inputError,
                ]}
              >
                <TextInput
                  ref={newPasswordRef}
                  style={styles.passwordInput}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  selectionColor="#1C1C1E"
                  value={newPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                  onChangeText={text => {
                    setNewPassword(text);
                    if (text.trim()) {
                      if (text.length < 8) {
                        setErrors({ ...errors, newPassword: 'short' });
                      } else {
                        setErrors({ ...errors, newPassword: false });
                      }
                    } else {
                      setErrors({ ...errors, newPassword: 'required' });
                    }

                    if (confirmPassword && text !== confirmPassword) {
                      setErrors(prev => ({
                        ...prev,
                        confirmPassword: 'mismatch',
                      }));
                    } else if (confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: false }));
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
              <View
                style={[
                  styles.passwordContainer,
                  errors.confirmPassword && styles.inputError,
                ]}
              >
                <TextInput
                  ref={confirmPasswordRef}
                  style={styles.passwordInput}
                  placeholder={t('auth.confirmNewPassword')}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  selectionColor="#1C1C1E"
                  value={confirmPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                  onChangeText={text => {
                    setConfirmPassword(text);
                    if (!text.trim()) {
                      setErrors({ ...errors, confirmPassword: 'required' });
                    } else if (newPassword !== text) {
                      setErrors({ ...errors, confirmPassword: 'mismatch' });
                    } else {
                      setErrors({ ...errors, confirmPassword: false });
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlash size={24} color="#6B7280" />
                  ) : (
                    <Eye size={24} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <Animated.View style={{ opacity: closeButtonOpacity }}>
              <View style={styles.bottomButtonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handlePreviousStep}
                >
                  <ArrowLeft size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    {
                      width: '83%',
                      opacity:
                        errors.newPassword ||
                        errors.confirmPassword ||
                        !newPassword ||
                        !confirmPassword ||
                        isLoading
                          ? 0.5
                          : 1,
                    },
                  ]}
                  disabled={
                    !!errors.newPassword ||
                    !!errors.confirmPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    isLoading
                  }
                  onPress={handleResetPassword}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.continueButtonText}>
                      {t('auth.resetPasswordButton')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        );
      default:
        return null;
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

              <View style={styles.headerRight} />
            </View>

            <Animated.View
              style={{
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
                flex: 1,
              }}
            >
              {isForgotPasswordView ? (
                renderForgotPasswordStep()
              ) : (
                <>
                  <Text style={styles.title}>{t('auth.welcomeBack')}</Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t('auth.email')}</Text>
                    <TextInput
                      ref={emailRef}
                      style={[styles.input, errors.email && styles.inputError]}
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
                        placeholder={t('auth.enterYourPassword')}
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!showPassword}
                        selectionColor="#1C1C1E"
                        value={password}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                        onChangeText={text => {
                          setPassword(text);
                          if (text.trim()) {
                            setErrors({ ...errors, password: false });
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
                    <TouchableOpacity
                      style={styles.forgotPasswordContainer}
                      onPress={handleForgotPassword}
                    >
                      <Text style={styles.forgotPasswordText}>
                        {t('auth.forgotPassword')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {}
                  <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t('auth.or')}</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {}
                  <TouchableOpacity
                    style={[
                      styles.googleButton,
                      {
                        opacity: isLoading ? 0.5 : 1,
                      },
                    ]}
                    disabled={isLoading}
                    onPress={handleGoogleSignInPress}
                  >
                    <Svg
                      width={24}
                      height={24}
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ marginRight: 10 }}
                    >
                      <G clipPath="url(#clip0_4418_4086)">
                        <Path
                          d="M3.26922 7.51025C2.58922 8.87025 2.19922 10.3902 2.19922 12.0002C2.19922 13.6102 2.58922 15.1302 3.26922 16.4902L3.27922 16.4803V16.4902C4.91922 19.7602 8.28922 22.0002 12.1992 22.0002C14.8992 22.0002 17.1692 21.1102 18.8192 19.5802C20.7092 17.8402 21.7992 15.2702 21.7992 12.2202C21.7992 11.4002 21.7292 10.8002 21.5892 10.1802H12.1992V13.8903H17.7092C17.5992 14.8103 16.9992 16.2002 15.6692 17.1302C14.8292 17.7202 13.6892 18.1302 12.1992 18.1302C9.55922 18.1302 7.30922 16.3902 6.50922 13.9702C6.29922 13.3502 6.17922 12.6802 6.17922 11.9902C6.17922 11.3002 6.29922 10.6303 6.49922 10.0103C6.55922 9.83025 6.62922 9.64025 6.70922 9.47025C7.65922 7.34025 9.75922 5.86023 12.1992 5.86023C14.0792 5.86023 15.3392 6.67025 16.0692 7.35025L18.8892 4.59024C17.1592 2.98024 14.8992 1.99023 12.1992 1.99023C10.0492 1.99023 8.05922 2.67025 6.42922 3.82025"
                          stroke="#1A1A1A"
                          strokeWidth={1.5}
                          strokeMiterlimit={10}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </G>
                      <Defs>
                        <ClipPath id="clip0_4418_4086">
                          <Rect width={24} height={24} fill="#fff" />
                        </ClipPath>
                      </Defs>
                    </Svg>
                    <Text style={styles.googleButtonText}>
                      {t('auth.continueWithGoogle')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>

            {!isForgotPasswordView && (
              <Animated.View style={{ opacity: closeButtonOpacity }}>
                <View style={styles.bottomButtonContainer}>
                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      {
                        width: '100%',
                        opacity:
                          errors.email ||
                          errors.password ||
                          !email ||
                          !password ||
                          isLoading
                            ? 0.5
                            : 1,
                      },
                    ]}
                    disabled={
                      !!errors.email ||
                      !!errors.password ||
                      !email ||
                      !password ||
                      isLoading
                    }
                    onPress={handleSubmit}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.continueButtonText}>
                        {t('auth.signIn')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {}
      <GoogleSignInWebView
        isVisible={showGoogleWebView}
        onClose={() => setShowGoogleWebView(false)}
        onSuccess={handleGoogleSuccess}
      />
    </Animated.View>
  );
};

export default SignInScreen;
