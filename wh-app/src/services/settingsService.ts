import apiService from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  has_pin: boolean;
  biometric_enabled: boolean;
  preferences: {
    language: string;
  };
}

interface SettingsResponse {
  success: boolean;
  message?: string;
  data?: UserSettings;
}

class SettingsService {
  private readonly STORAGE_KEYS = {
    HAS_PIN: 'has_pin',
    BIOMETRIC_ENABLED: 'biometric_enabled',
    LANGUAGE: 'language',
  };

  async initializeSettings(): Promise<void> {
    try {
      
      const hasPin = await AsyncStorage.getItem(this.STORAGE_KEYS.HAS_PIN);

      if (hasPin === null) {
        await AsyncStorage.setItem(this.STORAGE_KEYS.HAS_PIN, 'false');
      }

      const biometricEnabled = await AsyncStorage.getItem(
        this.STORAGE_KEYS.BIOMETRIC_ENABLED,
      );
      if (biometricEnabled === null) {
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.BIOMETRIC_ENABLED,
          'false',
        );
      }

      const language = await AsyncStorage.getItem(this.STORAGE_KEYS.LANGUAGE);
      if (language === null) {
        await AsyncStorage.setItem(this.STORAGE_KEYS.LANGUAGE, 'english');
      }
    } catch (error) {
      console.error('[SettingsService] Error initializing settings:', error);
    }
  }

  async getSettings(): Promise<SettingsResponse> {
    try {
      const response = await apiService.get('/user/settings');

      if (response.success && response.data) {
        
        await this.cacheSettings(response.data);
        return response;
      }

      console.warn(
        '[SettingsService] API returned error, using cached settings',
      );
      return {
        success: false,
        message: response.message || 'Settings endpoint not available yet',
      };
    } catch (error) {
      console.error('[SettingsService] Error fetching settings:', error);
      return {
        success: false,
        message: 'Failed to fetch settings - using cached data',
      };
    }
  }

  private async cacheSettings(settings: UserSettings): Promise<void> {
    try {
      const itemsToSet: [string, string][] = [
        [this.STORAGE_KEYS.HAS_PIN, settings.has_pin.toString()],
        [
          this.STORAGE_KEYS.BIOMETRIC_ENABLED,
          settings.biometric_enabled.toString(),
        ],
      ];

      if (settings.preferences?.language) {
        itemsToSet.push([
          this.STORAGE_KEYS.LANGUAGE,
          settings.preferences.language,
        ]);
      }

      await AsyncStorage.multiSet(itemsToSet);
    } catch (error) {
      console.error('[SettingsService] Error caching settings:', error);
    }
  }

  async getCachedSettings(): Promise<Partial<UserSettings>> {
    try {
      const values = await AsyncStorage.multiGet([
        this.STORAGE_KEYS.HAS_PIN,
        this.STORAGE_KEYS.BIOMETRIC_ENABLED,
        this.STORAGE_KEYS.LANGUAGE,
      ]);

      return {
        has_pin: values[0][1] === 'true',
        biometric_enabled: values[1][1] === 'true',
        preferences: {
          language: values[2][1] || 'english',
        },
      };
    } catch (error) {
      console.error('[SettingsService] Error getting cached settings:', error);
      return {};
    }
  }

  async setPin(pin: string, currentPin?: string): Promise<SettingsResponse> {
    try {
      
      if (!/^\d{6}$/.test(pin)) {
        return {
          success: false,
          message: 'PIN must be exactly 6 digits',
        };
      }

      const body: any = { pin };
      if (currentPin) {
        body.current_pin = currentPin;
      }

      const response = await apiService.post('/user/settings/pin', body);

      if (response.success) {
        await AsyncStorage.setItem(this.STORAGE_KEYS.HAS_PIN, 'true');
      }

      return response;
    } catch (error) {
      console.error('[SettingsService] Error setting PIN:', error);
      return {
        success: false,
        message: 'Failed to set PIN',
      };
    }
  }

  async verifyPin(pin: string): Promise<SettingsResponse> {
    try {
      const response = await apiService.post('/user/settings/pin/verify', {
        pin,
      });
      return response;
    } catch (error) {
      console.error('[SettingsService] Error verifying PIN:', error);
      return {
        success: false,
        message: 'Failed to verify PIN',
      };
    }
  }

  async removePin(pin: string): Promise<SettingsResponse> {
    try {
      const response = await apiService.request('/user/settings/pin', {
        method: 'DELETE',
        body: { pin },
      });

      if (response.success) {
        
        await AsyncStorage.multiSet([
          [this.STORAGE_KEYS.HAS_PIN, 'false'],
          [this.STORAGE_KEYS.BIOMETRIC_ENABLED, 'false'],
        ]);
      }

      return response;
    } catch (error) {
      console.error('[SettingsService] Error removing PIN:', error);
      return {
        success: false,
        message: 'Failed to remove PIN',
      };
    }
  }

  async setBiometric(
    enabled: boolean,
    pin?: string,
  ): Promise<SettingsResponse> {
    try {
      const body: any = { enabled };
      if (enabled && pin) {
        body.pin = pin;
      }

      const response = await apiService.post('/user/settings/biometric', body);

      if (response.success) {
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.BIOMETRIC_ENABLED,
          enabled.toString(),
        );
      }

      return response;
    } catch (error) {
      console.error('[SettingsService] Error setting biometric:', error);
      return {
        success: false,
        message: 'Failed to update biometric settings',
      };
    }
  }

  async updatePreferences(preferences: {
    language?: string;
  }): Promise<SettingsResponse> {
    try {
      
      if (preferences.language) {
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.LANGUAGE,
          preferences.language,
        );
      }

      try {
        const response = await apiService.patch(
          '/user/settings/preferences',
          preferences,
        );

        if (response.success) {
          return response;
        }
      } catch (apiError) {
      }

      return {
        success: true,
        message: 'Preferences saved locally',
      };
    } catch (error) {
      console.error('[SettingsService] Error updating preferences:', error);
      return {
        success: false,
        message: 'Failed to update preferences',
      };
    }
  }

  async debugPinSettings(): Promise<void> {
    try {
      const values = await AsyncStorage.multiGet([
        this.STORAGE_KEYS.HAS_PIN,
        this.STORAGE_KEYS.BIOMETRIC_ENABLED,
        this.STORAGE_KEYS.LANGUAGE,
      ]);

    } catch (error) {
      console.error('[SettingsService] Error debugging PIN settings:', error);
    }
  }

  async hasPin(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(this.STORAGE_KEYS.HAS_PIN);
      const result = value === 'true';
      return result;
    } catch (error) {
      console.error('[SettingsService] Error checking PIN status:', error);
      return false;
    }
  }

  async isBiometricEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(
        this.STORAGE_KEYS.BIOMETRIC_ENABLED,
      );
      return value === 'true';
    } catch (error) {
      console.error(
        '[SettingsService] Error checking biometric status:',
        error,
      );
      return false;
    }
  }
}

export default new SettingsService();
