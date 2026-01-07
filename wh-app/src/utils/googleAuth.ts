import { getApiUrl, API_ENDPOINTS } from '../constants/config';
import { Linking, Alert } from 'react-native';

export const getGoogleAuthUrl = async (redirectTo: string = 'wallethaven://google-callback'): Promise<string | null> => {
  try {
    const response = await fetch(
      `${getApiUrl(API_ENDPOINTS.auth.google.url)}?redirectTo=${encodeURIComponent(redirectTo)}`
    );
    
    const data = await response.json();
    
    if (data.success && data.data?.url) {
      return data.data.url;
    }
    
    throw new Error(data.message || 'Failed to get OAuth URL');
  } catch (error: any) {
    console.error('Error getting Google OAuth URL:', error);
    throw new Error(error.message || 'Failed to get Google OAuth URL');
  }
};

export const exchangeCodeForSession = async (code: string): Promise<any> => {
  try {
    const response = await fetch(
      `${getApiUrl(API_ENDPOINTS.auth.google.callback)}?code=${encodeURIComponent(code)}`
    );
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to exchange code for session');
    }
    
    return data;
  } catch (error: any) {
    console.error('Error exchanging code for session:', error);
    throw new Error(error.message || 'Failed to exchange code for session');
  }
};

export const extractCodeFromUrl = (url: string): string | null => {
  try {
    
    const urlObj = new URL(url);
    return urlObj.searchParams.get('code');
  } catch (error) {
    
    const match = url.match(/[?&]code=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
};

export const isGoogleCallbackUrl = (url: string): boolean => {
  return url.includes('google-callback') || url.includes('code=');
};
