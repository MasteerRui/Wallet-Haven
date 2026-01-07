import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Animated,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../constants/theme';
import settingsService from '../../services/settingsService';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/common/Toast';
import PinInputModal from '../../components/common/PinInputModal';
import OptionSheet from '../../components/common/OptionSheet';
import AccountInformationSheet from '../../components/settings/AccountInformationSheet';
import ChangePasswordSheet from '../../components/settings/ChangePasswordSheet';
import {
  User,
  Lock1,
  InfoCircle,
  Logout,
  Global,
  Shield,
  Code,
} from 'iconsax-react-nativejs';

interface SettingsTabProps {
  onSignOut?: () => void;
}

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
  destructive?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  rightComponent,
  destructive = false,
}) => (
  <TouchableOpacity
    style={styles.settingsItem}
    onPress={onPress}
    activeOpacity={0.6}
  >
    <View style={styles.settingsItemLeft}>
      <View
        style={[
          styles.iconContainer,
          destructive && styles.iconContainerDestructive,
        ]}
      >
        {icon}
      </View>
      <View style={styles.settingsItemText}>
        <Text
          style={[
            styles.settingsItemTitle,
            destructive && styles.textDestructive,
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
        )}
      </View>
    </View>
    {rightComponent || (showArrow && <Text style={styles.arrow}>›</Text>)}
  </TouchableOpacity>
);

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    {title && <Text style={styles.sectionTitle}>{title}</Text>}
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const SettingsTab: React.FC<SettingsTabProps> = ({ onSignOut }) => {
  const { t, changeLanguage: changeAppLanguage } = useTranslation();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [language, setLanguage] = useState('English');
  const [statusBarStyle, setStatusBarStyle] = useState<
    'light-content' | 'dark-content'
  >('dark-content');

  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [showCurrentPinModal, setShowCurrentPinModal] = useState(false);
  const [showNewPinModal, setShowNewPinModal] = useState(false);
  const [showRemovePinModal, setShowRemovePinModal] = useState(false);
  const [showBiometricPinModal, setShowBiometricPinModal] = useState(false);
  const [tempCurrentPin, setTempCurrentPin] = useState('');

  const [showPinOptionsSheet, setShowPinOptionsSheet] = useState(false);
  const [showLanguageOptionsSheet, setShowLanguageOptionsSheet] = useState(false);

  const [showAccountSheet, setShowAccountSheet] = useState(false);
  
  const [showPasswordChangeSheet, setShowPasswordChangeSheet] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle('dark-content');
      loadSettings();
    }, []),
  );

  const loadSettings = async () => {
    try {
      
      const cachedSettings = await settingsService.getCachedSettings();
      if (cachedSettings.has_pin !== undefined) {
        setHasPin(cachedSettings.has_pin);
      }
      if (cachedSettings.biometric_enabled !== undefined) {
        setBiometricsEnabled(cachedSettings.biometric_enabled);
      }
      if (cachedSettings.preferences?.language) {
        setLanguage(
          cachedSettings.preferences.language === 'portuguese'
            ? 'Português'
            : 'English',
        );
      }

      const response = await settingsService.getSettings();
      if (response.success && response.data) {
        setHasPin(response.data.has_pin);
        setBiometricsEnabled(response.data.biometric_enabled);
        setLanguage(
          response.data.preferences.language === 'portuguese'
            ? 'Português'
            : 'English',
        );
      }
    } catch (error) {
      console.error('[SettingsTab] Error loading settings:', error);
      
    }
  };

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const miniHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const miniHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [-50, -50, 0],
    extrapolate: 'clamp',
  });

  const handleAccountPress = () => {
    setShowAccountSheet(true);
  };

  const handleSecurityPress = () => {
    if (hasPin) {
      
      setShowPinOptionsSheet(true);
    } else {
      handleSetPin();
    }
  };

  const handlePinOptionSelect = (value: string) => {
    setShowPinOptionsSheet(false);
    if (value === 'change') {
      handleChangePin();
    } else if (value === 'remove') {
      handleRemovePin();
    }
  };

  const handleSetPin = () => {
    setShowSetPinModal(true);
  };

  const handleSetPinComplete = async (pin: string) => {
    setShowSetPinModal(false);

    const response = await settingsService.setPin(pin);
    if (response.success) {
      setHasPin(true);
      showSuccess(t('success.pinSet'));
    } else {
      showError(response.message || t('errors.somethingWentWrong'));
    }
  };

  const handleChangePin = () => {
    setShowCurrentPinModal(true);
  };

  const handleCurrentPinComplete = (pin: string) => {
    setShowCurrentPinModal(false);
    setTempCurrentPin(pin);
    setShowNewPinModal(true);
  };

  const handleNewPinComplete = async (newPin: string) => {
    setShowNewPinModal(false);

    const response = await settingsService.setPin(newPin, tempCurrentPin);
    setTempCurrentPin(''); 

    if (response.success) {
      showSuccess(t('success.pinUpdated'));
    } else {
      showError(response.message || t('errors.somethingWentWrong'));
    }
  };

  const handleRemovePin = () => {
    setShowRemovePinModal(true);
  };

  const handleRemovePinComplete = async (pin: string) => {
    setShowRemovePinModal(false);

    const response = await settingsService.removePin(pin);
    if (response.success) {
      setHasPin(false);
      setBiometricsEnabled(false);
      showSuccess(t('success.pinRemoved'));
    } else {
      showError(response.message || t('errors.somethingWentWrong'));
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!hasPin) {
        showInfo(t('settings.pinRequiredForBiometric'));
        return;
      }

      setShowBiometricPinModal(true);
    } else {
      const response = await settingsService.setBiometric(false);
      if (response.success) {
        setBiometricsEnabled(false);
        showSuccess(t('success.biometricDisabled'));
      } else {
        showError(response.message || t('errors.somethingWentWrong'));
      }
    }
  };

  const handleBiometricPinComplete = async (pin: string) => {
    setShowBiometricPinModal(false);

    const response = await settingsService.setBiometric(true, pin);
    if (response.success) {
      setBiometricsEnabled(true);
      showSuccess(t('success.biometricEnabled'));
    } else {
      showError(response.message || t('errors.somethingWentWrong'));
    }
  };

  const handleLanguagePress = () => {
    
    setShowLanguageOptionsSheet(true);
  };

  const handleLanguageOptionSelect = (value: string) => {
    setShowLanguageOptionsSheet(false);
    if (value === 'english' || value === 'portuguese') {
      handleLanguageChange(value);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    try {
      
      await changeAppLanguage(lang as 'english' | 'portuguese');

      setLanguage(lang === 'portuguese' ? 'Português' : 'English');

      const response = await settingsService.updatePreferences({
        language: lang,
      });

      if (response.success) {
        showSuccess(t('success.languageUpdated'));
      } else {
        showError(response.message || t('errors.somethingWentWrong'));
      }
    } catch (error) {
      console.error('[SettingsTab] Error changing language:', error);
      showError(t('errors.somethingWentWrong'));
    }
  };

  const handleAboutPress = () => {
    showInfo(t('settings.aboutInfo'));
  };

  const handleGitHubPress = () => {
    const githubUrl = 'https://github.com/MasteerRui/WalletHavenApp';
    Linking.openURL(githubUrl).catch(err => {
      console.error('Failed to open GitHub link:', err);
      showError(t('settings.githubLinkError'));
    });
  };

  const handleSignOut = () => {
    
    showInfo(t('settings.signOutConfirm') || 'Signing out...');
    if (onSignOut) {
      onSignOut();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle={statusBarStyle} animated={true} />
      {}
      <Animated.View
        style={[
          styles.miniHeader,
          {
            opacity: miniHeaderOpacity,
            transform: [{ translateY: miniHeaderTranslateY }],
          },
        ]}
      >
        <Text style={styles.miniHeaderTitle}>{t('settings.title')}</Text>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {}
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.title')}</Text>
          <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
        </View>

        {}
        <SettingsSection title={t('settings.account')}>
          <SettingsItem
            icon={<User size={20} color={COLORS.primary} variant="Bold" />}
            title={t('settings.accountInformation')}
            subtitle={t('settings.accountSubtitle')}
            onPress={handleAccountPress}
          />
        </SettingsSection>

        {}
        <SettingsSection title={t('settings.preferences')}>
          <SettingsItem
            icon={<Global size={20} color={COLORS.primary} variant="Bold" />}
            title={t('settings.language')}
            subtitle={language}
            onPress={handleLanguagePress}
          />
        </SettingsSection>

        {}
        <SettingsSection title={t('settings.securityPrivacy')}>
          <SettingsItem
            icon={<Lock1 size={20} color={COLORS.primary} variant="Bold" />}
            title={t('settings.pinSecurity')}
            subtitle={
              hasPin
                ? t('settings.pinManageSubtitle')
                : t('settings.pinSetupSubtitle')
            }
            onPress={handleSecurityPress}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon={<Shield size={20} color={COLORS.primary} variant="Bold" />}
            title={t('settings.biometricAuth')}
            subtitle={
              hasPin
                ? t('settings.biometricSubtitle')
                : t('settings.biometricRequiresPin')
            }
            showArrow={false}
            rightComponent={
              <Switch
                value={biometricsEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#E5E7EB', true: COLORS.primary + '40' }}
                thumbColor={biometricsEnabled ? COLORS.primary : '#f4f3f4'}
                ios_backgroundColor="#E5E7EB"
                disabled={!hasPin}
              />
            }
          />
        </SettingsSection>

        {}
        <SettingsSection title={t('settings.support')}>
          <SettingsItem
            icon={<Code size={20} color={COLORS.primary} variant="Bold" />}
            title={t('settings.github')}
            subtitle={t('settings.githubSubtitle')}
            onPress={handleGitHubPress}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon={
              <InfoCircle size={20} color={COLORS.primary} variant="Bold" />
            }
            title={t('settings.about')}
            subtitle={t('settings.aboutSubtitle')}
            onPress={handleAboutPress}
          />
        </SettingsSection>

        {}
        <SettingsSection>
          <SettingsItem
            icon={<Logout size={20} color="#EF4444" variant="Bold" />}
            title={t('settings.signOut')}
            onPress={handleSignOut}
            showArrow={false}
            destructive
          />
        </SettingsSection>

        {}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('settings.madeWithLove')}</Text>
        </View>

        <View style={{ height: 50 }} />
      </Animated.ScrollView>

      {}
      <PinInputModal
        visible={showSetPinModal}
        title={t('settings.setPin')}
        subtitle={t('settings.setPinSubtitle')}
        onComplete={handleSetPinComplete}
        onCancel={() => setShowSetPinModal(false)}
      />

      <PinInputModal
        visible={showCurrentPinModal}
        title={t('settings.currentPin')}
        subtitle={t('settings.currentPinSubtitle')}
        onComplete={handleCurrentPinComplete}
        onCancel={() => setShowCurrentPinModal(false)}
      />

      <PinInputModal
        visible={showNewPinModal}
        title={t('settings.newPin')}
        subtitle={t('settings.newPinSubtitle')}
        onComplete={handleNewPinComplete}
        onCancel={() => {
          setShowNewPinModal(false);
          setTempCurrentPin('');
        }}
      />

      <PinInputModal
        visible={showRemovePinModal}
        title={t('settings.removePin')}
        subtitle={t('settings.removePinSubtitle')}
        onComplete={handleRemovePinComplete}
        onCancel={() => setShowRemovePinModal(false)}
      />

      <PinInputModal
        visible={showBiometricPinModal}
        title={t('settings.verifyPin')}
        subtitle={t('settings.verifyPinSubtitle')}
        onComplete={handleBiometricPinComplete}
        onCancel={() => setShowBiometricPinModal(false)}
      />

      {}
      <OptionSheet
        visible={showPinOptionsSheet}
        title={t('settings.pinSecurity')}
        subtitle={t('settings.pinManagementQuestion') || 'What would you like to do?'}
        options={[
          {
            label: t('settings.changePin'),
            value: 'change',
          },
          {
            label: t('settings.removePin'),
            value: 'remove',
            destructive: true,
          },
        ]}
        onSelect={handlePinOptionSelect}
        onCancel={() => setShowPinOptionsSheet(false)}
      />

      {}
      <OptionSheet
        visible={showLanguageOptionsSheet}
        title={t('settings.language')}
        subtitle={t('settings.selectLanguagePreference') || 'Select your preferred language'}
        options={[
          {
            label: 'English',
            value: 'english',
          },
          {
            label: 'Português',
            value: 'portuguese',
          },
        ]}
        onSelect={handleLanguageOptionSelect}
        onCancel={() => setShowLanguageOptionsSheet(false)}
      />

      {}
      <AccountInformationSheet
        isVisible={showAccountSheet}
        onClose={() => setShowAccountSheet(false)}
        onCloseForPasswordChange={() => setShowAccountSheet(false)}
        onOpenPasswordChange={() => setShowPasswordChangeSheet(true)}
      />

      {}
      <ChangePasswordSheet
        isVisible={showPasswordChangeSheet}
        onClose={() => setShowPasswordChangeSheet(false)}
      />

      {}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  miniHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
    zIndex: 100,
  },
  miniHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#121212',
  },
  header: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#F5F5F7',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: SIZES.padding,
    letterSpacing: -0.08,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: SIZES.padding,
    overflow: 'hidden',
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerDestructive: {
    backgroundColor: '#FEE2E2',
  },
  settingsItemText: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  textDestructive: {
    color: '#EF4444',
  },
  settingsItemSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  arrow: {
    fontSize: 28,
    color: '#C7C7CC',
    fontWeight: '300',
    marginLeft: 8,
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E5E7EB',
    marginLeft: 60,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

export default SettingsTab;
