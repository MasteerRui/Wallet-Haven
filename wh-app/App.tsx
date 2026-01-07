import React, { useState, useEffect, useRef } from 'react';
import {
  StatusBar,
  ActivityIndicator,
  View,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import { getApiUrl, API_ENDPOINTS } from './src/constants/config';
import AppLockScreen from './src/components/auth/AppLockScreen';
import PrivacyScreen from './src/components/common/PrivacyScreen';
import settingsService from './src/services/settingsService';
import apiService from './src/services/apiService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [requiresLock, setRequiresLock] = useState(false);
  const [showPrivacyScreen, setShowPrivacyScreen] = useState(false);
  const [lastUnlockTime, setLastUnlockTime] = useState<number>(Date.now());

  const isAuthenticatedRef = useRef(isAuthenticated);
  const requiresLockRef = useRef(requiresLock);
  const lastUnlockTimeRef = useRef(lastUnlockTime);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    requiresLockRef.current = requiresLock;
  }, [requiresLock]);

  useEffect(() => {
    lastUnlockTimeRef.current = lastUnlockTime;
  }, [lastUnlockTime]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = apiService.onSessionExpired(async () => {
      
      await AsyncStorage.removeItem('userSettings');
      await AsyncStorage.removeItem('has_pin');
      await AsyncStorage.removeItem('biometric_enabled');
      await AsyncStorage.removeItem('language');
      setIsAuthenticated(false);
      setIsLocked(false);
      setRequiresLock(false);
      setShowPrivacyScreen(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const previousState = appStateRef.current;

    if (nextAppState === 'inactive') {
      if (isAuthenticatedRef.current) {
        setShowPrivacyScreen(true);
      } else {
      }
    }

    if (nextAppState === 'active') {

      const comingFromBackground = previousState === 'background';
      const comingFromInactive = previousState === 'inactive';

      const timeSinceUnlock = Date.now() - lastUnlockTimeRef.current;
      const justUnlocked = timeSinceUnlock < 5000; 

      let actuallyHasPin = requiresLockRef.current;
      if (comingFromBackground || comingFromInactive) {
        try {
          actuallyHasPin = await settingsService.hasPin();
        } catch (error) {
          console.error('[App] Error re-verifying PIN:', error);
        }
      }

      if (
        (comingFromBackground || comingFromInactive) &&
        isAuthenticatedRef.current &&
        actuallyHasPin &&
        !justUnlocked
      ) {
        
        setIsLocked(true);
        
      } else {
        
        setShowPrivacyScreen(false);

        if (justUnlocked) {
        }
      }
    }

    if (nextAppState === 'background') {
      if (isAuthenticatedRef.current) {
        setShowPrivacyScreen(true);
      }
    }

    appStateRef.current = nextAppState;
  };

  const checkAuthStatus = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');

      if (userToken) {
        setIsAuthenticated(true);

        await settingsService.initializeSettings();

        await settingsService.debugPinSettings();

        const hasPin = await settingsService.hasPin();

        setRequiresLock(hasPin);

        if (hasPin) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
      } else {
        
        await AsyncStorage.removeItem('has_pin');
        await AsyncStorage.removeItem('biometric_enabled');
        await AsyncStorage.removeItem('language');
        await AsyncStorage.removeItem('userSettings');
      }
    } catch (error) {
      console.error('❌ [App] Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (sessionData?: any) => {
    try {

      if (sessionData) {
        
        if (
          sessionData.data &&
          sessionData.data.user &&
          sessionData.data.session
        ) {

          const user = sessionData.data.user;
          const session = sessionData.data.session;

          await AsyncStorage.setItem('userToken', session.access_token);
          await AsyncStorage.setItem('refreshToken', session.refresh_token);

          let userName = 'User';
          if (user.name && user.name.trim()) {
            userName = user.name.trim();
          } else if (user.firstName && user.lastName) {
            
            userName =
              `${user.firstName.trim()} ${user.lastName.trim()}`.trim();
          } else if (user.first_name || user.last_name) {
            
            const firstName = user.first_name?.trim() || '';
            const lastName = user.last_name?.trim() || '';
            userName = `${firstName} ${lastName}`.trim();
          } else if (user.email) {
            userName = user.email.split('@')[0];
          }

          await AsyncStorage.setItem('userName', userName);

          const savedName = await AsyncStorage.getItem('userName');

          if (user.email) {
            await AsyncStorage.setItem('userEmail', user.email);
          }
          if (user.id) {
            await AsyncStorage.setItem('userId', user.id);
          }
        } else if (sessionData.user && sessionData.session) {
          
          const user = sessionData.user;
          const session = sessionData.session;

          await AsyncStorage.setItem('userToken', session.access_token);
          await AsyncStorage.setItem('refreshToken', session.refresh_token);

          let userName = 'User';
          if (user.name && user.name.trim()) {
            userName = user.name.trim();
          } else if (user.first_name || user.last_name) {
            const firstName = user.first_name?.trim() || '';
            const lastName = user.last_name?.trim() || '';
            userName = `${firstName} ${lastName}`.trim();
          } else if (user.email) {
            userName = user.email.split('@')[0];
          }

          await AsyncStorage.setItem('userName', userName);

          if (user.email) {
            await AsyncStorage.setItem('userEmail', user.email);
          }
          if (user.id) {
            await AsyncStorage.setItem('userId', user.id);
          }
        } else if (typeof sessionData === 'string') {
          
          await AsyncStorage.setItem('userToken', sessionData);
        } else if (sessionData.access_token && sessionData.refresh_token) {
          
          await AsyncStorage.setItem('userToken', sessionData.access_token);
          await AsyncStorage.setItem('refreshToken', sessionData.refresh_token);

          if (sessionData.user) {
            const user = sessionData.user;
            let userName = 'User';
            if (user.name && user.name.trim()) {
              userName = user.name.trim();
            } else if (user.first_name || user.last_name) {
              const firstName = user.first_name?.trim() || '';
              const lastName = user.last_name?.trim() || '';
              userName = `${firstName} ${lastName}`.trim();
            } else if (user.email) {
              userName = user.email.split('@')[0];
            }

            await AsyncStorage.setItem('userName', userName);

            if (user.email) {
              await AsyncStorage.setItem('userEmail', user.email);
            }
            if (user.id) {
              await AsyncStorage.setItem('userId', user.id);
            }
          }
        } else if (sessionData.session) {
          
          await AsyncStorage.setItem(
            'userToken',
            sessionData.session.access_token,
          );
          await AsyncStorage.setItem(
            'refreshToken',
            sessionData.session.refresh_token,
          );

          if (sessionData.session.user) {
            const user = sessionData.session.user;
            let userName = 'User';
            if (user.name && user.name.trim()) {
              userName = user.name.trim();
            } else if (user.first_name || user.last_name) {
              const firstName = user.first_name?.trim() || '';
              const lastName = user.last_name?.trim() || '';
              userName = `${firstName} ${lastName}`.trim();
            } else if (user.email) {
              userName = user.email.split('@')[0];
            }

            await AsyncStorage.setItem('userName', userName);

            if (user.email) {
              await AsyncStorage.setItem('userEmail', user.email);
            }
            if (user.id) {
              await AsyncStorage.setItem('userId', user.id);
            }
          }
        } else if (sessionData.user) {
          
          const user = sessionData.user;
          let userName = 'User';
          if (user.name && user.name.trim()) {
            userName = user.name.trim();
          } else if (user.first_name || user.last_name) {
            const firstName = user.first_name?.trim() || '';
            const lastName = user.last_name?.trim() || '';
            userName = `${firstName} ${lastName}`.trim();
          } else if (user.email) {
            userName = user.email.split('@')[0];
          }

          await AsyncStorage.setItem('userName', userName);

          if (user.email) {
            await AsyncStorage.setItem('userEmail', user.email);
          }
          if (user.id) {
            await AsyncStorage.setItem('userId', user.id);
          }
        } else if (
          sessionData.data &&
          sessionData.data.user &&
          !sessionData.data.session
        ) {
          
          const user = sessionData.data.user;

          let userName = 'User';
          if (user.name && user.name.trim()) {
            userName = user.name.trim();
          } else if (user.firstName && user.lastName) {
            userName =
              `${user.firstName.trim()} ${user.lastName.trim()}`.trim();
          } else if (user.first_name || user.last_name) {
            const firstName = user.first_name?.trim() || '';
            const lastName = user.last_name?.trim() || '';
            userName = `${firstName} ${lastName}`.trim();
          } else if (user.email) {
            userName = user.email.split('@')[0];
          }

          await AsyncStorage.setItem('userName', userName);

          if (user.email) {
            await AsyncStorage.setItem('userEmail', user.email);
          }
          if (user.id) {
            await AsyncStorage.setItem('userId', user.id);
          }

          const savedName = await AsyncStorage.getItem('userName');
        }
      }
      setIsAuthenticated(true);

      await settingsService.initializeSettings();

      await settingsService.debugPinSettings();

      const hasPin = await settingsService.hasPin();
      setRequiresLock(hasPin);
      if (hasPin) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } catch (error) {
      console.error('Error saving auth token:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      
      const userToken = await AsyncStorage.getItem('userToken');

      if (userToken) {
        try {
          const response = await fetch(
            `${getApiUrl(API_ENDPOINTS.auth.signout)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`,
              },
            },
          );

          if (response.ok) {
          } else {
          }
        } catch (apiError) {
          console.error('Error calling sign out API:', apiError);
          
        }
      }

      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('userId');
      
      await AsyncStorage.removeItem('userSettings');
      await AsyncStorage.removeItem('has_pin');
      await AsyncStorage.removeItem('biometric_enabled');
      await AsyncStorage.removeItem('language');
      setIsAuthenticated(false);
      setIsLocked(false);
      setRequiresLock(false);
      setShowPrivacyScreen(false);
    } catch (error) {
      console.error('Error during sign out:', error);
      
      setIsAuthenticated(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <ActivityIndicator size="large" color="#582FFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        {(() => {

          if (isAuthenticated) {

            if (isLocked) {
              return (
                <AppLockScreen
                  onUnlock={() => {
                    const now = Date.now();
                    setLastUnlockTime(now);
                    lastUnlockTimeRef.current = now; 
                    setIsLocked(false);
                    setShowPrivacyScreen(false); 
                  }}
                />
              );
            }

            if (showPrivacyScreen) {
              return <PrivacyScreen />;
            }

            return <BottomTabNavigator onSignOut={handleSignOut} />;
          }

          return <WelcomeScreen onAuthSuccess={handleAuthSuccess} />;
        })()}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
