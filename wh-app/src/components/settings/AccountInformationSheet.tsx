import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Edit2, CheckCircle, Mail, User, Lock } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import apiService from '../../services/apiService';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';

interface AccountInformationSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenPasswordChange?: () => void;
  onCloseForPasswordChange?: () => void;
}

interface UserData {
  name: string;
  email: string;
  is_email_verified: boolean;
}

const AccountInformationSheet: React.FC<AccountInformationSheetProps> = ({
  isVisible,
  onClose,
  onOpenPasswordChange,
  onCloseForPasswordChange,
}) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');

  useEffect(() => {
    if (isVisible) {
      loadUserData();
    } else {
      
      setIsEditing(false);
      setUserData(null);
    }
  }, [isVisible]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const result = await apiService.get('/user/settings/profile');
      if (result.success && result.data) {
        setUserData(result.data);
        setEditedName(result.data.name);
        setEditedEmail(result.data.email);
      } else {
        showError(result.message || t('errors.somethingWentWrong') || 'Failed to load user data');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      showError(t('errors.somethingWentWrong') || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userData) return;

    if (!editedName.trim()) {
      showError(t('settings.nameRequired') || 'Name is required');
      return;
    }

    if (!editedEmail.trim()) {
      showError(t('settings.emailRequired') || 'Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editedEmail)) {
      showError(t('settings.invalidEmail') || 'Invalid email format');
      return;
    }

    setSaving(true);
    try {
      const updates: { name?: string; email?: string } = {};
      if (editedName.trim() !== userData.name) {
        updates.name = editedName.trim();
      }
      if (editedEmail.trim() !== userData.email) {
        updates.email = editedEmail.trim();
      }

      if (Object.keys(updates).length === 0) {
        showError(t('settings.noChanges') || 'No changes to save');
        setSaving(false);
        return;
      }

      const response = await apiService.patch('/user/settings/profile', updates);

      if (response.success && response.data) {
        setUserData(response.data);
        setIsEditing(false);
        showSuccess(t('success.accountUpdated') || 'Account information updated');

        if (updates.email && !response.data.is_email_verified) {
          showError(t('settings.emailVerificationRequired') || 'Please verify your new email address');
        }
      } else {
        showError(response.message || t('errors.somethingWentWrong') || 'Failed to update account');
      }
    } catch (error) {
      console.error('Error updating user data:', error);
      showError(t('errors.somethingWentWrong') || 'Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (userData) {
      setEditedName(userData.name);
      setEditedEmail(userData.email);
    }
    setIsEditing(false);
  };

  return (
    <>
      {isVisible && (
        <Modal
          visible={isVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={onClose}
        >
        <SafeAreaView style={styles.container} edges={['top']}>
          {}
          <View style={styles.handle} />

        {}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('settings.accountInformation') || 'Account Information'}
          </Text>
          <View style={styles.headerRight} />
        </View>

          {}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <AccountInfoSkeleton />
            ) : userData ? (
              <>
                {}
                <View style={styles.fieldContainer}>
                  <View style={styles.fieldHeader}>
                    <View style={styles.fieldIcon}>
                      <User size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.fieldLabel}>
                      {t('settings.name') || 'Name'}
                    </Text>
                  </View>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={editedName}
                      onChangeText={setEditedName}
                      placeholder={t('settings.enterName') || 'Enter your name'}
                      placeholderTextColor={COLORS.textMuted}
                      autoCapitalize="words"
                    />
                  ) : (
                    <View style={styles.valueContainer}>
                      <Text style={styles.valueText}>{userData.name}</Text>
                    </View>
                  )}
                </View>

                {}
                <View style={styles.fieldContainer}>
                  <View style={styles.fieldHeader}>
                    <View style={styles.fieldIcon}>
                      <Mail size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.fieldLabel}>
                      {t('settings.email') || 'Email'}
                    </Text>
                    {userData.is_email_verified && (
                      <View style={styles.verifiedBadge}>
                        <CheckCircle size={14} color="#22C55E" />
                        <Text style={styles.verifiedText}>
                          {t('settings.verified') || 'Verified'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={editedEmail}
                      onChangeText={setEditedEmail}
                      placeholder={t('settings.enterEmail') || 'Enter your email'}
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  ) : (
                    <View style={styles.valueContainer}>
                      <Text style={styles.valueText}>{userData.email}</Text>
                      {!userData.is_email_verified && (
                        <Text style={styles.unverifiedText}>
                          {t('settings.notVerified') || 'Not verified'}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {}
                {!userData.is_email_verified && !isEditing && (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                      {t('settings.emailNotVerified') ||
                        'Your email address is not verified. Please check your inbox for a verification email.'}
                    </Text>
                  </View>
                )}

                {}
                {!isEditing && (
                  <View style={styles.passwordButtonContainer}>
                    <TouchableOpacity
                      style={styles.passwordButton}
                      onPress={() => {
                        
                        if (onCloseForPasswordChange) {
                          onCloseForPasswordChange();
                        }
                        
                        setTimeout(() => {
                          if (onOpenPasswordChange) {
                            onOpenPasswordChange();
                          } else {
                            console.error('🔐 [AccountInfo] onOpenPasswordChange callback not provided');
                          }
                        }, 100);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Lock size={18} color={COLORS.primary} />
                      <Text style={styles.passwordButtonText}>
                        {t('settings.changePassword') || 'Change Password'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {t('settings.noDataAvailable') || 'No data available'}
                </Text>
              </View>
            )}
          </ScrollView>

          {}
          {userData && (
            <View style={styles.footer}>
              {isEditing ? (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleCancel}
                    disabled={saving}
                  >
                    <Text style={styles.cancelButtonText}>
                      {t('common.cancel') || 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {t('common.save') || 'Save'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Edit2 size={18} color={COLORS.primary} />
                  <Text style={styles.editButtonText}>
                    {t('common.edit') || 'Edit'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </SafeAreaView>
        </Modal>
      )}
    </>
  );
};

const AccountInfoSkeleton: React.FC = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 1, 0.6],
    }),
  };

  return (
    <Animated.View style={shimmerStyle}>
      {}
      <View style={skeletonStyles.fieldContainer}>
        <View style={skeletonStyles.fieldHeader}>
          <View style={skeletonStyles.fieldIcon} />
          <View style={[skeletonStyles.skeleton, skeletonStyles.fieldLabel]} />
        </View>
        <View style={[skeletonStyles.skeleton, skeletonStyles.valueBox]} />
      </View>

      {}
      <View style={skeletonStyles.fieldContainer}>
        <View style={skeletonStyles.fieldHeader}>
          <View style={skeletonStyles.fieldIcon} />
          <View style={[skeletonStyles.skeleton, skeletonStyles.fieldLabel]} />
        </View>
        <View style={[skeletonStyles.skeleton, skeletonStyles.valueBox]} />
      </View>
    </Animated.View>
  );
};

const skeletonStyles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
    marginRight: 8,
  },
  skeleton: {
    backgroundColor: '#D1D5DB',
    borderRadius: 4,
  },
  fieldLabel: {
    width: 80,
    height: 12,
  },
  valueBox: {
    width: '100%',
    height: 44,
    borderRadius: 12,
  },
});

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
    padding: SIZES.padding,
    paddingBottom: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22C55E',
    marginLeft: 4,
  },
  valueContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  unverifiedText: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 44,
  },
  warningContainer: {
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  passwordButtonContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
  },
  passwordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AccountInformationSheet;

