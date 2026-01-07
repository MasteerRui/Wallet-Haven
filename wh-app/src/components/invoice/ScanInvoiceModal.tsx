import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  Alert,
  Linking,
  ScrollView,
  PermissionsAndroid,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import {
  CloseCircle,
  Camera as CameraIcon,
  Gallery,
} from 'iconsax-react-nativejs';
import { COLORS } from '../../constants/theme';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { getApiUrl, API_ENDPOINTS } from '../../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InvoiceEditSheet from './InvoiceEditSheet';
import apiService from '../../services/apiService';
import { useTranslation } from '../../hooks/useTranslation';

interface ScanInvoiceModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const ScanInvoiceModal: React.FC<ScanInvoiceModalProps> = ({
  isVisible,
  onClose,
}) => {
  const { t } = useTranslation();
  const cameraRef = useRef<Camera | null>(null);
  const device = useCameraDevice('back');

  const [hasCameraPermission, setHasCameraPermission] = useState<
    'unknown' | 'granted' | 'denied'
  >('unknown');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocraiResponse, setOcraiResponse] = useState<any>(null);
  const [ocraiResults, setOcraiResults] = useState<any[]>([]);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const captureScanAnim = useRef(new Animated.Value(0)).current;
  const photoFadeAnim = useRef(new Animated.Value(0)).current;
  const spinnerAnim = useRef(new Animated.Value(0)).current;
  const processingScanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const checkPermission = async () => {
      try {
        const status = await Camera.getCameraPermissionStatus();

        const isGranted = status === 'authorized' || status === 'granted';
        if (isGranted) {
          setHasCameraPermission('granted');
          if (!device) {
            setCameraError(
              'Camera device not available. Please restart the app.',
            );
          } else {
            setCameraError(null);
          }
        } else if (status === 'denied' || status === 'restricted') {
          setHasCameraPermission('denied');
        } else {
          setHasCameraPermission('unknown');
        }
      } catch (error) {
        console.warn('Error checking camera permission:', error);
        setCameraError('Unable to access camera. Please restart the app.');
      }
    };

    checkPermission();
  }, [isVisible, device]);

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const beforeStatus = await Camera.getCameraPermissionStatus();

      const newStatus = await Camera.requestCameraPermission();

      const isGranted = newStatus === 'authorized' || newStatus === 'granted';
      if (isGranted) {
        setHasCameraPermission('granted');
        return true;
      } else {
        setHasCameraPermission('denied');
        Alert.alert(
          t('invoice.permissionRequired'),
          t('invoice.permissionDenied'),
        );
        return false;
      }
    } catch (error) {
      console.warn('Camera permission request failed:', error);
      Alert.alert(
        t('invoice.permissionError'),
        t('invoice.unableToRequestPermission'),
      );
      return false;
    }
  };

  const handleImageResponse = (response: any) => {

    if (response.didCancel) {
    } else if (response.errorCode) {

      if (response.errorCode === 'camera_unavailable') {
        Alert.alert(
          t('invoice.cameraUnavailable'),
          t('invoice.cameraUnavailableMessage'),
        );
      } else if (response.errorCode === 'permission') {
        Alert.alert(
          t('invoice.permissionRequired'),
          t('invoice.enableInSettings'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('invoice.openSettings'),
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      } else {
        Alert.alert(
          t('errors.error'),
          response.errorMessage || t('invoice.failedToGetImage'),
        );
      }
    } else if (response.assets && response.assets.length > 0) {
      const assets = response.assets;

      const photoUris = assets.map((asset: any) => asset.uri);
      setCapturedPhotos(photoUris);
      setCapturedPhoto(photoUris[0]); 

      photoFadeAnim.setValue(0);
      Animated.timing(photoFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setIsProcessing(true);
      setIsCapturing(true);
      spinnerAnim.setValue(0);
      Animated.loop(
        Animated.timing(spinnerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ).start();

      processInvoiceImages(assets);
    }
  };

  const processInvoiceImages = async (assets: any[]) => {
    try {
      
      const formData = new FormData();

      const fieldName = assets.length === 1 ? 'image' : 'images';
      assets.forEach((asset, index) => {
        formData.append(fieldName, {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `invoice_${index}.jpg`,
        } as any);
      });

      const result = await apiService.uploadFormData(
        API_ENDPOINTS.ocrai.process,
        formData,
      );

      if (result.needsLogin) {
        Alert.alert(
          t('invoice.sessionExpired'),
          t('invoice.sessionExpiredMessage'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                onClose();
              },
            },
          ],
        );
        return;
      }

      if (!result.success) {
        setIsProcessing(false);
        setIsCapturing(false);
        setCapturedPhoto(null);
        setCapturedPhotos([]);
        spinnerAnim.stopAnimation();
        Alert.alert(
          t('errors.error'),
          result.message || t('invoice.failedToProcess'),
          [{ text: t('common.ok'), onPress: () => onClose() }],
        );
        return;
      }

      setIsProcessing(false);
      setIsCapturing(false);
      spinnerAnim.stopAnimation();

      const data = result.data || result;

      const normalizeResult = (r: any): any => {
        if (!r) return null;

        if (r.result && typeof r.result === 'object') {
          const nestedResult = r.result;

          let normalizedDate =
            nestedResult.date || nestedResult.dateISO || null;
          if (normalizedDate) {
            
            if (normalizedDate.includes(' ')) {
              normalizedDate = normalizedDate.split(' ')[0];
            } else if (normalizedDate.includes('T')) {
              normalizedDate = normalizedDate.split('T')[0];
            }
            
            if (normalizedDate && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
              try {
                const dateObj = new Date(normalizedDate);
                if (!isNaN(dateObj.getTime())) {
                  normalizedDate = dateObj.toISOString().split('T')[0];
                }
              } catch (e) {
                console.warn(
                  '📦 [ScanInvoiceModal] Could not parse date:',
                  normalizedDate,
                );
              }
            }
          }

          return {
            ...r,
            ...nestedResult, 
            
            date:
              normalizedDate ||
              nestedResult.date ||
              nestedResult.dateISO ||
              null,
            
            category_id: nestedResult.category_id || r.category_id || null,
            category_name:
              nestedResult.category_name || r.category_name || null,
            category_icon:
              nestedResult.category_icon || r.category_icon || null,
            category_color:
              nestedResult.category_color || r.category_color || null,
            
            _originalResult: nestedResult,
          };
        }

        if (r.date || r.dateISO) {
          let normalizedDate = r.date || r.dateISO;
          if (normalizedDate.includes(' ')) {
            normalizedDate = normalizedDate.split(' ')[0];
          } else if (normalizedDate.includes('T')) {
            normalizedDate = normalizedDate.split('T')[0];
          }
          if (normalizedDate && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
            try {
              const dateObj = new Date(normalizedDate);
              if (!isNaN(dateObj.getTime())) {
                normalizedDate = dateObj.toISOString().split('T')[0];
              }
            } catch (e) {
              console.warn(
                '📦 [ScanInvoiceModal] Could not parse date:',
                normalizedDate,
              );
            }
          }
          return {
            ...r,
            date: normalizedDate || r.date || r.dateISO || null,
          };
        }

        return r;
      };

      let resultsToUse: any[] = [];

      if (Array.isArray(data)) {
        
        resultsToUse = data.map(normalizeResult).filter((r: any) => r !== null);
      } else if (data?.results && Array.isArray(data.results)) {
        
        resultsToUse = data.results
          .map(normalizeResult)
          .filter((r: any) => r !== null);
      } else if (data && typeof data === 'object') {
        
        const normalized = normalizeResult(data);
        if (normalized) {
          resultsToUse = [normalized];
        }
      } else if (data) {
        
        resultsToUse = [data];
      }

      if (resultsToUse.length === 0 && result && typeof result === 'object') {
        const resultAny = result as any;
        
        if (resultAny.results && Array.isArray(resultAny.results)) {
          resultsToUse = resultAny.results
            .map(normalizeResult)
            .filter((r: any) => r !== null);
        } else if (resultAny.data && Array.isArray(resultAny.data)) {
          resultsToUse = resultAny.data
            .map(normalizeResult)
            .filter((r: any) => r !== null);
        } else if (resultAny.result && Array.isArray(resultAny.result)) {
          resultsToUse = resultAny.result
            .map(normalizeResult)
            .filter((r: any) => r !== null);
        } else {
          
          const normalized = normalizeResult(resultAny);
          if (normalized) {
            resultsToUse = [normalized];
          }
        }
      }

      if (resultsToUse.length === 0) {
        
        console.error(
          '📦 [ScanInvoiceModal] NO RESULTS FOUND AFTER ALL ATTEMPTS!',
        );
        console.error(
          '📦 [ScanInvoiceModal] Full result:',
          JSON.stringify(result, null, 2),
        );
        console.error('📦 [ScanInvoiceModal] Data structure:', {
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : [],
          dataType: typeof data,
          isArray: Array.isArray(data),
          dataValue: data,
        });

        Alert.alert(t('errors.error'), t('invoice.failedToProcess'), [
          { text: t('common.ok'), onPress: () => onClose() },
        ]);
        return;
      }

      setOcraiResults(resultsToUse);
      setOcraiResponse(resultsToUse[0]);
      setCurrentResultIndex(0);
      setShowEditSheet(true);
    } catch (error: any) {
      console.error('OCR Processing Error:', error);

      setIsProcessing(false);
      setIsCapturing(false);
      setCapturedPhoto(null);
      setCapturedPhotos([]);
      spinnerAnim.stopAnimation();

      let errorMessage = 'Unknown error occurred';

      if (error.message?.includes('Network request failed')) {
        errorMessage =
          'Unable to connect to server. Please check your internet connection.';
      } else if (error.message?.includes('413')) {
        errorMessage =
          'Image file is too large. Please try with a smaller image.';
      } else {
        errorMessage = error.message || 'Failed to process image';
      }

      Alert.alert(t('invoice.processingFailed'), errorMessage, [
        { text: t('common.tryAgain'), onPress: () => {} },
        { text: t('common.cancel'), onPress: () => onClose() },
      ]);
    }
  };

  useEffect(() => {
    if (!isVisible) {
      
      setCapturedPhoto(null);
      setCapturedPhotos([]);
      setIsCapturing(false);
      setIsProcessing(false);
      setOcraiResponse(null);
      setOcraiResults([]);
      setCurrentResultIndex(0);
      setShowEditSheet(false);
      
      captureScanAnim.setValue(0);
      photoFadeAnim.setValue(0);
      processingScanAnim.setValue(0);
      spinnerAnim.stopAnimation();
      processingScanAnim.stopAnimation();
    }
  }, [
    isVisible,
    captureScanAnim,
    photoFadeAnim,
    spinnerAnim,
    processingScanAnim,
  ]);

  useEffect(() => {
    if (isProcessing && capturedPhoto) {
      processingScanAnim.setValue(0);
      Animated.loop(
        Animated.timing(processingScanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      processingScanAnim.stopAnimation();
      processingScanAnim.setValue(0);
    }
  }, [isProcessing, capturedPhoto, processingScanAnim]);

  const handleCapturePhoto = async () => {

    if (!device || !cameraRef.current) {
      Alert.alert(
        t('invoice.cameraNotAvailable'),
        t('invoice.cameraNotAvailableMessage'),
      );
      return;
    }

    setIsCapturing(true);

    try {
      
      captureScanAnim.setValue(0);
      Animated.timing(captureScanAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      setTimeout(async () => {
        try {
          const photo = await cameraRef.current!.takePhoto({
            qualityPrioritization: 'balanced',
          });

          const photoUri =
            Platform.OS === 'android' ? `file://${photo.path}` : photo.path;

          setCapturedPhoto(photoUri);
          photoFadeAnim.setValue(0);
          Animated.timing(photoFadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();

          setIsProcessing(true);
          spinnerAnim.setValue(0);
          Animated.loop(
            Animated.timing(spinnerAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ).start();

          const fakeAsset = {
            uri: photoUri,
            type: 'image/jpeg',
            fileName: photo.path.split('/').pop() || 'invoice.jpg',
            fileSize: photo.size ?? undefined,
          };

          handleImageResponse({ assets: [fakeAsset] });
        } catch (error: any) {
          console.warn('Failed to capture photo:', error);
          setIsCapturing(false);
          setIsProcessing(false);
          setCapturedPhoto(null);
          spinnerAnim.stopAnimation();
          Alert.alert(
            t('errors.error'),
            error?.message || t('invoice.failedToProcess'),
          );
        }
      }, 600);
    } catch (error: any) {
      console.warn('Failed to capture photo:', error);
      setIsCapturing(false);
      setIsProcessing(false);
      Alert.alert(
        t('errors.error'),
        error?.message || t('invoice.failedToProcess'),
      );
    }
  };

  const handleOpenGallery = () => {

    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8, 
      selectionLimit: 10, 
      includeBase64: false,
      maxWidth: 1920, 
      maxHeight: 1920, 
    };

    launchImageLibrary(options, handleImageResponse);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" animated={true} />
      <View style={styles.container}>
        {}
        {hasCameraPermission === 'granted' && device ? (
          <>
            <Camera
              ref={cameraRef}
              style={styles.cameraView}
              device={device}
              isActive={isVisible && capturedPhotos.length === 0}
              photo={true}
            />

            {}
            {capturedPhotos.length > 0 && (
              <Animated.View
                style={[
                  styles.capturedPhotoContainer,
                  {
                    opacity: photoFadeAnim,
                  },
                ]}
              >
                {capturedPhotos.length === 1 ? (
                  <Image
                    source={{ uri: capturedPhotos[0] }}
                    style={styles.capturedPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photosGrid}>
                    {capturedPhotos.slice(0, 4).map((uri, index) => (
                      <View
                        key={index}
                        style={[
                          styles.gridPhoto,
                          capturedPhotos.length === 2 && styles.gridPhotoTwo,
                          capturedPhotos.length === 3 &&
                            index === 0 &&
                            styles.gridPhotoThreeLarge,
                          capturedPhotos.length >= 4 && styles.gridPhotoFour,
                        ]}
                      >
                        <Image
                          source={{ uri }}
                          style={styles.gridPhotoImage}
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                    {capturedPhotos.length > 4 && (
                      <View
                        style={[
                          styles.gridPhoto,
                          styles.gridPhotoFour,
                          styles.photoOverlay,
                        ]}
                      >
                        <Text style={styles.photoCountText}>
                          +{capturedPhotos.length - 4}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                <View style={styles.darkOverlay} />
              </Animated.View>
            )}

            {}
            <View style={styles.overlay}>
              {}
              <View style={styles.topBar}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButtonFloating}
                >
                  <CloseCircle size={28} color="#FFFFFF" variant="Bold" />
                </TouchableOpacity>
              </View>

              {}
              {capturedPhotos.length === 0 && (
                <View style={styles.scanFrameContainer}>
                  <View style={styles.scanFrame}>
                    <View style={styles.scanFrameCorner} />
                    <View
                      style={[
                        styles.scanFrameCorner,
                        styles.scanFrameCornerTopRight,
                      ]}
                    />
                    <View
                      style={[
                        styles.scanFrameCorner,
                        styles.scanFrameCornerBottomLeft,
                      ]}
                    />
                    <View
                      style={[
                        styles.scanFrameCorner,
                        styles.scanFrameCornerBottomRight,
                      ]}
                    />

                    {}
                    {isCapturing && (
                      <Animated.View
                        style={[
                          styles.scanningLine,
                          {
                            transform: [
                              {
                                translateY: captureScanAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['-50%', '50%'],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    )}
                  </View>
                  <Text style={styles.scanFrameHint}>
                    {t('invoice.positionReceipt')}
                  </Text>
                </View>
              )}

              {}
              {isProcessing && (
                <View style={styles.processingContainer}>
                  <Animated.View
                    style={[
                      styles.loadingSpinner,
                      {
                        transform: [
                          {
                            rotate: spinnerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <Text style={styles.processingText}>
                    {capturedPhotos.length > 1
                      ? t('invoice.processingReceipts', { count: capturedPhotos.length })
                      : t('invoice.processingReceipt')}
                  </Text>
                  <Text style={styles.processingSubtext}>
                    {capturedPhotos.length > 1
                      ? t('invoice.extractingTextMultiple')
                      : t('invoice.extractingText')}
                  </Text>
                </View>
              )}

              {}
              {!isProcessing && (
                <View style={styles.bottomControls}>
                  <TouchableOpacity
                    style={styles.galleryButton}
                    onPress={handleOpenGallery}
                  >
                    <Gallery size={24} color="#FFFFFF" variant="Bold" />
                  </TouchableOpacity>

                  <View style={styles.captureButtonContainer}>
                    <TouchableOpacity
                      style={styles.captureButton}
                      onPress={handleCapturePhoto}
                      disabled={isCapturing}
                    >
                      <View style={styles.captureButtonInner} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.transparentButtonPlaceholder} />
                </View>
              )}
            </View>
          </>
        ) : hasCameraPermission === 'granted' && !device ? (
          
          <View style={styles.cameraPlaceholderFull}>
            {}
            {capturedPhotos.length === 0 && (
              <View style={styles.placeholderContent}>
                <CameraIcon size={80} color={COLORS.primary} variant="Bold" />
                <Text style={styles.placeholderTitle}>
                  {t('invoice.cameraNotAvailable')}
                </Text>
                <Text style={styles.placeholderSubtitle}>
                  {cameraError || t('invoice.cameraNotAvailableMessage')}
                </Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleOpenGallery}
                >
                  <Gallery size={24} color="#FFFFFF" variant="Bold" />
                  <Text style={styles.uploadButtonText}>
                    {t('invoice.uploadFromGallery')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {}
            {capturedPhotos.length > 0 && (
              <Animated.View
                style={[
                  styles.capturedPhotoContainer,
                  { opacity: photoFadeAnim },
                ]}
              >
                {capturedPhotos.length === 1 ? (
                  <Image
                    source={{ uri: capturedPhotos[0] }}
                    style={styles.capturedPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photosGrid}>
                    {capturedPhotos.slice(0, 4).map((uri, index) => (
                      <View
                        key={index}
                        style={[
                          styles.gridPhoto,
                          capturedPhotos.length === 2 && styles.gridPhotoTwo,
                          capturedPhotos.length === 3 &&
                            index === 0 &&
                            styles.gridPhotoThreeLarge,
                          capturedPhotos.length >= 4 && styles.gridPhotoFour,
                        ]}
                      >
                        <Image
                          source={{ uri }}
                          style={styles.gridPhotoImage}
                          resizeMode="cover"
                        />
                        {index === 3 && capturedPhotos.length > 4 && (
                          <View style={styles.photoOverlay}>
                            <Text style={styles.photoCountText}>
                              +{capturedPhotos.length - 4}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.darkOverlay} />
              </Animated.View>
            )}

            {}
            <View style={styles.overlay}>
              <View style={styles.topBar}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButtonFloating}
                >
                  <CloseCircle
                    size={28}
                    color={capturedPhotos.length > 0 ? '#FFFFFF' : COLORS.text}
                    variant="Bold"
                  />
                </TouchableOpacity>
              </View>

              {}
              {isProcessing && (
                <View style={styles.processingContainer}>
                  <Animated.View
                    style={[
                      styles.loadingSpinner,
                      {
                        transform: [
                          {
                            rotate: spinnerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <Text style={styles.processingText}>
                    {capturedPhotos.length > 1
                      ? t('invoice.processingReceipts', { count: capturedPhotos.length })
                      : t('invoice.processingReceipt')}
                  </Text>
                  <Text style={styles.processingSubtext}>
                    {capturedPhotos.length > 1
                      ? t('invoice.extractingTextMultiple')
                      : t('invoice.extractingText')}
                  </Text>
                </View>
              )}

              {}
              {!isProcessing && (
                <View style={styles.bottomControls}>
                  <TouchableOpacity
                    style={styles.galleryButton}
                    onPress={handleOpenGallery}
                  >
                    <Gallery
                      size={24}
                      color={
                        capturedPhotos.length > 0 ? '#FFFFFF' : COLORS.primary
                      }
                      variant="Bold"
                    />
                  </TouchableOpacity>

                  <View style={styles.captureButtonDisabled}>
                    <View style={styles.captureButtonInnerDisabled} />
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          
          <View style={styles.cameraPlaceholderFull}>
            {}
            {capturedPhotos.length === 0 && (
              <View style={styles.placeholderContent}>
                <CameraIcon size={80} color={COLORS.primary} variant="Bold" />
                <Text style={styles.placeholderTitle}>
                  {t('invoice.cameraNotAvailable')}
                </Text>
                <Text style={styles.placeholderSubtitle}>
                  {t('invoice.cameraNotAvailableMessage')}
                </Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleOpenGallery}
                >
                  <Gallery size={24} color="#FFFFFF" variant="Bold" />
                  <Text style={styles.uploadButtonText}>
                    {t('invoice.uploadFromGallery')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButtonFloating}
              >
                <CloseCircle
                  size={28}
                  color={capturedPhotos.length > 0 ? '#FFFFFF' : COLORS.text}
                  variant="Bold"
                />
              </TouchableOpacity>
            </View>

            {}
            {capturedPhotos.length > 0 && (
              <Animated.View
                style={[
                  styles.capturedPhotoContainer,
                  { opacity: photoFadeAnim },
                ]}
              >
                {capturedPhotos.length === 1 ? (
                  <Image
                    source={{ uri: capturedPhotos[0] }}
                    style={styles.capturedPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photosGrid}>
                    {capturedPhotos.slice(0, 4).map((uri, index) => (
                      <View
                        key={index}
                        style={[
                          styles.gridPhoto,
                          capturedPhotos.length === 2 && styles.gridPhotoTwo,
                          capturedPhotos.length === 3 &&
                            index === 0 &&
                            styles.gridPhotoThreeLarge,
                          capturedPhotos.length >= 4 && styles.gridPhotoFour,
                        ]}
                      >
                        <Image
                          source={{ uri }}
                          style={styles.gridPhotoImage}
                          resizeMode="cover"
                        />
                        {index === 3 && capturedPhotos.length > 4 && (
                          <View style={styles.photoOverlay}>
                            <Text style={styles.photoCountText}>
                              +{capturedPhotos.length - 4}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.darkOverlay} />
              </Animated.View>
            )}

            {}
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <View style={styles.processingContainer}>
                  <Animated.View
                    style={[
                      styles.loadingSpinner,
                      {
                        transform: [
                          {
                            rotate: spinnerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <Text style={styles.processingText}>
                    {capturedPhotos.length > 1
                      ? t('invoice.processingReceipts', { count: capturedPhotos.length })
                      : t('invoice.processingReceipt')}
                  </Text>
                  <Text style={styles.processingSubtext}>
                    {capturedPhotos.length > 1
                      ? t('invoice.extractingTextMultiple')
                      : t('invoice.extractingText')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {}
      {ocraiResults.length > 0 && (
        <InvoiceEditSheet
          isVisible={showEditSheet}
          onClose={() => {

            setShowEditSheet(false);
            
            setOcraiResponse(null);
            setOcraiResults([]);
            setCurrentResultIndex(0);
            
            setCapturedPhoto(null);
            setCapturedPhotos([]);
            setIsProcessing(false);
            setIsCapturing(false);
            
            photoFadeAnim.setValue(0);
            spinnerAnim.stopAnimation();
            processingScanAnim.stopAnimation();
            
          }}
          ocraiResults={ocraiResults}
          onTransactionCreated={() => {
            
          }}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 0,
    overflow: 'hidden',
  },
  cameraView: {
    flex: 1,
    width: '100%',
    borderRadius: 0,
  },
  cameraPlaceholderFull: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeButtonFloating: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    position: 'relative',
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transparentButton: {
    width: 24,
    height: 24,
  },
  transparentButtonPlaceholder: {
    width: 56,
    height: 56,
    backgroundColor: 'transparent',
  },
  captureButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
  },
  captureButtonDisabled: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  captureButtonInnerDisabled: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanFrameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scanFrame: {
    width: '85%',
    aspectRatio: 0.6, 
    maxWidth: 280,
    maxHeight: 500,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  scanFrameDetecting: {
    borderColor: COLORS.primary,
    borderWidth: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  scanFrameDetected: {
    borderColor: '#4CAF50',
    borderWidth: 3,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  scanningLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: COLORS.primary,
    top: '50%',
    opacity: 0.8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  detectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderTopColor: COLORS.primary,
    marginBottom: 12,
  },
  capturingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  capturedPhotoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    borderRadius: 0,
  },
  capturedPhoto: {
    flex: 1,
    width: '100%',
    borderRadius: 0,
  },
  photosGrid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  gridPhoto: {
    backgroundColor: '#1a1a1a',
    borderRadius: 0,
    overflow: 'hidden',
  },
  gridPhotoTwo: {
    width: '50%',
    height: '100%',
  },
  gridPhotoThreeLarge: {
    width: '100%',
    height: '66%',
  },
  gridPhotoFour: {
    width: '50%',
    height: '50%',
  },
  gridPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  photoOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  processingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  processingScanLine: {
    position: 'absolute',
    width: '100%',
    height: 4,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  scanFrameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.primary,
    top: -2,
    left: -2,
  },
  scanFrameCornerTopRight: {
    top: -2,
    right: -2,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  scanFrameCornerBottomLeft: {
    top: 'auto',
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  scanFrameCornerBottomRight: {
    top: 'auto',
    bottom: -2,
    right: -2,
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanFrameHint: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default ScanInvoiceModal;
