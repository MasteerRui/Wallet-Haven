import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../constants/theme';
import CalculatorSheet from './CalculatorSheet';
import transactionService from '../../services/transactionService';
import walletService from '../../services/walletService';
import AccountSelectorSheet from '../home/AccountSelectorSheet';
import CategoryIcon from '../common/CategoryIcon';
import DateSheet from '../common/DateSheet';
import CategorySheet, { Category } from '../category/CategorySheet';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';
import Toast from '../common/Toast';
import DocumentPicker from 'react-native-document-picker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import fileService from '../../services/fileService';

interface TransactionItem {
  name: string;
}

interface AddTransactionSheetProps {
  isVisible: boolean;
  onClose: () => void;
  transactionType: 'income' | 'expense' | 'transfer';
  onTransactionCreated?: () => void; 
  transactionToEdit?: any; 
}

const AddTransactionSheet: React.FC<AddTransactionSheetProps> = ({
  isVisible,
  onClose,
  transactionType,
  onTransactionCreated,
  transactionToEdit,
}) => {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const isEditMode = !!transactionToEdit;
  const [amount, setAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [categoryIcon, setCategoryIcon] = useState<string | null>(null);
  const [categoryColor, setCategoryColor] = useState<string | null>(null);
  const [isCategorySelectorVisible, setIsCategorySelectorVisible] =
    useState(false);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [date, setDate] = useState<Date>(new Date()); 
  const [selectedWallet, setSelectedWallet] = useState('Conta Principal');
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState('0');
  const [walletCurrency, setWalletCurrency] = useState<string>('EUR');
  
  const [selectedDestinationWallet, setSelectedDestinationWallet] = useState(
    t('transactions.selectDestinationWallet'),
  );
  const [selectedDestinationWalletId, setSelectedDestinationWalletId] =
    useState<string | null>(null);
  const [destinationWalletBalance, setDestinationWalletBalance] = useState('0');
  const [destinationWalletCurrency, setDestinationWalletCurrency] =
    useState<string>('EUR');
  const [repeatEnabled, setRepeatEnabled] = useState(false);

  const [recurrenceFrequency, setRecurrenceFrequency] = useState<
    'daily' | 'weekly' | 'monthly' | 'yearly'
  >('monthly');
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<Date>(
    new Date(),
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [hasRecurrenceEndDate, setHasRecurrenceEndDate] = useState(false);
  const [isRecurrenceSheetVisible, setIsRecurrenceSheetVisible] =
    useState(false);

  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const [isAccountSelectorVisible, setIsAccountSelectorVisible] =
    useState(false);
  const [
    isDestinationAccountSelectorVisible,
    setIsDestinationAccountSelectorVisible,
  ] = useState(false);
  const [isDateSheetVisible, setIsDateSheetVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<TransactionItem[]>([]);
  const [showItemsEditor, setShowItemsEditor] = useState(false);
  const [itemsText, setItemsText] = useState('');

  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number;
  } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const itemFadeAnims = useRef<{ [key: number]: Animated.Value }>({});
  const removeButtonAnims = useRef<{ [key: number]: Animated.Value }>({});
  const listItemAnims = useRef<{ [key: number]: Animated.Value }>({});
  const itemInputRefs = useRef<{ [key: number]: TextInput | null }>({});

  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    if (date.toDateString() === today.toDateString()) {
      return `${t('home.today')} ${timeString}`;
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return `${t('home.yesterday')} ${timeString}`;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year} ${timeString}`;
  };

  const formatDateForAPI = (date: Date): string => {
    return date.toISOString();
  };

  const getFrequencyDisplayText = (): string => {
    const frequencyMap = {
      daily: t('transactions.daily'),
      weekly: t('transactions.weekly'),
      monthly: t('transactions.monthly'),
      yearly: t('transactions.yearly'),
    };
    return frequencyMap[recurrenceFrequency];
  };

  const getRecurrenceDisplayText = (): string => {
    if (!repeatEnabled) return t('transactions.repeat');
    return `${t('transactions.repeat')}: ${getFrequencyDisplayText()}`;
  };

  const getRemoveButtonAnim = (index: number): Animated.Value => {
    if (!removeButtonAnims.current[index]) {
      removeButtonAnims.current[index] = new Animated.Value(0);
    }
    return removeButtonAnims.current[index];
  };

  const getItemFadeAnim = (index: number): Animated.Value => {
    if (!itemFadeAnims.current[index]) {
      itemFadeAnims.current[index] = new Animated.Value(0);
    }
    return itemFadeAnims.current[index];
  };

  const getListItemAnim = (index: number): Animated.Value => {
    if (!listItemAnims.current[index]) {
      listItemAnims.current[index] = new Animated.Value(0);
    }
    return listItemAnims.current[index];
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, name: string) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { name: name.trim() || 'Item' };
      return newItems;
    });
  };

  const handleAddNewItem = () => {
    const newItem: TransactionItem = { name: '' };
    const newItems = [...items, newItem];
    const newIndex = newItems.length - 1;

    const fadeAnim = getItemFadeAnim(newIndex);
    const buttonAnim = getRemoveButtonAnim(newIndex);

    fadeAnim.setValue(0);
    buttonAnim.setValue(0);

    const newSaveButtonAnim = getItemFadeAnim(newItems.length + 1);
    newSaveButtonAnim.setValue(1);

    setItems(newItems);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();

        Animated.timing(buttonAnim, {
          toValue: 1,
          duration: 300,
          delay: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();

        const addButtonAnim = getItemFadeAnim(newItems.length);
        addButtonAnim.setValue(0);
        Animated.timing(addButtonAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();

        setTimeout(() => {
          const lastInputRef = itemInputRefs.current[newIndex];
          if (lastInputRef) {
            lastInputRef.focus();
          }
        }, 400);
      });
    });
  };

  const handleOpenItemsEditor = () => {
    
    items.forEach((_, index) => {
      const buttonAnim = getRemoveButtonAnim(index);
      const fadeAnim = getItemFadeAnim(index);
      
      buttonAnim.setValue(1);
      fadeAnim.setValue(1);
    });

    setShowItemsEditor(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        items.forEach((_, index) => {
          const fadeAnim = getItemFadeAnim(index);
          const buttonAnim = getRemoveButtonAnim(index);

          fadeAnim.setValue(0);
          buttonAnim.setValue(0);

          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            delay: index * 40,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();

          Animated.timing(buttonAnim, {
            toValue: 1,
            duration: 250,
            delay: index * 40 + 100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
        });

        const addButtonAnim = getItemFadeAnim(items.length);
        Animated.timing(addButtonAnim, {
          toValue: 1,
          duration: 300,
          delay: items.length * 40,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();

        const saveButtonAnim = getItemFadeAnim(items.length + 1);
        Animated.timing(saveButtonAnim, {
          toValue: 1,
          duration: 300,
          delay: (items.length + 1) * 40,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    });
  };

  const handleSaveItemsEditor = () => {
    
    const validItems = items.filter(item => item.name.trim() !== '');
    setItems(validItems);

    const animationPromises = items.map((_, index) => {
      return new Promise<void>(resolve => {
        const fadeAnim = getItemFadeAnim(index);
        const buttonAnim = getRemoveButtonAnim(index);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(buttonAnim, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => resolve());
      });
    });

    const addButtonAnim = getItemFadeAnim(items.length);
    const saveButtonAnim = getItemFadeAnim(items.length + 1);

    Animated.parallel([
      Animated.timing(addButtonAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(saveButtonAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    Promise.all(animationPromises).then(() => {
      setShowItemsEditor(false);

      requestAnimationFrame(() => {
        validItems.forEach((_, index) => {
          const listAnim = getListItemAnim(index);
          listAnim.setValue(0);

          Animated.timing(listAnim, {
            toValue: 1,
            duration: 300,
            delay: index * 50,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
        });
      });
    });
  };

  const handleCancelItemsEditor = () => {
    
    const fadeOutPromises = items.map((_, index) => {
      return new Promise<void>(resolve => {
        const fadeAnim = getItemFadeAnim(index);
        const buttonAnim = getRemoveButtonAnim(index);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(buttonAnim, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          
          const listAnim = getListItemAnim(index);
          listAnim.setValue(1);
          resolve();
        });
      });
    });

    Promise.all(fadeOutPromises).then(() => {
      setShowItemsEditor(false);
    });
  };

  const resetForm = () => {
    setAmount('0');
    setDescription('');
    setCategory('');
    setSelectedCategory(null);
    setCategoryId(null);
    setCategoryName(null);
    setCategoryIcon(null);
    setCategoryColor(null);
    setNotes('');
    setTags('');
    setDate(new Date());
    setItems([]);
    setItemsText('');
    setShowItemsEditor(false);
    setIsCategorySelectorVisible(false);

    setRepeatEnabled(false);
    setRecurrenceFrequency('monthly');
    setRecurrenceStartDate(new Date());
    setRecurrenceEndDate(null);
    setHasRecurrenceEndDate(false);
    setIsRecurrenceSheetVisible(false);

    itemFadeAnims.current = {};
    removeButtonAnims.current = {};
    listItemAnims.current = {};
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (isVisible) {
      loadSavedWallet();
      
      items.forEach((_, index) => {
        const listAnim = getListItemAnim(index);
        listAnim.setValue(1); 
      });
    }
  }, [isVisible]);

  useEffect(() => {
    setRecurrenceStartDate(date);
  }, [date]);

  useEffect(() => {
    if (isVisible && transactionToEdit) {

      setAmount(Math.abs(transactionToEdit.amount).toString());

      if (transactionToEdit.name) {
        setDescription(transactionToEdit.name);
      }

      if (transactionToEdit.notes) {
        setNotes(transactionToEdit.notes);
      }

      if (transactionToEdit.tags) {
        if (Array.isArray(transactionToEdit.tags)) {
          setTags(transactionToEdit.tags.join(', '));
        } else {
          setTags(transactionToEdit.tags);
        }
      }

      if (transactionToEdit.date || transactionToEdit.created_at) {
        setDate(
          new Date(transactionToEdit.date || transactionToEdit.created_at),
        );
      }

      if (transactionToEdit.category) {
        setSelectedCategory(transactionToEdit.category);
        setCategoryId(transactionToEdit.category.id);
        setCategoryName(transactionToEdit.category.name);
        setCategoryIcon(transactionToEdit.category.icon);
        setCategoryColor(transactionToEdit.category.color);
      }

      if (transactionToEdit.wallet) {
        setSelectedWallet(transactionToEdit.wallet.name);
        setSelectedWalletId(transactionToEdit.wallet.id.toString());
        setWalletBalance(transactionToEdit.wallet.balance?.toFixed(2) || '0');
        setWalletCurrency(transactionToEdit.wallet.currency || 'EUR');
      }

      if (transactionToEdit.items && Array.isArray(transactionToEdit.items)) {
        setItems(
          transactionToEdit.items.map((item: any) => ({
            name: item.name || '',
          })),
        );
      }

    }
  }, [isVisible, transactionToEdit]);

  const loadSavedWallet = async () => {
    try {
      const savedWalletId = await walletService.getSavedWalletId();
      if (savedWalletId) {
        const walletsRes = await walletService.getWallets();
        if (walletsRes.success && walletsRes.data?.wallets) {
          const savedWallet = walletsRes.data.wallets.find(
            w => w.id.toString() === savedWalletId,
          );
          if (savedWallet) {
            setSelectedWallet(savedWallet.name);
            setSelectedWalletId(savedWallet.id.toString());
            setWalletBalance(savedWallet.balance.toFixed(2));
            setWalletCurrency(savedWallet.currency || 'EUR');
          } else {
            
            if (walletsRes.data.wallets.length > 0) {
              const firstWallet = walletsRes.data.wallets[0];
              setSelectedWallet(firstWallet.name);
              setSelectedWalletId(firstWallet.id.toString());
              setWalletBalance(firstWallet.balance.toFixed(2));
              setWalletCurrency(firstWallet.currency || 'EUR');
            }
          }
        }
      } else {
        
        const walletsRes = await walletService.getWallets();
        if (
          walletsRes.success &&
          walletsRes.data?.wallets &&
          walletsRes.data.wallets.length > 0
        ) {
          const firstWallet = walletsRes.data.wallets[0];
          setSelectedWallet(firstWallet.name);
          setSelectedWalletId(firstWallet.id.toString());
          setWalletBalance(firstWallet.balance.toFixed(2));
          setWalletCurrency(firstWallet.currency || 'EUR');
        }
      }
    } catch (error) {
      console.error('Error loading saved wallet:', error);
    }
  };

  const getCurrencySymbol = (currencyCode: string): string => {
    const currencyMap: { [key: string]: string } = {
      EUR: '€',
      USD: '$',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      CHF: 'Fr',
      CAD: 'CA$',
      AUD: 'A$',
      NZD: 'NZ$',
      INR: '₹',
      BRL: 'R$',
      ZAR: 'R',
      RUB: '₽',
      KRW: '₩',
      MXN: 'MX$',
      SEK: 'kr',
      NOK: 'kr',
      DKK: 'kr',
      PLN: 'zł',
      TRY: '₺',
      THB: '฿',
      IDR: 'Rp',
      MYR: 'RM',
      PHP: '₱',
      SGD: 'S$',
      HKD: 'HK$',
      TWD: 'NT$',
      ARS: 'AR$',
      CLP: 'CL$',
      COP: 'COL$',
      PEN: 'S/',
      VND: '₫',
      EGP: 'E£',
      NGN: '₦',
      KES: 'KSh',
      AED: 'د.إ',
      SAR: 'SR',
      ILS: '₪',
      CZK: 'Kč',
      HUF: 'Ft',
      RON: 'lei',
    };
    return currencyMap[currencyCode] || currencyCode;
  };

  const getIcon = () => {
    switch (transactionType) {
      case 'income':
        return '↑';
      case 'expense':
        return '↓';
      case 'transfer':
        return '⇄';
      default:
        return '•';
    }
  };

  const getTitle = () => {
    
    const prefix = isEditMode ? 'Editar ' : '';

    switch (transactionType) {
      case 'income':
        return prefix + t('transactions.addIncome');
      case 'expense':
        return prefix + t('transactions.addExpense');
      case 'transfer':
        return prefix + t('transactions.transfer');
      default:
        return prefix + t('transactions.newTransaction');
    }
  };

  const getColor = () => {
    switch (transactionType) {
      case 'income':
        return '#22C55E';
      case 'expense':
        return '#EF4444';
      case 'transfer':
        return COLORS.primary;
      default:
        return COLORS.primary;
    }
  };

  const handleOriginWalletSelect = (account: any) => {
    setSelectedWalletId(account.id); 
    setSelectedWallet(account.name);
    setWalletBalance(account.balance.toFixed(2));
    setWalletCurrency(account.currency || 'EUR');
    setIsAccountSelectorVisible(false);
  };

  const handleDestinationWalletSelect = (account: any) => {
    setSelectedDestinationWalletId(account.id); 
    setSelectedDestinationWallet(account.name);
    setDestinationWalletBalance(account.balance.toFixed(2));
    setDestinationWalletCurrency(account.currency || 'EUR');
    setIsDestinationAccountSelectorVisible(false);
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setCategory(category.name);
    setCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryIcon(category.icon);
    setCategoryColor(category.color);
    setIsCategorySelectorVisible(false);
  };

  const handleAttachDocument = () => {
    const options = [
      t('invoice.takePhoto'),
      t('invoice.chooseFromGallery'),
      t('invoice.chooseDocument'),
      t('common.cancel'),
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 3,
        },
        async buttonIndex => {
          if (buttonIndex === 0) {
            
            await handleTakePhoto();
          } else if (buttonIndex === 1) {
            
            await handleChooseFromGallery();
          } else if (buttonIndex === 2) {
            
            await handleChooseDocument();
          }
        },
      );
    } else {
      Alert.alert(
        'Anexar Documento',
        'Escolha uma opção',
        [
          {
            text: t('invoice.takePhoto'),
            onPress: () => handleTakePhoto(),
          },
          {
            text: t('invoice.chooseFromGallery'),
            onPress: () => handleChooseFromGallery(),
          },
          {
            text: t('invoice.chooseDocument'),
            onPress: () => handleChooseDocument(),
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
        ],
        { cancelable: true },
      );
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.assets && result.assets[0]) {
        await selectFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showError(t('errors.error'));
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.assets && result.assets[0]) {
        await selectFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error choosing from gallery:', error);
      showError(t('errors.error'));
    }
  };

  const handleChooseDocument = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      if (result && result[0]) {
        await selectFile({
          uri: result[0].uri,
          type: result[0].type || 'application/pdf',
          name: result[0].name,
          fileSize: result[0].size,
        });
      }
    } catch (error: any) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Error choosing document:', error);
        showError(t('errors.error'));
      }
    }
  };

  const selectFile = async (file: any) => {
    try {
      
      setSelectedFile({
        uri: file.uri,
        name: file.name || file.fileName || 'attachment',
        type: file.type,
        size: file.fileSize,
      });
      showSuccess('Ficheiro selecionado!');
    } catch (error) {
      console.error('Error selecting file:', error);
      showError('Erro ao selecionar ficheiro');
    }
  };

  const handleSave = async () => {
    
    const amountValue = parseFloat(amount.replace(/\./g, '').replace(',', '.'));

    if (!amountValue || amountValue <= 0) {
      showError(t('transactions.enterValidAmount'));
      return;
    }

    setLoading(true);

    try {
      let result;
      let fileId: number | undefined;

      if (selectedFile && isEditMode) {
        setUploadingFile(true);
        const uploadResponse = await fileService.uploadFile(
          selectedFile.uri,
          selectedFile.name,
          selectedFile.type,
        );
        setUploadingFile(false);

        if (uploadResponse.success && uploadResponse.file) {
          fileId = uploadResponse.file.id;
        } else {
          showError(uploadResponse.message || 'Erro ao enviar ficheiro');
          setLoading(false);
          return;
        }
      }

      if (isEditMode && transactionToEdit?.id) {

        const updateData: any = {
          amount: amountValue,
          date: formatDateForAPI(date),
        };

        if (categoryId) {
          updateData.category_id = categoryId;
        }
        if (description) {
          updateData.name = description;
        }
        if (notes) {
          updateData.notes = notes;
        }
        if (tags) {
          updateData.tags = Array.isArray(tags)
            ? tags
            : tags.split(',').map((t: string) => t.trim());
        }
        if (items.length > 0) {
          updateData.items = items.map(item => ({
            name: item.name,
            price: 0,
            quantity: 1,
          }));
        }
        if (fileId) {
          updateData.file_id = fileId;
        }

        result = await transactionService.updateTransaction(
          transactionToEdit.id,
          updateData,
        );

        if (result.success) {
          showSuccess(t('success.transactionUpdated'));

          if (onTransactionCreated) {
            onTransactionCreated();
          }

          onClose();
        } else {
          showError(result.message || t('errors.failedToUpdateTransaction'));
        }

        setLoading(false);
        return;
      }

      if (transactionType === 'transfer') {
        
        if (!selectedWalletId) {
          showError(t('transactions.selectSourceWallet'));
          setLoading(false);
          return;
        }
        if (!selectedDestinationWalletId) {
          showError(t('transactions.selectDestWallet'));
          setLoading(false);
          return;
        }
        if (selectedWalletId === selectedDestinationWalletId) {
          showError(t('transactions.walletsMustBeDifferent'));
          setLoading(false);
          return;
        }

        result = await transactionService.createTransferNew(
          {
            origin_wallet_id: selectedWalletId,
            destination_wallet_id: selectedDestinationWalletId,
            amount: amountValue,
            name: description,
            notes: notes,
            date: formatDateForAPI(date),
            ...(repeatEnabled && {
              recurrence: {
                frequency: recurrenceFrequency,
                start_date: recurrenceStartDate.toISOString(),
                ...(hasRecurrenceEndDate &&
                  recurrenceEndDate && {
                    end_date: recurrenceEndDate.toISOString(),
                  }),
              },
            }),
          },
          selectedFile
            ? {
                uri: selectedFile.uri,
                name: selectedFile.name,
                type: selectedFile.type,
              }
            : undefined,
        );
      } else if (transactionType === 'income') {
        
        if (!selectedWalletId) {
          showError(t('transactions.selectWallet'));
          setLoading(false);
          return;
        }
        if (!categoryId) {
          showError(t('transactions.selectCategory'));
          setLoading(false);
          return;
        }
        result = await transactionService.createIncome(
          {
            wallet_id: parseInt(selectedWalletId),
            amount: amountValue,
            category_id: categoryId,
            name: description,
            notes: notes,
            tags: tags,
            date: formatDateForAPI(date),
            ...(items.length > 0 && {
              items: items.map(item => ({
                name: item.name,
                price: 0,
                quantity: 1,
              })),
            }),
            ...(repeatEnabled && {
              recurrence: {
                frequency: recurrenceFrequency,
                start_date: recurrenceStartDate.toISOString(),
                ...(hasRecurrenceEndDate &&
                  recurrenceEndDate && {
                    end_date: recurrenceEndDate.toISOString(),
                  }),
              },
            }),
          },
          selectedFile
            ? {
                uri: selectedFile.uri,
                name: selectedFile.name,
                type: selectedFile.type,
              }
            : undefined,
        );
      } else {
        
        if (!selectedWalletId) {
          showError(t('transactions.selectWallet'));
          setLoading(false);
          return;
        }
        if (!categoryId) {
          showError(t('transactions.selectCategory'));
          setLoading(false);
          return;
        }
        result = await transactionService.createExpense(
          {
            wallet_id: parseInt(selectedWalletId),
            amount: amountValue,
            category_id: categoryId,
            name: description,
            notes: notes,
            tags: tags,
            date: formatDateForAPI(date),
            ...(items.length > 0 && {
              items: items.map(item => ({
                name: item.name,
                price: 0,
                quantity: 1,
              })),
            }),
            ...(repeatEnabled && {
              recurrence: {
                frequency: recurrenceFrequency,
                start_date: recurrenceStartDate.toISOString(),
                ...(hasRecurrenceEndDate &&
                  recurrenceEndDate && {
                    end_date: recurrenceEndDate.toISOString(),
                  }),
              },
            }),
          },
          selectedFile
            ? {
                uri: selectedFile.uri,
                name: selectedFile.name,
                type: selectedFile.type,
              }
            : undefined,
        );
      }

      if (result.success) {
        if (transactionType === 'transfer') {
          
          const transferData = result.data as any; 

          const { summary } = transferData;
          let successMessage = t('success.transactionAdded');

          if (summary.exchangeRate && summary.exchangeRate !== 1.0) {
            successMessage += ` (${summary.originalAmount} ${summary.originalCurrency} → ${summary.convertedAmount} ${summary.destinationCurrency})`;
          }

          showSuccess(successMessage);
        } else {
          
          const transactionData = result.data as any;
          showSuccess(t('success.transactionAdded'));
        }

        setAmount('0');
        setDescription('');
        setNotes('');
        setTags('');
        
        setSelectedDestinationWallet('Escolher carteira destino');
        setSelectedDestinationWalletId(null);
        setDestinationWalletBalance('0');

        if (onTransactionCreated) {
          onTransactionCreated();
        }

        onClose();
      } else {
        showError(result.message || t('errors.failedToCreateTransaction'));
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      showError(t('errors.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.container}>
          {}
          <View style={styles.handle} />

          {}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.icon, { color: getColor() }]}>
                {getIcon()}
              </Text>
              <Text style={styles.title}>{getTitle()}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {}
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Amount</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsCalculatorVisible(true);
                }}
              >
                <Text style={[styles.amountValue, { color: getColor() }]}>
                  {getCurrencySymbol(walletCurrency)}
                  {amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                </Text>
              </TouchableOpacity>
            </View>

            {}
            {!isEditMode && transactionType === 'transfer' ? (
              
              <>
                <View style={styles.section}>
                  <Text style={styles.label}>{t('transactions.from')}</Text>
                  <TouchableOpacity
                    style={styles.categorySelector}
                    onPress={() => setIsAccountSelectorVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categorySelectorIcon}>
                      <CategoryIcon
                        iconName="Wallet"
                        size={16}
                        color={
                          selectedWalletId ? COLORS.primary : COLORS.textMuted
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.categorySelectorText,
                        selectedWallet !== 'Conta Principal' && {
                          color: COLORS.text,
                        },
                      ]}
                    >
                      {selectedWallet || t('transactions.selectWallet')}
                    </Text>
                    <CategoryIcon
                      iconName="ChevronRight"
                      size={16}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.section}>
                  <Text style={styles.label}>{t('transactions.to')}</Text>
                  <TouchableOpacity
                    style={styles.categorySelector}
                    onPress={() => setIsDestinationAccountSelectorVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categorySelectorIcon}>
                      <CategoryIcon
                        iconName="Wallet"
                        size={16}
                        color={
                          selectedDestinationWalletId
                            ? COLORS.primary
                            : COLORS.textMuted
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.categorySelectorText,
                        selectedDestinationWallet !==
                          t('transactions.selectDestinationWallet') && {
                          color: COLORS.text,
                        },
                      ]}
                    >
                      {selectedDestinationWallet ||
                        t('transactions.selectDestinationWallet')}
                    </Text>
                    <CategoryIcon
                      iconName="ChevronRight"
                      size={16}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              
              !isEditMode && (
                <View style={styles.section}>
                  <Text style={styles.label}>{t('transactions.wallet')}</Text>
                  <TouchableOpacity
                    style={styles.categorySelector}
                    onPress={() => setIsAccountSelectorVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categorySelectorIcon}>
                      <CategoryIcon
                        iconName="Wallet"
                        size={16}
                        color={
                          selectedWalletId ? COLORS.primary : COLORS.textMuted
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.categorySelectorText,
                        selectedWallet !== 'Conta Principal' && {
                          color: COLORS.text,
                        },
                      ]}
                    >
                      {selectedWallet || 'Selecionar carteira'}
                    </Text>
                    <CategoryIcon
                      iconName="ChevronRight"
                      size={16}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              )
            )}

            {}
            <View style={styles.section}>
              <Text style={styles.label}>{t('transactions.name')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('transactions.enterTransactionName')}
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {}
            <View style={styles.section}>
              <Text style={styles.label}>{t('transactions.category')}</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setIsCategorySelectorVisible(true)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.categorySelectorIcon,
                    categoryColor && { backgroundColor: categoryColor + '15' },
                  ]}
                >
                  <CategoryIcon
                    iconName={categoryIcon || 'Category'}
                    size={16}
                    color={categoryColor || COLORS.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.categorySelectorText,
                    categoryName && { color: COLORS.text },
                  ]}
                >
                  {categoryName || t('transactions.selectCategory')}
                </Text>
                <CategoryIcon
                  iconName="ChevronRight"
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            {}
            <View style={styles.section}>
              <Text style={styles.label}>{t('transactions.date')}</Text>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => setIsDateSheetVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dateSelectorIcon}>
                  <CategoryIcon
                    iconName="Calendar"
                    size={16}
                    color={date ? COLORS.primary : COLORS.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.dateSelectorText,
                    date && { color: COLORS.text },
                  ]}
                >
                  {date ? formatDate(date) : 'Selecionar'}
                </Text>
                <CategoryIcon
                  iconName="ChevronRight"
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            {}
            <View style={styles.section}>
              <Text style={styles.label}>{t('transactions.tags')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('transactions.tagsPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={tags}
                onChangeText={setTags}
              />
            </View>

            {}
            <View style={styles.section}>
              <Text style={styles.label}>{t('transactions.notes')}</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder={t('transactions.notesPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {}
            <View style={styles.section}>
              <Text style={styles.label}>{t('transactions.recurrence')}</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setIsRecurrenceSheetVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.categorySelectorIcon}>
                  <CategoryIcon
                    iconName="Refresh2"
                    size={16}
                    color={repeatEnabled ? COLORS.primary : COLORS.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.categorySelectorText,
                    repeatEnabled && { color: COLORS.text },
                  ]}
                >
                  {getRecurrenceDisplayText()}
                </Text>
                <CategoryIcon
                  iconName="ChevronRight"
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            {}
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={handleAttachDocument}
                disabled={uploadingFile}
              >
                <View style={styles.attachmentIconContainer}>
                  {uploadingFile ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <CategoryIcon
                      iconName="Paperclip"
                      size={22}
                      color={COLORS.primary}
                    />
                  )}
                </View>
                <View style={styles.attachmentTextContainer}>
                  <Text style={styles.attachmentButtonTitle}>
                    {selectedFile ? selectedFile.name : 'Anexar Documento'}
                  </Text>
                  <Text style={styles.attachmentButtonSubtext}>
                    {selectedFile
                      ? 'Toque para substituir'
                      : 'Imagens, PDFs ou documentos'}
                  </Text>
                </View>
                <CategoryIcon
                  iconName="ChevronRight"
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            {}
            <View style={styles.section}>
              <View style={styles.itemsCardOuter}>
                <View style={styles.itemsCardHeader}>
                  <Text style={styles.itemsCardTitle}>
                    {t('transactions.items')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (showItemsEditor) {
                        handleCancelItemsEditor();
                      } else {
                        handleOpenItemsEditor();
                      }
                    }}
                    style={styles.itemsCardEditButton}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.itemsCardEditButtonText}>
                      {showItemsEditor ? t('common.cancel') : t('common.edit')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.itemsCardInner}>
                  {!showItemsEditor ? (
                    <View>
                      {items && items.length > 0 ? (
                        <View style={styles.itemsList}>
                          {items.map((item, index) => {
                            const listAnim = getListItemAnim(index);
                            return (
                              <Animated.View
                                key={`${item.name}-${index}`}
                                style={{
                                  opacity: listAnim,
                                  transform: [
                                    {
                                      translateY: listAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [8, 0],
                                      }),
                                    },
                                  ],
                                }}
                              >
                                <View
                                  style={[
                                    styles.itemCard,
                                    index === items.length - 1 &&
                                      styles.itemCardLast,
                                  ]}
                                >
                                  <Text
                                    style={styles.itemName}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                  >
                                    {item.name || 'Item'}
                                  </Text>
                                </View>
                              </Animated.View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.itemEmpty}>
                          {t('transactions.noItems')}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View>
                      <View style={styles.itemsList}>
                        {items.map((item, index) => {
                          const fadeAnim = getItemFadeAnim(index);
                          const removeAnim = getRemoveButtonAnim(index);
                          return (
                            <Animated.View
                              key={`edit-${index}`}
                              style={{
                                opacity: fadeAnim,
                                transform: [
                                  {
                                    translateY: fadeAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [12, 0],
                                    }),
                                  },
                                ],
                              }}
                            >
                              <View
                                style={[
                                  styles.itemCard,
                                  styles.itemCardEdit,
                                  index === items.length - 1 &&
                                    styles.itemCardLast,
                                ]}
                              >
                                <View style={styles.itemTopRow}>
                                  <TextInput
                                    ref={(ref) => {
                                      itemInputRefs.current[index] = ref;
                                    }}
                                    style={styles.itemInputEdit}
                                    value={item.name}
                                    onChangeText={text =>
                                      handleUpdateItem(index, text)
                                    }
                                    placeholder={t(
                                      'transactions.itemNamePlaceholder',
                                    )}
                                    placeholderTextColor={COLORS.textMuted}
                                    autoFocus={
                                      index === items.length - 1 &&
                                      item.name === ''
                                    }
                                  />
                                  <Animated.View
                                    style={{
                                      opacity: removeAnim,
                                      transform: [
                                        {
                                          scale: removeAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.5, 1],
                                          }),
                                        },
                                      ],
                                    }}
                                  >
                                    <TouchableOpacity
                                      onPress={() => handleRemoveItem(index)}
                                      style={styles.itemRemoveButton}
                                      activeOpacity={0.9}
                                    >
                                      <Text style={styles.itemRemoveText}>
                                        ✕
                                      </Text>
                                    </TouchableOpacity>
                                  </Animated.View>
                                </View>
                              </View>
                            </Animated.View>
                          );
                        })}
                        <Animated.View
                          style={{
                            opacity: getItemFadeAnim(items.length),
                            transform: [
                              {
                                translateY: getItemFadeAnim(
                                  items.length,
                                ).interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [12, 0],
                                }),
                              },
                            ],
                          }}
                        >
                          <TouchableOpacity
                            onPress={handleAddNewItem}
                            style={styles.addItemButtonEdit}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.addItemButtonText}>
                              {t('transactions.addItem')}
                            </Text>
                          </TouchableOpacity>
                        </Animated.View>
                      </View>
                      <Animated.View
                        style={{
                          opacity: getItemFadeAnim(items.length + 1),
                          transform: [
                            {
                              translateY: getItemFadeAnim(
                                items.length + 1,
                              ).interpolate({
                                inputRange: [0, 1],
                                outputRange: [12, 0],
                              }),
                            },
                          ],
                        }}
                      >
                        <TouchableOpacity
                          style={styles.itemsToolbarSave}
                          onPress={handleSaveItemsEditor}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.itemsToolbarSaveText}>
                            {t('common.save')}
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {}
            <View style={{ height: 100 }} />
          </ScrollView>

          {}
          <View style={styles.bottomButtons}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, styles.cancelButton]}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.button,
                styles.saveButtonBottom,
                { backgroundColor: getColor() },
                loading && { opacity: 0.6 },
              ]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonBottomText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          {}
          <CalculatorSheet
            isVisible={isCalculatorVisible}
            onClose={() => setIsCalculatorVisible(false)}
            onAmountChange={setAmount}
            initialAmount={amount}
            currencySymbol={getCurrencySymbol(walletCurrency)}
          />

          {}
          <AccountSelectorSheet
            isVisible={isAccountSelectorVisible}
            onClose={() => setIsAccountSelectorVisible(false)}
            onSelectAccount={handleOriginWalletSelect}
          />

          {}
          <AccountSelectorSheet
            isVisible={isDestinationAccountSelectorVisible}
            onClose={() => setIsDestinationAccountSelectorVisible(false)}
            onSelectAccount={handleDestinationWalletSelect}
          />

          {}
          <DateSheet
            isVisible={isDateSheetVisible}
            onClose={() => setIsDateSheetVisible(false)}
            onSelect={(selectedDate: Date) => {
              setDate(selectedDate);
              setIsDateSheetVisible(false);
            }}
            initialDate={date}
            showTimePicker={true}
          />

          {}
          <CategorySheet
            isVisible={isCategorySelectorVisible}
            onClose={() => setIsCategorySelectorVisible(false)}
            onSelect={handleCategorySelect}
            selectedCategoryId={categoryId}
            type={transactionType === 'income' ? 'income' : 'expense'}
          />

          {}
          <Modal
            visible={isRecurrenceSheetVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setIsRecurrenceSheetVisible(false)}
          >
            <SafeAreaView style={styles.recurrenceModalContainer}>
              <View style={styles.recurrenceModalHeader}>
                <TouchableOpacity
                  onPress={() => setIsRecurrenceSheetVisible(false)}
                  style={styles.recurrenceModalCloseButton}
                >
                  <Text style={styles.recurrenceModalCloseText}>
                    {t('transactions.cancel')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.recurrenceModalTitle}>
                  {t('transactions.frequency')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsRecurrenceSheetVisible(false);
                  }}
                  style={styles.recurrenceModalSaveButton}
                >
                  <Text style={styles.recurrenceModalSaveText}>
                    {t('transactions.save')}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.recurrenceModalContent}>
                {}
                <View style={styles.recurrenceSection}>
                  <View style={styles.recurrenceToggleRow}>
                    <Text style={styles.recurrenceToggleLabel}>
                      {t('transactions.enableRecurrence')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.recurrenceToggle,
                        repeatEnabled && styles.recurrenceToggleActive,
                      ]}
                      onPress={() => setRepeatEnabled(!repeatEnabled)}
                    >
                      <View
                        style={[
                          styles.recurrenceToggleThumb,
                          repeatEnabled && styles.recurrenceToggleThumbActive,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {repeatEnabled && (
                  <>
                    {}
                    <View style={styles.recurrenceSection}>
                      <Text style={styles.recurrenceSectionTitle}>
                        {t('transactions.frequency')}
                      </Text>
                      {[
                        { key: 'daily', label: t('transactions.daily') },
                        { key: 'weekly', label: t('transactions.weekly') },
                        { key: 'monthly', label: t('transactions.monthly') },
                        { key: 'yearly', label: t('transactions.yearly') },
                      ].map(freq => (
                        <TouchableOpacity
                          key={freq.key}
                          style={[
                            styles.recurrenceOption,
                            recurrenceFrequency === freq.key &&
                              styles.recurrenceOptionSelected,
                          ]}
                          onPress={() =>
                            setRecurrenceFrequency(freq.key as any)
                          }
                        >
                          <Text
                            style={[
                              styles.recurrenceOptionText,
                              recurrenceFrequency === freq.key &&
                                styles.recurrenceOptionTextSelected,
                            ]}
                          >
                            {freq.label}
                          </Text>
                          {recurrenceFrequency === freq.key && (
                            <CategoryIcon
                              iconName="Check"
                              size={16}
                              color={COLORS.primary}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    {}
                    <View style={styles.recurrenceSection}>
                      <Text style={styles.recurrenceSectionTitle}>
                        {t('transactions.startDate')}
                      </Text>
                      <TouchableOpacity
                        style={styles.recurrenceDateButton}
                        onPress={() => {

                          setIsDateSheetVisible(true);
                          setIsRecurrenceSheetVisible(false);
                        }}
                      >
                        <Text style={styles.recurrenceDateButtonText}>
                          {formatDate(recurrenceStartDate)}
                        </Text>
                        <CategoryIcon
                          iconName="Calendar"
                          size={16}
                          color={COLORS.textMuted}
                        />
                      </TouchableOpacity>
                    </View>

                    {}
                    <View style={styles.recurrenceSection}>
                      <View style={styles.recurrenceToggleRow}>
                        <Text style={styles.recurrenceToggleLabel}>
                          Data de Fim
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.recurrenceToggle,
                            hasRecurrenceEndDate &&
                              styles.recurrenceToggleActive,
                          ]}
                          onPress={() => {
                            setHasRecurrenceEndDate(!hasRecurrenceEndDate);
                            if (!hasRecurrenceEndDate) {
                              const endDate = new Date(recurrenceStartDate);
                              endDate.setFullYear(endDate.getFullYear() + 1);
                              setRecurrenceEndDate(endDate);
                            } else {
                              setRecurrenceEndDate(null);
                            }
                          }}
                        >
                          <View
                            style={[
                              styles.recurrenceToggleThumb,
                              hasRecurrenceEndDate &&
                                styles.recurrenceToggleThumbActive,
                            ]}
                          />
                        </TouchableOpacity>
                      </View>

                      {hasRecurrenceEndDate && (
                        <TouchableOpacity
                          style={styles.recurrenceDateButton}
                          onPress={() => {
                            
                            Alert.alert(
                              'Info',
                              'Funcionalidade de data de fim será implementada em breve',
                            );
                          }}
                        >
                          <Text style={styles.recurrenceDateButtonText}>
                            {recurrenceEndDate
                              ? formatDate(recurrenceEndDate)
                              : 'Selecionar data'}
                          </Text>
                          <CategoryIcon
                            iconName="Calendar"
                            size={16}
                            color={COLORS.textMuted}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        </SafeAreaView>
      </Modal>

      {}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 28,
    fontWeight: '600',
  },
  title: {
    fontSize: SIZES.fontLarge,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: SIZES.paddingSmall + 4,
  },
  amountContainer: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  amountLabel: {
    fontSize: SIZES.fontSmall,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  inputContainer: {
    marginBottom: SIZES.paddingSmall + 2,
  },
  inputLabel: {
    fontSize: SIZES.fontSmall,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 0,
    borderRadius: 12,
    padding: 12,
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
  },
  selectButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 0,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
  },
  transactionNamePlaceholder: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textMuted,
  },
  walletButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletIcon: {
    fontSize: 18,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  walletBalanceText: {
    fontSize: SIZES.fontSmall,
    color: 'rgba(255,255,255,0.7)',
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  attachmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentTextContainer: {
    flex: 1,
  },
  attachmentButtonTitle: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  attachmentButtonSubtext: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textMuted,
  },
  photoButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.paddingSmall,
  },
  photoIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  photoButtonText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: SIZES.paddingSmall + 4,
    paddingBottom: SIZES.paddingSmall,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.borderLight,
  },
  cancelButtonText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButtonBottom: {
    
  },
  saveButtonBottomText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  section: {
    marginBottom: SIZES.paddingSmall + 2,
  },
  label: {
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  categorySelectorIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySelectorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  dateSelectorIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMuted,
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  itemsCardOuter: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 20,
    padding: 8,
    marginBottom: SIZES.paddingSmall + 4,
    position: 'relative',
    overflow: 'hidden',
  },
  itemsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginBottom: 8,
  },
  itemsCardTitle: {
    fontSize: SIZES.fontSmall + 1,
    fontWeight: '500',
    color: COLORS.text,
  },
  itemsCardEditButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.backgroundSecondary,
  },
  itemsCardEditButtonText: {
    fontSize: SIZES.fontTiny,
    color: COLORS.primary,
    fontWeight: '500',
  },
  itemsCardInner: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  itemsList: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    gap: 0,
  },
  itemCard: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemCardLast: {
    borderBottomWidth: 0,
  },
  itemName: {
    fontSize: SIZES.fontMedium,
    fontWeight: '400',
    color: COLORS.text,
    lineHeight: 20,
    flex: 1,
    minWidth: 0,
  },
  itemEmpty: {
    fontSize: SIZES.fontTiny,
    color: COLORS.textSecondary,
    paddingVertical: 12,
    textAlign: 'center',
  },
  itemsEditorLabel: {
    fontSize: SIZES.fontSmall,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 8,
  },
  itemsEditor: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  itemsEditorButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  itemsEditorCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
  },
  itemsEditorCancelButtonText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemsEditorSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  itemsEditorSaveButtonText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  itemCardEdit: {
    paddingVertical: 8,
    minHeight: 48,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 20,
  },
  itemInputEdit: {
    flex: 1,
    minWidth: 0,
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  itemRemoveButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 0,
    marginLeft: 8,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  itemRemoveText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  addItemButtonEdit: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  addItemButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.primary,
    fontWeight: '500',
  },
  itemsToolbarSave: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  itemsToolbarSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: SIZES.fontTiny + 1,
  },
  
  recurrenceModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  recurrenceModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  recurrenceModalCloseButton: {
    padding: 4,
  },
  recurrenceModalCloseText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textMuted,
  },
  recurrenceModalTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: '600',
    color: COLORS.text,
  },
  recurrenceModalSaveButton: {
    padding: 4,
  },
  recurrenceModalSaveText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.primary,
  },
  recurrenceModalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  recurrenceSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  recurrenceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurrenceToggleLabel: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    fontWeight: '500',
  },
  recurrenceToggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  recurrenceToggleActive: {
    backgroundColor: COLORS.primary,
  },
  recurrenceToggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  recurrenceToggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  recurrenceSectionTitle: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  recurrenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundLight,
  },
  recurrenceOptionSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  recurrenceOptionText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
  },
  recurrenceOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  recurrenceDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    marginTop: 8,
  },
  recurrenceDateButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
  },
});

export default AddTransactionSheet;
