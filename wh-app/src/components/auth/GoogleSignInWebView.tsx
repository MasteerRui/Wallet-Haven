import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, Text, Alert } from 'react-native';
import { getGoogleAuthUrl, extractCodeFromUrl } from '../../utils/googleAuth';
import { getApiUrl, API_ENDPOINTS } from '../../constants/config';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GoogleSignInWebViewProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: (sessionData: any) => void;
}

const base64Decode = (str: string): string => {
  try {
    
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    
    while (str.length % 4) {
      str += '=';
    }
    
    return decodeURIComponent(
      atob(str)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    console.error('Error decoding base64:', e);
    return '';
  }
};

const extractUserFromToken = async (token: string): Promise<any> => {
  try {
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decodedPayloadStr = base64Decode(payload);
    
    if (!decodedPayloadStr) {
      return null;
    }
    
    const decodedPayload = JSON.parse(decodedPayloadStr);

    const userData: any = {};
    
    if (decodedPayload.email) {
      userData.email = decodedPayload.email;
      
      userData.name = decodedPayload.name || decodedPayload.email.split('@')[0];
    }
    
    if (decodedPayload.name) {
      userData.name = decodedPayload.name;
    }
    
    if (decodedPayload.sub || decodedPayload.user_id) {
      userData.id = decodedPayload.sub || decodedPayload.user_id;
    }
    
    if (decodedPayload.user_metadata) {
      const metadata = decodedPayload.user_metadata;
      if (metadata.full_name) {
        userData.name = metadata.full_name;
      }
      if (metadata.first_name) {
        userData.first_name = metadata.first_name;
      }
      if (metadata.last_name) {
        userData.last_name = metadata.last_name;
      }
    }
    
    return Object.keys(userData).length > 0 ? userData : null;
  } catch (error) {
    console.error('Error extracting user from token:', error);
    return null;
  }
};

const GoogleSignInWebView: React.FC<GoogleSignInWebViewProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      handleGoogleSignIn();
    }
  }, [isVisible]);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);

      const isAvailable = await InAppBrowser.isAvailable();
      if (!isAvailable) {
        throw new Error('In-app browser não disponível');
      }

      const redirectTo = 'wallethaven://google-callback';

      const url = await getGoogleAuthUrl(redirectTo);
      
      if (!url) {
        throw new Error('Failed to get OAuth URL');
      }

      const result = await InAppBrowser.openAuth(url, redirectTo, {
        
        ephemeralWebSession: false,
        
        showTitle: false,
        enableUrlBarHiding: true,
        enableDefaultShare: false,
        
        toolbarColor: '#FFFFFF',
        secondaryToolbarColor: '#FFFFFF',
        navigationBarColor: '#FFFFFF',
        
        animations: {
          startEnter: 'slide_in_right',
          startExit: 'slide_out_left',
          endEnter: 'slide_in_left',
          endExit: 'slide_out_right',
        },
      });

      if (result.type === 'success' && result.url) {
        await handleCallback(result.url);
      } else if (result.type === 'cancel') {
        
        onClose();
      } else if (result.type === 'dismiss') {
        
        onClose();
      } else {

        if (result.url) {
          if (result.url.includes('code=') || result.url.includes('google-callback')) {
            await handleCallback(result.url);
          } else {
            console.error('URL does not contain code or callback:', result.url);
            throw new Error('URL de callback inválida: ' + result.url);
          }
        } else {
          console.error('Unexpected result (no URL):', result);
          throw new Error('Falha ao completar o sign-in - nenhuma URL retornada');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open Google sign-in');
      console.error('Error opening Google sign-in:', err);
      Alert.alert('Erro', err.message || 'Falha ao abrir o Google sign-in');
      onClose();
    }
  };

  const handleCallback = async (callbackUrl: string) => {
    try {

      if (callbackUrl.includes('#')) {
        
        const hashIndex = callbackUrl.indexOf('#');
        const hash = callbackUrl.substring(hashIndex + 1);

        const parseHashParams = (hashString: string) => {
          const params: { [key: string]: string } = {};
          const pairs = hashString.split('&');
          pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key && value) {
              params[key] = decodeURIComponent(value);
            }
          });
          return params;
        };
        
        const hashParams = parseHashParams(hash);
        
        const accessToken = hashParams['access_token'];
        const refreshToken = hashParams['refresh_token'];
        const error = hashParams['error'];
        const errorDescription = hashParams['error_description'];
        
        if (error) {
          throw new Error(errorDescription || error);
        }
        
        if (accessToken) {

          await AsyncStorage.setItem('userToken', accessToken);
          if (refreshToken) {
            await AsyncStorage.setItem('refreshToken', refreshToken);
          }

          let userData = null;
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts && !userData) {
            try {
              
              const userResponse = await fetch(`${getApiUrl(API_ENDPOINTS.auth.user)}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              });
              
              const responseData = await userResponse.json();

              if (
                responseData.code === 'PGRST116' || 
                responseData.message?.includes('0 rows') ||
                responseData.message?.includes('Cannot coerce') ||
                (responseData.details && responseData.details.includes('0 rows'))
              ) {
                if (attempts < maxAttempts - 1) {
                  
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  attempts++;
                  continue;
                } else {
                  
                  userData = await extractUserFromToken(accessToken);
                  break;
                }
              }

              if (responseData.success === false || (responseData.code && responseData.code !== '200')) {
                if (attempts < maxAttempts - 1) {
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  attempts++;
                  continue;
                } else {
                  userData = await extractUserFromToken(accessToken);
                  break;
                }
              }

              userData = responseData.data?.user || responseData.user || responseData;

              if (userData && (userData.email || userData.name || userData.id)) {
                break;
              }

              if (attempts < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                attempts++;
              } else {
                
                userData = await extractUserFromToken(accessToken);
              }
            } catch (apiError: any) {
              console.error(`Error getting user info (attempt ${attempts + 1}):`, apiError);
              if (attempts < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                attempts++;
              } else {
                
                userData = await extractUserFromToken(accessToken);
                break;
              }
            }
          }

          const sessionData = {
            success: true,
            data: {
              user: userData || {},
              session: {
                access_token: accessToken,
                refresh_token: refreshToken || '',
                expires_in: 3600
              }
            }
          };

          onSuccess(sessionData);
          onClose();
        } else {
          throw new Error('No access token received in hash fragment');
        }
      } else if (callbackUrl.includes('code=')) {
        
        const code = extractCodeFromUrl(callbackUrl);
        
        if (!code) {
          throw new Error('Código de autorização não encontrado');
        }

        const response = await fetch(
          `${getApiUrl(API_ENDPOINTS.auth.google.callback)}?code=${encodeURIComponent(code)}`
        );
        
        const data = await response.json();
        
        if (data.success) {
          await AsyncStorage.setItem('userToken', data.data.session.access_token);
          await AsyncStorage.setItem('refreshToken', data.data.session.refresh_token);
          
          onSuccess(data);
          onClose();
        } else {
          throw new Error(data.message || 'Falha ao iniciar sessão com Google');
        }
      } else if (callbackUrl.includes('error=')) {
        
        const errorMatch = callbackUrl.match(/[?&]error=([^&]+)/);
        const error = errorMatch ? decodeURIComponent(errorMatch[1]) : 'Authentication failed';
        throw new Error(error);
      } else {
        console.warn('Unknown callback format:', callbackUrl);
        throw new Error('Formato de callback desconhecido');
      }
    } catch (err: any) {
      console.error('Error handling callback:', err);
      Alert.alert('Erro', err.message || 'Falha ao completar o sign-in');
      setError(err.message || 'Falha ao completar o sign-in');
    }
  };

  if (!isVisible) return null;

  if (error) {
    return (
      <Modal
        visible={isVisible}
        animationType="fade"
        transparent
        onRequestClose={onClose}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            width: '80%',
            maxWidth: 400,
          }}>
            <Text style={{ 
              color: '#EF4444', 
              marginBottom: 16, 
              textAlign: 'center',
              fontSize: 16,
            }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setError(null);
                handleGoogleSignIn();
              }}
              style={{
                backgroundColor: '#1C1C1E',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', textAlign: 'center' }}>
                Tentar Novamente
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onClose}
              style={{
                marginTop: 16,
                paddingVertical: 8,
              }}
            >
              <Text style={{ 
                color: '#6B7280', 
                textAlign: 'center',
                fontSize: 14,
              }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
};

export default GoogleSignInWebView;
