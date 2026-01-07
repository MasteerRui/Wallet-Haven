import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import apiService from '../../services/apiService';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';

interface ChangePasswordSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const ChangePasswordSheet: React.FC<ChangePasswordSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isVisible]);

  const handleClose = () => {
    onClose();
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError(t('settings.allPasswordFieldsRequired') || 'All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError(t('settings.passwordsDoNotMatch') || 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showError(t('settings.passwordMinLength') || 'Password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await apiService.post('/user/settings/password/change', {
        currentPassword,
        newPassword,
      });

      if (response.success) {
        showSuccess(t('success.passwordChanged') || 'Password changed successfully');
        handleClose();
      } else {
        showError(response.message || t('errors.somethingWentWrong') || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showError(t('errors.somethingWentWrong') || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const isFormValid =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  return (
    <Modal 
      visible={isVisible} 
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.handle} />

        {}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('settings.changePassword') || 'Change Password'}
          </Text>
          <View style={styles.headerRight} />
        </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  {t('settings.currentPassword') || 'Current Password'}
                </Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder={t('settings.enterCurrentPassword') || 'Enter current password'}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={20} color={COLORS.textSecondary} />
                    ) : (
                      <Eye size={20} color={COLORS.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  {t('settings.newPassword') || 'New Password'}
                </Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t('settings.enterNewPassword') || 'Enter new password (min 6 characters)'}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff size={20} color={COLORS.textSecondary} />
                    ) : (
                      <Eye size={20} color={COLORS.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.passwordHint}>
                  {t('settings.passwordMinLength') || 'Password must be at least 6 characters long'}
                </Text>
              </View>

              {}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  {t('settings.confirmPassword') || 'Confirm New Password'}
                </Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t('settings.confirmNewPassword') || 'Confirm new password'}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={COLORS.textSecondary} />
                    ) : (
                      <Eye size={20} color={COLORS.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                {confirmPassword && newPassword !== confirmPassword && (
                  <Text style={styles.errorText}>
                    {t('settings.passwordsDoNotMatch') || 'Passwords do not match'}
                  </Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.bottomButtons}>
              <TouchableOpacity
                style={[styles.bottomButton]}
                onPress={handleClose}
                disabled={changingPassword}
              >
                <Text style={styles.cancelButton}>
                  {t('common.cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.bottomButton,
                  styles.doneButtonBg,
                  !isFormValid && styles.doneButtonDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={changingPassword || !isFormValid}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.doneButton}>
                    {t('settings.changePassword') || 'Change Password'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 4,
  },
  passwordHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 'auto',
    gap: 12,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bottomButton: {
    flex: 1,
    paddingVertical: 17,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  doneButtonBg: {
    backgroundColor: COLORS.primary,
  },
  doneButtonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    color: '#1F2937',
    fontSize: 17,
    fontWeight: '500',
  },
  doneButton: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
  },
});

export default ChangePasswordSheet;

