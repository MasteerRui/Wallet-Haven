import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ENDPOINTS } from '../constants/config';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  needsLogin?: boolean;
}

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  method?: RequestMethod;
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

class ApiService {
  private static instance: ApiService;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private sessionExpiredListeners: Array<() => void> = [];

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  onSessionExpired(listener: () => void): () => void {
    this.sessionExpiredListeners.push(listener);
    return () => {
      this.sessionExpiredListeners = this.sessionExpiredListeners.filter(
        l => l !== listener,
      );
    };
  }

  private notifySessionExpired(): void {
    this.sessionExpiredListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[ApiService] Error in session expired listener:', error);
      }
    });
  }

  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('userToken');
  }

  private async refreshToken(): Promise<string | null> {
    
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._doRefreshToken();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async _doRefreshToken(): Promise<string | null> {
    try {
      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        return null;
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.auth.refresh}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: storedRefreshToken,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        const newAccessToken = result.data?.session?.access_token;
        const newRefreshToken = result.data?.session?.refresh_token;

        if (newAccessToken && newRefreshToken) {
          await AsyncStorage.setItem('userToken', newAccessToken);
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
          return newAccessToken;
        }
      } else if (response.status === 400 || response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('refreshToken');
        this.notifySessionExpired();
        return null;
      }
      return null;
    } catch (error) {
      console.error('[ApiService] Token refresh failed:', error);
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('refreshToken');
      this.notifySessionExpired();
      return null;
    }
  }

  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, skipAuth = false } = options;

    try {
      let token: string | null = null;

      if (!skipAuth) {
        token = await this.getAuthToken();
        if (!token) {
          return {
            success: false,
            message: 'Not authenticated',
            needsLogin: true,
          };
        }
      }

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      const requestOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }

      let response = await fetch(
        `${API_CONFIG.BASE_URL}${endpoint}`,
        requestOptions,
      );

      if (response.status === 401 && !skipAuth) {
        const newToken = await this.refreshToken();

        if (!newToken) {
          return {
            success: false,
            message: 'Session expired',
            needsLogin: true,
          };
        }

        requestHeaders['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
          ...requestOptions,
          headers: requestHeaders,
        });
      }

      const contentType = response.headers.get('content-type');
      let responseData: any;

      if (contentType && contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch (jsonError) {
          
          const text = await response.text();
          console.error(
            '[ApiService] Failed to parse JSON response:',
            text.substring(0, 200),
          );
          return {
            success: false,
            message: `Invalid JSON response from server (Status: ${response.status})`,
            needsLogin: response.status === 401,
          };
        }
      } else {
        
        const text = await response.text();
        console.error(
          '[ApiService] Received non-JSON response:',
          text.substring(0, 200),
        );

        let errorMessage = `Server returned ${response.status} error`;
        if (response.status === 404) {
          errorMessage = `Endpoint not found: ${endpoint}`;
        } else if (response.status === 500) {
          errorMessage = 'Internal server error';
        } else if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            message: 'Authentication required',
            needsLogin: true,
          };
        }

        return {
          success: false,
          message: errorMessage,
          needsLogin: response.status === 401 || response.status === 403,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          message:
            responseData.message ||
            `Request failed with status ${response.status}`,
          data: responseData,
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
        message: responseData.message,
      };
    } catch (error) {
      console.error('[ApiService] Request error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async get<T = any>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T = any>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async delete<T = any>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T = any>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async uploadFormData<T = any>(
    endpoint: string,
    formData: FormData,
  ): Promise<ApiResponse<T>> {
    try {
      let token = await AsyncStorage.getItem('userToken');

      if (!token) {
        return {
          success: false,
          message: 'Not authenticated',
          needsLogin: true,
        };
      }

      let response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        const newToken = await this.refreshToken();

        if (!newToken) {
          return {
            success: false,
            message: 'Session expired',
            needsLogin: true,
          };
        }

        response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error(
          '[ApiService] Server returned non-JSON response:',
          response.status,
          contentType,
        );
        const text = await response.text();
        console.error('[ApiService] Response text:', text.substring(0, 200));
        return {
          success: false,
          message: `Server error: ${response.status} - Expected JSON but got ${contentType}`,
        };
      }

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('[ApiService] Failed to parse JSON:', parseError);
        return {
          success: false,
          message: `Failed to parse server response: ${parseError}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          message:
            responseData.message ||
            `Upload failed with status ${response.status}`,
          data: responseData,
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
        message: responseData.message,
      };
    } catch (error) {
      console.error('[ApiService] Upload error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('userToken');
  }

  async refreshAndGetToken(): Promise<string | null> {
    return this.refreshToken();
  }
}

const apiService = ApiService.getInstance();
export default apiService;
