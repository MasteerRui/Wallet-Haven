import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS } from '../../constants/theme';

const appLogo = require('../../assets/images/logo.png');

const PrivacyScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
      </View>
      <Text style={styles.appName}>WalletHaven</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default PrivacyScreen;
