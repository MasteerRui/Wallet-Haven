import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserData {
  userName: string;
  email?: string;
  userId?: string;
}

export const saveUserData = async (userData: UserData): Promise<void> => {
  try {
    await AsyncStorage.setItem('userName', userData.userName);
    if (userData.email) {
      await AsyncStorage.setItem('userEmail', userData.email);
    }
    if (userData.userId) {
      await AsyncStorage.setItem('userId', userData.userId);
    }
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

export const getUserData = async (): Promise<UserData | null> => {
  try {
    const userName = await AsyncStorage.getItem('userName');
    const userEmail = await AsyncStorage.getItem('userEmail');
    const userId = await AsyncStorage.getItem('userId');

    if (!userName) {
      return null;
    }

    return {
      userName,
      email: userEmail || undefined,
      userId: userId || undefined,
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const clearUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      'userName',
      'userEmail',
      'userId',
      'userToken',
      'refreshToken',
    ]);
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
};

export const updateUserName = async (userName: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('userName', userName);
  } catch (error) {
    console.error('Error updating user name:', error);
    throw error;
  }
};
