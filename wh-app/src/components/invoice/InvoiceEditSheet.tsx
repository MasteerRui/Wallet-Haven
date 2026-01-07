import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import {
  CloseCircle,
  TickCircle,
  Lock1,
  Unlock,
  Refresh2,
  RotateLeft,
} from 'iconsax-react-nativejs';
import { COLORS, SIZES } from '../../constants/theme';
import { useToast } from '../../hooks/useToast';
import { useTranslation } from '../../hooks/useTranslation';
import transactionService from '../../services/transactionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, API_ENDPOINTS } from '../../constants/config';
import CalculatorSheet from '../transaction/CalculatorSheet';
import CategoryIcon from '../common/CategoryIcon';
import CategorySheet, { Category } from '../category/CategorySheet';
import DateSheet from '../common/DateSheet';
import walletService, { Wallet } from '../../services/walletService';
import AccountSelectorSheet from '../home/AccountSelectorSheet';

interface InvoiceItem {
  name: string;
}

interface AnalyzedData {
  category_id: number | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  type: 'expense' | 'income';
  amount: number;
  date: string;
  name?: string | null; 
  merchant: string | null; 
  notes: string | null;
  tags: string | null;
  title?: string | null;
  confidence: number;
  items?: InvoiceItem[];
}

type OcraiData = Partial<AnalyzedData>;

interface OcraiResponse {
  success: boolean;
  message: string;
  extractedText?: string;
  receiptData?: any;
  analyzedData?: AnalyzedData;
  corrected_data?: OcraiData;
  extracted_data?: OcraiData;
  raw_text?: string;
  file_id?: number;
  file_url?: string;
  transaction_id?: number;
  ocraiResultId?: number;
  ocrStatus: string;
  data?: any;
}

interface InvoiceEditSheetProps {
  isVisible: boolean;
  onClose: () => void;
  ocraiResponse?: OcraiResponse; 
  ocraiResults?: OcraiResponse[]; 
  currentIndex?: number;
  totalResults?: number;
  onTransactionCreated?: () => void;
}

const InvoiceEditSheet: React.FC<InvoiceEditSheetProps> = ({
  isVisible,
  onClose,
  ocraiResponse,
  ocraiResults,
  currentIndex = 0,
  totalResults = 1,
  onTransactionCreated,
}) => {
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();
  
  const allResults = ocraiResults || (ocraiResponse ? [ocraiResponse] : []);

  useEffect(() => {
    if (isVisible) {

      if (allResults.length > 0) {
        allResults.forEach((result, index) => {
        });
      } else {
        console.warn('⚠️ [InvoiceEditSheet] No results received!');
      }
    }
  }, [isVisible, ocraiResults, ocraiResponse]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const currentResult = allResults[selectedResultIndex];
  const [walletId, setWalletId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [resultsState, setResultsState] = useState<
    Map<
      number,
      {
        type: 'expense' | 'income';
        amount: string;
        date: string;
        merchant: string;
        notes: string;
        tags: string;
        name: string;
        categoryId: number | null;
        categoryName: string | null;
        categoryIcon: string | null;
        categoryColor: string | null;
        isIgnored: boolean;
        items: InvoiceItem[];
        walletId: number | null;
      }
    >
  >(new Map());

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletSelectorsVisible, setWalletSelectorsVisible] = useState<
    Map<number, boolean>
  >(new Map());

  const numberToString = (num: number): string => {
    
    return num.toFixed(2).replace('.', ',');
  };

  const normalizeAmountValue = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getPreferredData = (
    result: any,
    isProcessingRawText: boolean = false,
  ): OcraiData | null => {
    if (!result) return null;

    const preferred =
      result.corrected_data ||
      result.analyzedData ||
      result.extracted_data ||
      null;

    if (preferred) {

      const merchant = preferred.merchant || preferred.merchantName || null;

      return {
        ...preferred,
        merchant: merchant,
        name: preferred.name || preferred.title || merchant || null, 
        title: preferred.title || merchant || null, 
      };
    }

    const extractedData = result.extracted_data;
    if (extractedData && typeof extractedData === 'object') {

      const merchant =
        extractedData.merchantName ||
        result.merchantName ||
        result.merchant ||
        null;
      const amount =
        extractedData.total !== undefined
          ? extractedData.total
          : result.total !== undefined
          ? result.total
          : result.amount;
      const date = extractedData.date || result.date;

      const lineItems =
        extractedData.lineItems ||
        result.lineItems ||
        extractedData.items ||
        result.items ||
        [];
      const items = lineItems.map((item: any) => ({
        name: item.desc || item.descClean || item.name || t('invoice.item'),
      }));

      return {
        title: merchant,
        merchant: merchant,
        amount: amount,
        date: date,
        type: 'expense' as const, 
        notes: extractedData.notes || result.notes || null,
        tags: extractedData.tags || result.tags || null,
        category_id: extractedData.category_id || result.category_id || null,
        category_name:
          extractedData.category_name || result.category_name || null,
        category_icon:
          extractedData.category_icon || result.category_icon || null,
        category_color:
          extractedData.category_color || result.category_color || null,
        confidence:
          extractedData.confidence?.total ||
          extractedData.confidence ||
          result.confidence ||
          0,
        items: items.length > 0 ? items : null,
      };
    }

    if (result.result && typeof result.result === 'object') {
      const tabScannerData = result.result;

      const merchant =
        tabScannerData.establishment ||
        tabScannerData.merchantName ||
        tabScannerData.merchant ||
        null;
      const amount =
        tabScannerData.total !== undefined
          ? tabScannerData.total
          : tabScannerData.amount;

      let normalizedDate =
        tabScannerData.date || tabScannerData.dateISO || null;
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
              '📦 [InvoiceEditSheet] Could not parse date:',
              normalizedDate,
            );
          }
        }
      }

      const lineItems = tabScannerData.lineItems || [];
      const items = lineItems.map((item: any) => ({
        name: item.descClean || item.desc || item.name || 'Item',
      }));

      return {
        title: merchant,
        merchant: merchant,
        amount: amount,
        date: normalizedDate,
        type: 'expense' as const,
        notes: tabScannerData.notes || null,
        tags: tabScannerData.tags || null,
        category_id: tabScannerData.category_id || null,
        category_name: tabScannerData.category_name || null,
        category_icon: tabScannerData.category_icon || null,
        category_color: tabScannerData.category_color || null,
        confidence:
          tabScannerData.totalConfidence || tabScannerData.confidence || 0,
        items: items.length > 0 ? items : null,
      };
    }

    if (
      result.lineItems &&
      Array.isArray(result.lineItems) &&
      result.lineItems.length > 0
    ) {

      const merchant =
        result.merchantName ||
        result.merchant ||
        result.establishment ||
        result.extracted_data?.merchantName ||
        null;
      const amount =
        result.total !== undefined
          ? result.total
          : result.extracted_data?.total || result.amount;

      let normalizedDate =
        result.date || result.dateISO || result.extracted_data?.date || null;
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
              '📦 [InvoiceEditSheet] Could not parse date:',
              normalizedDate,
            );
          }
        }
      }

      const items = result.lineItems.map((item: any) => ({
        name: item.descClean || item.desc || item.name || 'Item',
      }));

      return {
        title: merchant,
        merchant: merchant,
        amount: amount,
        date: normalizedDate,
        type: 'expense' as const,
        notes: result.notes || result.extracted_data?.notes || null,
        tags: result.tags || result.extracted_data?.tags || null,
        category_id:
          result.category_id || result.extracted_data?.category_id || null,
        category_name:
          result.category_name || result.extracted_data?.category_name || null,
        category_icon:
          result.category_icon || result.extracted_data?.category_icon || null,
        category_color:
          result.category_color ||
          result.extracted_data?.category_color ||
          null,
        confidence:
          result.confidence ||
          result.extracted_data?.confidence?.total ||
          result.extracted_data?.confidence ||
          0,
        items: items.length > 0 ? items : null,
      };
    }

    const hasTopLevelData =
      result.title ||
      result.merchant ||
      result.merchantName ||
      result.amount !== undefined ||
      result.total !== undefined ||
      result.date ||
      result.created_at;

    if (hasTopLevelData) {

      const merchant =
        result.merchant || result.merchantName || result.establishment || null;
      const amount =
        result.amount !== undefined
          ? result.amount
          : result.total !== undefined
          ? result.total
          : undefined;
      
      const date = result.date || result.created_at || null;

      return {
        title: result.title || merchant || null,
        merchant: merchant,
        amount: amount,
        date: date,
        type: result.type || 'expense',
        notes: result.notes || null,
        tags: result.tags || null,
        category_id: result.category_id || null,
        category_name: result.category_name || null,
        category_icon: result.category_icon || null,
        category_color: result.category_color || null,
        confidence: result.confidence || 0,
        items: result.items || result.lineItems || null,
      };
    }

    if (
      !isProcessingRawText &&
      result.raw_text &&
      typeof result.raw_text === 'string'
    ) {
      try {
        const parsedRawText = JSON.parse(result.raw_text);
        if (parsedRawText && typeof parsedRawText === 'object') {
          
          const parsedData = getPreferredData(parsedRawText, true);
          if (parsedData) {
            return parsedData;
          }
        }
      } catch (e) {
        
      }
    }

    const allKeys = Object.keys(result);
    console.warn(
      '⚠️ [InvoiceEditSheet] getPreferredData - trying last resort extraction. Result keys:',
      allKeys,
    );
    console.warn(
      '⚠️ [InvoiceEditSheet] Full result structure:',
      JSON.stringify(result, null, 2),
    );

    if (result.id || result.ocraiResultId) {

      const merchant =
        result.merchant || result.merchantName || result.establishment || null;
      const amount =
        result.amount !== undefined
          ? result.amount
          : result.total !== undefined
          ? result.total
          : undefined;
      const date = result.date || result.created_at || null;

      if (merchant || amount !== undefined || date) {

        return {
          title: result.title || merchant || null,
          merchant: merchant,
          amount: amount,
          date: date,
          type: result.type || ('expense' as const),
          notes: result.notes || null,
          tags: result.tags || null,
          category_id: result.category_id || null,
          category_name: result.category_name || null,
          category_icon: result.category_icon || null,
          category_color: result.category_color || null,
          confidence: result.confidence || 0,
          items: result.items || result.lineItems || null,
        };
      }

      return {
        title: undefined,
        merchant: undefined,
        amount: undefined,
        date: undefined,
        type: 'expense' as const,
        notes: undefined,
        tags: undefined,
        category_id: undefined,
        category_name: undefined,
        category_icon: undefined,
        category_color: undefined,
        confidence: 0,
        items: undefined,
      };
    }

    console.warn(
      '⚠️ [InvoiceEditSheet] getPreferredData returned null - no data found in result:',
      {
        hasCorrectedData: !!result.corrected_data,
        hasAnalyzedData: !!result.analyzedData,
        hasExtractedData: !!result.extracted_data,
        resultKeys: Object.keys(result),
        resultSample: JSON.stringify(result, null, 2).substring(0, 500), 
      },
    );

    return null;
  };

  const normalizeItems = (result: any): InvoiceItem[] => {

    const candidateItems =
      result?.corrected_data?.items ||
      result?.analyzedData?.items ||
      result?.extracted_data?.items ||
      result?.receiptData?.items ||
      result?.result?.lineItems || 
      result?.lineItems ||
      result?.items ||
      [];

    const source =
      candidateItems && candidateItems.length > 0 ? candidateItems : [];

    return (source || []).map((item: any, index: number) => {
      
      const itemName =
        item?.descClean || item?.desc || item?.name || `${t('invoice.item')} ${index + 1}`;
      return {
        name: itemName,
      };
    });
  };

  const itemsToText = (list: InvoiceItem[]) =>
    (list || [])
      .map(i => (i.name && i.name.trim() ? i.name.trim() : t('invoice.item')))
      .join('\n');

  const parseItemsFromText = (text: string): InvoiceItem[] => {
    return text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map((name, idx) => ({ name: name || `${t('invoice.item')} ${idx + 1}` }));
  };

  const getCurrentState = () => {
    const state = resultsState.get(selectedResultIndex);
    if (state) return state;

    const result = allResults[selectedResultIndex];
    const data = getPreferredData(result);
    if (data) {
      return {
        type: data.type || 'expense',
        amount:
          data.amount !== undefined
            ? numberToString(normalizeAmountValue(data.amount))
            : '0',
        date: data.date || '',
        merchant: data.merchant || '',
        notes: data.notes || '',
        tags: data.tags || '',
        name: data.name || data.title || data.merchant || '', 
        categoryId: data.category_id ?? null,
        categoryName: data.category_name ?? null,
        categoryIcon: data.category_icon ?? null,
        categoryColor: data.category_color ?? null,
        isIgnored: false,
        items: normalizeItems(result),
      };
    }
    return {
      type: 'expense' as const,
      amount: '0',
      date: '',
      merchant: '',
      notes: '',
      tags: '',
      name: '',
      categoryId: null,
      categoryName: null,
      categoryIcon: null,
      categoryColor: null,
      isIgnored: false,
      items: [],
    };
  };

  const currentState = getCurrentState();
  const [type, setType] = useState<'expense' | 'income'>(currentState.type);
  const [amount, setAmount] = useState<string>(currentState.amount);
  const [date, setDate] = useState<string>(currentState.date);
  const [merchant, setMerchant] = useState<string>(currentState.merchant);
  const [notes, setNotes] = useState<string>(currentState.notes);
  const [tags, setTags] = useState<string>(currentState.tags);
  const [name, setName] = useState<string>(currentState.name || '');
  const [categoryId, setCategoryId] = useState<number | null>(
    currentState.categoryId,
  );
  const [categoryName, setCategoryName] = useState<string | null>(
    currentState.categoryName ?? null,
  );
  const [categoryIcon, setCategoryIcon] = useState<string | null>(
    currentState.categoryIcon ?? null,
  );
  const [categoryColor, setCategoryColor] = useState<string | null>(
    currentState.categoryColor ?? null,
  );
  const [isExpanded, setIsExpanded] = useState(true);
  const [isIgnored, setIsIgnored] = useState<boolean>(currentState.isIgnored);
  const [items, setItems] = useState<InvoiceItem[]>(currentState.items || []);
  const [itemsBackup, setItemsBackup] = useState<InvoiceItem[]>(
    currentState.items || [],
  );
  const [showItemsEditor, setShowItemsEditor] = useState(false);
  const [removeButtonAnims] = useState(() => new Map<number, Animated.Value>());
  const [itemFadeAnims] = useState(() => new Map<number, Animated.Value>());
  const [listItemAnims] = useState(() => new Map<number, Animated.Value>());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isDetailMode, setIsDetailMode] = useState(false);
  const [modeAnim] = useState(new Animated.Value(0));
  const [strikethroughAnim] = useState(new Animated.Value(0));
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const [isCategorySheetVisible, setIsCategorySheetVisible] = useState(false);
  const [isDateSheetVisible, setIsDateSheetVisible] = useState(false);
  const [isWalletSheetVisible, setIsWalletSheetVisible] = useState(false);
  
  const [cardAnimations] = useState(() => new Map<number, Animated.Value>());

  const getCardAnimation = (index: number): Animated.Value => {
    if (!cardAnimations.has(index)) {
      cardAnimations.set(index, new Animated.Value(0));
    }
    return cardAnimations.get(index)!;
  };

  useEffect(() => {
    resultsState.forEach((state, index) => {
      const cardAnim = getCardAnimation(index);
      Animated.spring(cardAnim, {
        toValue: state.isIgnored ? 1 : 0,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }).start();
    });
  }, [resultsState]);

  useEffect(() => {
    if (isVisible && allResults.length > 0) {
      const newState = new Map();
      allResults.forEach((result, index) => {
        const data = getPreferredData(result);

        const existing = resultsState.get(index);
        if (data) {
          
          const freshState = {
            type: data.type || 'expense',
            amount:
              data.amount !== undefined
                ? numberToString(normalizeAmountValue(data.amount))
                : '0',
            date: data.date || '',
            merchant: data.merchant || '',
            notes: data.notes || '',
            tags: data.tags || '',
            name: data.title || '',
            categoryId: data.category_id ?? null,
            categoryName: data.category_name ?? null,
            categoryIcon: data.category_icon ?? null,
            categoryColor: data.category_color ?? null,
            isIgnored: existing?.isIgnored || false, 
            items: normalizeItems(result),
            walletId: existing?.walletId || null, 
          };

          newState.set(index, freshState);
        } else {

          console.warn(
            `⚠️ [InvoiceEditSheet] Result ${index} has no analyzed data. Creating default state.`,
            {
              ocraiResultId: result.ocraiResultId,
              resultKeys: Object.keys(result),
            },
          );
          newState.set(
            index,
            existing || {
              type: 'expense',
              amount: '0',
              date: '',
              merchant: '',
              notes: '',
              tags: '',
              name: '',
              categoryId: null,
              categoryName: null,
              categoryIcon: null,
              categoryColor: null,
              isIgnored: false,
              items: normalizeItems(result),
              walletId: null,
            },
          );
        }
      });
      setResultsState(newState);

      const current = newState.get(selectedResultIndex);
      if (current) {
        setType(current.type);
        setAmount(current.amount);
        setDate(current.date);
        setMerchant(current.merchant);
        setNotes(current.notes);
        setTags(current.tags);
        setName(current.name || '');
        setCategoryId(current.categoryId);
        setCategoryName(current.categoryName ?? null);
        setCategoryIcon(current.categoryIcon ?? null);
        setCategoryColor(current.categoryColor ?? null);
        setIsIgnored(current.isIgnored);
        const initialItems = current.items || [];
        setItems(initialItems);

        setTimeout(() => {
          initialItems.forEach((_: InvoiceItem, index: number) => {
            const listAnim = getListItemAnim(index);
            Animated.timing(listAnim, {
              toValue: 1,
              duration: 300,
              delay: index * 40,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();
          });
        }, 100);
      }
      setIsExpanded(true);
      setIsDetailMode(false);
    }

    const loadWalletsAndDefault = async () => {
      try {
        
        const walletsRes = await walletService.getWallets();
        if (walletsRes.success && walletsRes.data?.wallets) {
          setWallets(walletsRes.data.wallets);
        }

        const storedWalletId = await walletService.getSavedWalletId();
        const defaultWalletId = storedWalletId
          ? parseInt(storedWalletId, 10)
          : walletsRes.data?.wallets?.[0]?.id || null;

        if (defaultWalletId) {
          setWalletId(defaultWalletId);

          setResultsState(prev => {
            const newState = new Map(prev);
            allResults.forEach((_, index) => {
              const current = newState.get(index);
              if (current && !current.walletId) {
                newState.set(index, { ...current, walletId: defaultWalletId });
              } else if (!current) {
                
                const data = getPreferredData(allResults[index]);
                newState.set(index, {
                  type: data?.type || 'expense',
                  amount: data?.amount
                    ? numberToString(normalizeAmountValue(data.amount))
                    : '0',
                  date: data?.date || '',
                  merchant: data?.merchant || '',
                  notes: data?.notes || '',
                  tags: data?.tags || '',
                  name: data?.title || '',
                  categoryId: data?.category_id ?? null,
                  categoryName: data?.category_name ?? null,
                  categoryIcon: data?.category_icon ?? null,
                  categoryColor: data?.category_color ?? null,
                  isIgnored: false,
                  items: normalizeItems(allResults[index]),
                  walletId: defaultWalletId,
                });
              }
            });
            return newState;
          });
        }
      } catch (error) {
        console.warn('Error loading wallets:', error);
      }
    };
    loadWalletsAndDefault();
  }, [isVisible, allResults.length]);

  useEffect(() => {
    const state = resultsState.get(selectedResultIndex);
    if (state && !isDetailMode) {

      setType(state.type);
      setAmount(state.amount);
      setDate(state.date);
      setMerchant(state.merchant);
      setNotes(state.notes);
      setTags(state.tags);
      setName(state.name || '');
      setCategoryId(state.categoryId);
      setCategoryName(state.categoryName ?? null);
      setCategoryIcon(state.categoryIcon ?? null);
      setCategoryColor(state.categoryColor ?? null);
      setIsIgnored(state.isIgnored);
      const newItems = state.items || [];
      setItems(newItems);

      if (!showItemsEditor) {
        listItemAnims.forEach(anim => anim.setValue(0));
        setTimeout(() => {
          newItems.forEach((_: InvoiceItem, index: number) => {
            const listAnim = getListItemAnim(index);
            Animated.timing(listAnim, {
              toValue: 1,
              duration: 300,
              delay: index * 40,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();
          });
        }, 100);
      }
    }
  }, [selectedResultIndex, resultsState, isDetailMode, showItemsEditor]);

  const formatCurrency = (value: string): string => {
    
    const numericValue = value.replace(/[^\d.,]/g, '');
    return numericValue;
  };

  const parseAmount = (value: string): number => {
    if (!value || value.trim() === '') return 0;

    if (/^\d+$/.test(value.trim())) {
      return parseFloat(value.trim()) || 0;
    }

    let cleaned = value.replace(/\./g, '');

    cleaned = cleaned.replace(',', '.');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatAmountForDisplay = (value: string): string => {

    const amountValue = parseAmount(value);
    if (amountValue === 0 || isNaN(amountValue)) return '';

    const formatted = amountValue.toFixed(2);
    const [integer, decimal] = formatted.split('.');

    const integerWithDots = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${integerWithDots},${decimal}`;
  };

  const handleItemChange = (index: number, value: string) => {
    setItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, name: value };
      }),
    );
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { name: t('invoice.newItem'), price: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, name: string) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { name: name.trim() || t('invoice.item') };
      return newItems;
    });
  };

  const handleAddNewItem = () => {
    setItems(prev => {
      const newItems = [...prev, { name: '' }];
      const newIndex = newItems.length - 1;
      
      setTimeout(() => {
        const fadeAnim = getItemFadeAnim(newIndex);
        const buttonAnim = getRemoveButtonAnim(newIndex);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();

        Animated.timing(buttonAnim, {
          toValue: 1,
          duration: 250,
          delay: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, 0);
      return newItems;
    });
  };

  const toggleItemExpanded = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getRemoveButtonAnim = (index: number): Animated.Value => {
    if (!removeButtonAnims.has(index)) {
      removeButtonAnims.set(index, new Animated.Value(0));
    }
    return removeButtonAnims.get(index)!;
  };

  const getItemFadeAnim = (index: number): Animated.Value => {
    if (!itemFadeAnims.has(index)) {
      itemFadeAnims.set(index, new Animated.Value(0));
    }
    return itemFadeAnims.get(index)!;
  };

  const getListItemAnim = (index: number): Animated.Value => {
    if (!listItemAnims.has(index)) {
      listItemAnims.set(index, new Animated.Value(0));
    }
    return listItemAnims.get(index)!;
  };

  const handleOpenItemsEditor = () => {
    
    LayoutAnimation.configureNext({
      duration: 250,
      update: {
        type: LayoutAnimation.Types.easeOut,
        property: LayoutAnimation.Properties.scaleY,
      },
    });

    setItemsBackup([...items]);
    
    const itemsToEdit = items.length === 0 ? [{ name: '' }] : [...items];

    items.forEach((_, index) => {
      const listAnim = getListItemAnim(index);
      Animated.timing(listAnim, {
        toValue: 0,
        duration: 200,
        delay: index * 15,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    });

    itemsToEdit.forEach((_, index) => {
      const buttonAnim = getRemoveButtonAnim(index);
      const fadeAnim = getItemFadeAnim(index);
      
      buttonAnim.setValue(1);
      fadeAnim.setValue(1);
    });

    setItems(itemsToEdit);
    setShowItemsEditor(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        itemsToEdit.forEach((_, index) => {
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

        const addButtonAnim = getItemFadeAnim(itemsToEdit.length);
        Animated.timing(addButtonAnim, {
          toValue: 1,
          duration: 300,
          delay: itemsToEdit.length * 40,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();

        const saveButtonAnim = getItemFadeAnim(itemsToEdit.length + 1);
        Animated.timing(saveButtonAnim, {
          toValue: 1,
          duration: 300,
          delay: (itemsToEdit.length + 1) * 40,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    });
  };

  const handleSaveItemsEditor = () => {
    
    LayoutAnimation.configureNext({
      duration: 350,
      update: {
        type: LayoutAnimation.Types.easeOut,
        property: LayoutAnimation.Properties.scaleY,
      },
    });

    const saveButtonAnim = getItemFadeAnim(items.length + 1);
    const addButtonAnim = getItemFadeAnim(items.length);

    Animated.parallel([
      Animated.timing(saveButtonAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(addButtonAnim, {
        toValue: 0,
        duration: 200,
        delay: 30,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();

    const totalItems = items.length;
    const animPromises = items.map((_, index) => {
      const fadeAnim = getItemFadeAnim(index);
      const buttonAnim = getRemoveButtonAnim(index);
      const reverseIndex = totalItems - 1 - index; 

      return new Promise<void>(resolve => {
        
        const delay = reverseIndex * 25 + 60; 

        Animated.parallel([
          Animated.timing(buttonAnim, {
            toValue: 0,
            duration: 250,
            delay: delay,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            delay: delay,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true,
          }),
        ]).start(() => resolve());
      });
    });

    Promise.all(animPromises).then(() => {
      
      const filteredItems = items.filter(item => item.name.trim() !== '');
      const finalItems =
        filteredItems.length > 0 ? filteredItems : [{ name: t('invoice.item') }];

      removeButtonAnims.forEach(anim => anim.setValue(0));
      itemFadeAnims.forEach(anim => anim.setValue(0));

      finalItems.forEach((_, index) => {
        const listAnim = getListItemAnim(index);
        listAnim.setValue(0);
      });

      setItems(finalItems);
      setShowItemsEditor(false);

      requestAnimationFrame(() => {
        setTimeout(() => {
          finalItems.forEach((_, index) => {
            const listAnim = getListItemAnim(index);
            Animated.timing(listAnim, {
              toValue: 1,
              duration: 300,
              delay: index * 40,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();
          });
        }, 50);
      });
    });
  };

  const handleCancelItemsEditor = () => {
    
    LayoutAnimation.configureNext({
      duration: 350,
      update: {
        type: LayoutAnimation.Types.easeOut,
        property: LayoutAnimation.Properties.scaleY,
      },
    });

    const saveButtonAnim = getItemFadeAnim(items.length + 1);
    const addButtonAnim = getItemFadeAnim(items.length);

    Animated.parallel([
      Animated.timing(saveButtonAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(addButtonAnim, {
        toValue: 0,
        duration: 200,
        delay: 30,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();

    const totalItems = items.length;
    const animPromises = items.map((_, index) => {
      const fadeAnim = getItemFadeAnim(index);
      const buttonAnim = getRemoveButtonAnim(index);
      const reverseIndex = totalItems - 1 - index; 

      return new Promise<void>(resolve => {
        
        const delay = reverseIndex * 25 + 60; 

        Animated.parallel([
          Animated.timing(buttonAnim, {
            toValue: 0,
            duration: 250,
            delay: delay,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            delay: delay,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true,
          }),
        ]).start(() => resolve());
      });
    });

    Promise.all(animPromises).then(() => {
      
      const restoredItems = [...itemsBackup];

      removeButtonAnims.forEach(anim => anim.setValue(0));
      itemFadeAnims.forEach(anim => anim.setValue(0));

      restoredItems.forEach((_, index) => {
        const listAnim = getListItemAnim(index);
        listAnim.setValue(0);
      });

      setItems(restoredItems);
      setShowItemsEditor(false);

      requestAnimationFrame(() => {
        setTimeout(() => {
          restoredItems.forEach((_, index) => {
            const listAnim = getListItemAnim(index);
            Animated.timing(listAnim, {
              toValue: 1,
              duration: 300,
              delay: index * 40,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();
          });
        }, 50);
      });
    });
  };

  const formatDate = (dateString: string): string => {
    
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const parseDateInput = (input: string): string => {
    
    if (!input) return '';

    const cleaned = input.replace(/[^\d/]/g, '');
    const parts = cleaned.split('/');

    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }

    if (cleaned.includes('-')) {
      return cleaned;
    }

    return input;
  };

  const handleSave = () => {
    if (isIgnored) {
      showError(t('invoice.thisSuggestionIgnored'));
      return;
    }

    const amountValue = parseAmount(amount);

    if (!amountValue || amountValue <= 0) {
      showError(t('invoice.pleaseEnterValidAmount'));
      return;
    }

    if (!date) {
      showError(t('invoice.pleaseEnterDate'));
      return;
    }

    setIsDetailMode(false);
  };

  const handleCreateTransaction = async () => {
    if (isIgnored) {
      showError(t('invoice.thisSuggestionIgnoredCreate'));
      return;
    }

    const amountValue = parseAmount(amount);

    if (!amountValue || amountValue <= 0) {
      showError(t('invoice.pleaseEnterValidAmount'));
      return;
    }

    if (!date) {
      showError(t('invoice.pleaseEnterDate'));
      return;
    }

    const currentOcraiResult = allResults[selectedResultIndex];
    const currentState = resultsState.get(selectedResultIndex);
    const resultWalletId = currentState?.walletId || walletId; 

    if (!currentOcraiResult || !currentOcraiResult.ocraiResultId) {
      showError(t('invoice.ocrResultIdNotFound'));
      return;
    }

    setLoading(true);

    try {
      const normalizedItems = (items || [])
        .filter(i => i.name)
        .map(i => ({
          name: i.name || t('invoice.item'),
        }));

      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        showError(t('invoice.sessionExpiredSignIn'));
        return;
      }

      const transactionData = {
        wallet_id: resultWalletId,
        type: type,
        amount: amountValue,
        date: date, 
        name: name || merchant || undefined,
        category_id: categoryId || undefined,
        notes: notes || undefined,
        tags: tags || undefined,
        items: normalizedItems.length > 0 ? normalizedItems : undefined,
      };

      const response = await fetch(
        getApiUrl(API_ENDPOINTS.ocrai.createTransactions),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            ocrai_result_id: currentOcraiResult.ocraiResultId,
            transactions: [transactionData],
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        const createdCount = result.data?.created?.length || 0;
        showSuccess(t('invoice.transactionCreatedSuccessfully'));
        if (onTransactionCreated) {
          onTransactionCreated();
        }
      } else {
        showError(result.message || t('invoice.failedToCreateTransaction'));
      }
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      showError(t('invoice.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        showError(t('invoice.sessionExpiredSignIn'));
        return;
      }

      const accepted: Array<{ ocrai_result_id: number; transactions: any[] }> =
        [];
      const ignored: number[] = [];

      allResults.forEach((result, index) => {
        if (!result || !result.ocraiResultId) return;

        const state = resultsState.get(index);
        const isIgnored = state?.isIgnored || false;

        if (isIgnored) {
          
          ignored.push(result.ocraiResultId);
        } else {
          
          let transactionData: any;

          if (state) {
            
            const amountValue = parseAmount(state.amount);
            if (!amountValue || amountValue <= 0 || !state.date) {
              console.warn(`Skipping result ${index}: invalid amount or date`);
              return;
            }

            const normalizedItems = (state.items || [])
              .filter(i => i.name)
              .map(i => ({
                name: i.name || t('invoice.item'),
              }));

            const resultWalletId = state.walletId || walletId; 

            transactionData = {
              wallet_id: resultWalletId,
              type: state.type,
              amount: amountValue,
              date: state.date,
              name: state.name || state.merchant || undefined,
              category_id: state.categoryId || undefined,
              notes: state.notes || undefined,
              tags: state.tags || undefined,
              items: normalizedItems.length > 0 ? normalizedItems : undefined,
            };
          } else {
            
            const data = getPreferredData(result);
            if (!data || !data.amount || !data.date) {
              console.warn(`Skipping result ${index}: no valid data`);
              return;
            }

            const normalizedItems = normalizeItems(result);
            transactionData = {
              wallet_id: resultWalletId,
              type: data.type || 'expense',
              amount: normalizeAmountValue(data.amount),
              date: data.date,
              name: data.title || data.merchant || undefined,
              category_id: data.category_id || undefined,
              notes: data.notes || undefined,
              tags: data.tags || undefined,
              items:
                normalizedItems.length > 0
                  ? normalizedItems.map(i => ({ name: i.name }))
                  : undefined,
            };
          }

          accepted.push({
            ocrai_result_id: result.ocraiResultId,
            transactions: [transactionData],
          });
        }
      });

      if (accepted.length === 0 && ignored.length === 0) {
        onClose();
        return;
      }

      const response = await fetch(
        getApiUrl(API_ENDPOINTS.ocrai.batchProcess),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            accepted,
            ignored,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok && !result.success) {
        showError(result.message || 'Failed to process receipts');
        return;
      }

      const messages: string[] = [];
      const createdCount = result.data?.created?.length || accepted.length;
      const ignoredCount = result.data?.ignored?.length || ignored.length;

      if (createdCount > 0) {
        messages.push(
          `${createdCount} transação${createdCount > 1 ? 'ões' : ''} criada${
            createdCount > 1 ? 's' : ''
          }`,
        );
      }
      if (ignoredCount > 0) {
        messages.push(
          `${ignoredCount} recibo${ignoredCount > 1 ? 's' : ''} ignorado${
            ignoredCount > 1 ? 's' : ''
          }`,
        );
      }

      if (messages.length > 0) {
        showSuccess(messages.join('. ') + '.');
        if (onTransactionCreated) {
          onTransactionCreated();
        }
        onClose();
      } else {
        
        onClose();
        if (onTransactionCreated) {
          onTransactionCreated();
        }
      }
    } catch (error: any) {
      console.error('Error saving transactions:', error);
      showError(error.message || t('invoice.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const confidence =
    (getPreferredData(currentResult)?.confidence as number) || 0;

  const updateCurrentResultState = () => {
    setResultsState(prev => {
      const newState = new Map(prev);
      const current = prev.get(selectedResultIndex);
      newState.set(selectedResultIndex, {
        type,
        amount,
        date,
        merchant: current?.merchant || '',
        notes,
        tags,
        name,
        categoryId,
        categoryName: categoryName ?? null,
        categoryIcon: categoryIcon ?? null,
        categoryColor: categoryColor ?? null,
        isIgnored,
        items,
      });
      return newState;
    });
  };

  useEffect(() => {
    updateCurrentResultState();
  }, [
    type,
    amount,
    date,
    notes,
    tags,
    name,
    categoryId,
    categoryName,
    categoryIcon,
    categoryColor,
    isIgnored,
  ]);

  useEffect(() => {
    Animated.timing(modeAnim, {
      toValue: isDetailMode && !isIgnored ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [isDetailMode, isIgnored, modeAnim]);

  useEffect(() => {
    Animated.spring(strikethroughAnim, {
      toValue: isIgnored ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [isIgnored, strikethroughAnim]);

  const headerIconChar = isDetailMode ? getTypeIcon() : '⇄';
  const headerIconColor = isDetailMode ? getTypeColor() : COLORS.primary;
  const headerTitle = isDetailMode ? t('invoice.editInvoice') : t('invoice.validateTransactions');
  const headerSubtitle = isDetailMode
    ? getTypeLabel()
    : t('invoice.suggestedTransactions');

  function getTypeColor() {
    switch (type) {
      case 'income':
        return '#22C55E';
      case 'expense':
      default:
        return '#EF4444';
    }
  }

  function getTypeLabel() {
    switch (type) {
      case 'income':
        return t('invoice.incomeSuggestedByOCRAI');
      case 'expense':
      default:
        return t('invoice.expenseSuggestedByOCRAI');
    }
  }

  function getTypeIcon() {
    switch (type) {
      case 'income':
        return '↑';
      case 'expense':
      default:
        return '↓';
    }
  }

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
        <View style={styles.handle} />

        {}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {isDetailMode && (
              <TouchableOpacity
                onPress={() => {
                  setIsDetailMode(false);
                  setIsExpanded(false);
                }}
                style={styles.backButton}
              >
                <Text style={styles.backArrow}>‹</Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerTitleContainer}>
              {!isDetailMode && (
                <Text style={[styles.typeIcon, { color: headerIconColor }]}>
                  {headerIconChar}
                </Text>
              )}
              <View>
                <Text style={styles.title}>{headerTitle}</Text>
                <View style={styles.headerTitleContainerInner}>
                  {isDetailMode && (
                    <Text
                      style={[
                        styles.typeIcon,
                        { color: headerIconColor, fontSize: 15 },
                      ]}
                    >
                      {headerIconChar}
                    </Text>
                  )}
                  <Text style={styles.subtitle}>{headerSubtitle}</Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <CloseCircle
              size={24}
              color={COLORS.textSecondary}
              variant="Bold"
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {}
          {!isDetailMode && (
            <Animated.View
              style={[
                {
                  opacity: modeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                  transform: [
                    {
                      translateY: modeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -8],
                      }),
                    },
                  ],
                },
              ]}
            >
              {allResults.map((result, index) => {
                const data = getPreferredData(result) || {};
                const resultState = resultsState.get(index);

                const finalState = resultState || {
                  type: data.type || 'expense',
                  amount: data.amount
                    ? numberToString(normalizeAmountValue(data.amount))
                    : '0',
                  date: data.date || '',
                  merchant: data.merchant || '',
                  notes: data.notes || '',
                  tags: data.tags || '',
                  name: data.title || '',
                  categoryId: data.category_id || null,
                  categoryName: data.category_name || null,
                  categoryIcon: data.category_icon || null,
                  categoryColor: data.category_color || null,
                  isIgnored: false,
                  items: normalizeItems(result),
                };

                const resultConfidence = data.confidence || 0;
                const isResultIgnored = finalState.isIgnored;
                const resultType = finalState.type;
                const resultAmount = finalState.amount;
                const resultDate = finalState.date;
                const resultMerchant = finalState.merchant;
                const resultName = finalState.name;
                
                const resultCategoryId =
                  data.category_id ?? finalState.categoryId;
                const resultCategoryName =
                  data.category_name ?? finalState.categoryName;
                const resultCategoryIcon =
                  data.category_icon ?? finalState.categoryIcon;
                const resultCategoryColor =
                  data.category_color ?? finalState.categoryColor;
                const resultTags = finalState.tags;
                const cardAnim = getCardAnimation(index);

                const getResultTypeColor = () => {
                  return resultType === 'income' ? '#22C55E' : '#EF4444';
                };

                const getResultTypeIcon = () => {
                  return resultType === 'income' ? '↑' : '↓';
                };

                return (
                  <View key={index} style={styles.summaryCardOuter}>
                    {isResultIgnored ? (
                      
                      <Animated.View
                        style={[
                          styles.summaryCardInnerCompact,
                          {
                            opacity: cardAnim,
                            transform: [
                              {
                                scale: cardAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.9, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        {}
                        <View style={styles.strikethroughOverlay}>
                          {Array.from({ length: 60 }).map((_, index) => {
                            const totalRange = 200;
                            const position = -100 + index * (totalRange / 60);

                            return (
                              <View
                                key={index}
                                style={[
                                  styles.strikethroughLine,
                                  {
                                    left: `${position}%`,
                                    top: `${position}%`,
                                  },
                                ]}
                              />
                            );
                          })}
                        </View>

                        <View style={styles.compactHeader}>
                          {}
                          <Animated.View
                            style={[
                              {
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                opacity: cardAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, 0.5],
                                }),
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.compactIconCircle,
                                {
                                  backgroundColor: getResultTypeColor() + '20',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.compactIcon,
                                  { color: getResultTypeColor() },
                                ]}
                              >
                                {getResultTypeIcon()}
                              </Text>
                            </View>
                            <View style={styles.compactContent}>
                              <Text
                                style={styles.compactTitle}
                                numberOfLines={1}
                              >
                                {resultName ||
                                  resultMerchant ||
                                  'Transação sugerida'}
                              </Text>
                              {resultAmount &&
                                parseAmount(resultAmount) > 0 && (
                                  <Text
                                    style={[
                                      styles.compactAmount,
                                      { color: getResultTypeColor() },
                                    ]}
                                  >
                                    {resultType === 'income' ? '+' : '-'}€
                                    {formatAmountForDisplay(resultAmount)}
                                  </Text>
                                )}
                            </View>
                          </Animated.View>

                          {}
                          <View style={styles.lockButtonContainer}>
                            <TouchableOpacity
                              onPress={() => {
                                setResultsState(prev => {
                                  const newState = new Map(prev);
                                  const current =
                                    newState.get(index) || finalState;
                                  newState.set(index, {
                                    ...current,
                                    isIgnored: !current.isIgnored,
                                  });
                                  return newState;
                                });
                              }}
                              style={styles.lockButton}
                            >
                              <RotateLeft
                                size={24}
                                color="#9CA3AF"
                                variant="Bold"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Animated.View>
                    ) : (
                      
                      <Animated.View
                        style={[
                          {
                            opacity: cardAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 0],
                            }),
                            transform: [
                              {
                                scale: cardAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, 0.95],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => {
                            
                            setSelectedResultIndex(index);
                            
                            const state = resultsState.get(index);
                            if (state) {
                              setType(state.type);
                              setAmount(state.amount);
                              setDate(state.date);
                              setMerchant(state.merchant);
                              setNotes(state.notes);
                              setTags(state.tags);
                              setName(state.name || '');
                              setCategoryId(state.categoryId);
                              setCategoryName(state.categoryName ?? null);
                              setCategoryIcon(state.categoryIcon ?? null);
                              setCategoryColor(state.categoryColor ?? null);
                              setIsIgnored(state.isIgnored);
                              setItems(state.items || []);
                            }
                            
                            setTimeout(() => {
                              setIsDetailMode(true);
                              setIsExpanded(true);
                            }, 0);
                          }}
                          style={styles.summaryCardInner}
                        >
                          <View style={styles.summaryHeader}>
                            {resultCategoryIcon ? (
                              <View
                                style={[
                                  styles.summaryIconCircle,
                                  resultCategoryColor && {
                                    backgroundColor: resultCategoryColor + '20',
                                  },
                                ]}
                              >
                                <CategoryIcon
                                  iconName={resultCategoryIcon}
                                  size={24}
                                  color={resultCategoryColor || COLORS.text}
                                />
                              </View>
                            ) : (
                              <View
                                style={[
                                  styles.summaryIconCircle,
                                  {
                                    backgroundColor:
                                      getResultTypeColor() + '20',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.summaryIcon,
                                    { color: getResultTypeColor() },
                                  ]}
                                >
                                  {getResultTypeIcon()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.summaryHeaderText}>
                              <Text
                                style={styles.summaryTitle}
                                numberOfLines={1}
                              >
                                {resultName ||
                                  resultMerchant ||
                                  'Transação sugerida'}
                                {resultCategoryName &&
                                  ` - ${resultCategoryName}`}
                              </Text>
                              <Text style={styles.summarySubtitle}>
                                {resultType === 'income'
                                  ? t('invoice.income')
                                  : t('invoice.expense')}{' '}
                                ·{' '}
                                {resultDate
                                  ? formatDate(resultDate)
                                  : t('invoice.dateNotDefined')}
                              </Text>
                              {}
                              {resultAmount &&
                                parseAmount(resultAmount) > 0 && (
                                  <Text
                                    style={[
                                      styles.summaryAmount,
                                      { color: getResultTypeColor() },
                                    ]}
                                  >
                                    {resultType === 'income' ? '+' : '-'}€
                                    {formatAmountForDisplay(resultAmount)}
                                  </Text>
                                )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    )}
                    {}
                    {!isResultIgnored && (
                      <View style={styles.summaryFooter}>
                        <View style={styles.confidenceBadge}>
                          <Text style={styles.confidenceBadgeText}>
                            {Math.round(resultConfidence * 100)}% {t('invoice.confidence')}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setResultsState(prev => {
                              const newState = new Map(prev);
                              const current = newState.get(index) || finalState;
                              newState.set(index, {
                                ...current,
                                isIgnored: !current.isIgnored,
                                type: current.type || 'expense',
                                amount: current.amount || '0',
                                date: current.date || '',
                                merchant: current.merchant || '',
                                notes: current.notes || '',
                                tags: current.tags || '',
                                name: current.name || '',
                                categoryId: current.categoryId ?? null,
                                categoryName: current.categoryName ?? null,
                                categoryIcon: current.categoryIcon ?? null,
                                categoryColor: current.categoryColor ?? null,
                                items: current.items || [],
                                walletId: current.walletId ?? null,
                              });
                              return newState;
                            });
                          }}
                          style={styles.ignoreButtonInline}
                        >
                          <Text style={styles.ignoreButtonInlineText}>
                            {t('invoice.ignore')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </Animated.View>
          )}

          {}
          {isDetailMode && !isIgnored && (
            <Animated.View
              style={{
                opacity: modeAnim,
                transform: [
                  {
                    translateY: modeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              }}
            >
              {}
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>{t('invoice.amount')}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsCalculatorVisible(true);
                  }}
                >
                  <Text style={[styles.amountInput, { color: getTypeColor() }]}>
                    {amount && parseAmount(amount) > 0
                      ? `€${formatAmountForDisplay(amount)}`
                      : '0,00'}
                  </Text>
                </TouchableOpacity>
              </View>

              {}
              <View style={styles.section}>
                <View style={styles.typeSelectorContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      type === 'expense' && styles.typeOptionActive,
                      type === 'expense' && styles.typeOptionExpense,
                    ]}
                    onPress={() => setType('expense')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        type === 'expense' && styles.typeOptionTextActive,
                        type === 'expense' && { color: '#EF4444' },
                      ]}
                    >
                      {t('invoice.expense')}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.typeDivider} />
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      type === 'income' && styles.typeOptionActive,
                      type === 'income' && styles.typeOptionIncome,
                    ]}
                    onPress={() => setType('income')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        type === 'income' && styles.typeOptionTextActive,
                        type === 'income' && { color: '#22C55E' },
                      ]}
                    >
                      {t('invoice.income')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {}
              <View style={styles.section}>
                <Text style={styles.label}>{t('invoice.transactionName')}</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={merchant || t('invoice.nameGeneratedByAI')}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              {}
              <View style={styles.section}>
                <Text style={styles.label}>{t('invoice.category')}</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setIsCategorySheetVisible(true)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categorySelectorIcon,
                      categoryColor && {
                        backgroundColor: categoryColor + '15',
                      },
                    ]}
                  >
                    <CategoryIcon
                      iconName={categoryIcon || 'Grid3X3'}
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
                    {categoryName || t('invoice.select')}
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
                <Text style={styles.label}>{t('invoice.wallet')}</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setIsWalletSheetVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categorySelectorIcon}>
                    <CategoryIcon
                      iconName="Wallet"
                      size={16}
                      color={(() => {
                        const currentState =
                          resultsState.get(selectedResultIndex);
                        const resultWalletId =
                          currentState?.walletId || walletId;
                        return resultWalletId
                          ? COLORS.primary
                          : COLORS.textMuted;
                      })()}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categorySelectorText,
                      (() => {
                        const currentState =
                          resultsState.get(selectedResultIndex);
                        const resultWalletId =
                          currentState?.walletId || walletId;
                        const selectedWallet = wallets.find(
                          w => w.id === resultWalletId,
                        );
                        return selectedWallet ? { color: COLORS.text } : {};
                      })(),
                    ]}
                  >
                    {(() => {
                      const currentState =
                        resultsState.get(selectedResultIndex);
                      const resultWalletId = currentState?.walletId || walletId;
                      const selectedWallet = wallets.find(
                        w => w.id === resultWalletId,
                      );
                      return selectedWallet
                        ? selectedWallet.name
                        : t('invoice.selectWallet');
                    })()}
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
                <Text style={styles.label}>{t('invoice.date')}</Text>
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
                    {date ? formatDate(date) : t('invoice.select')}
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
                <Text style={styles.label}>{t('invoice.notes')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('invoice.addNotes')}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              {}
              <View style={styles.section}>
                <Text style={styles.label}>{t('invoice.tags')}</Text>
                <TextInput
                  style={styles.input}
                  value={tags}
                  onChangeText={setTags}
                  placeholder={t('invoice.tagsPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              {}
              <View style={styles.section}>
                <View style={styles.itemsCardOuter}>
                  <View style={styles.itemsCardHeader}>
                    <Text style={styles.itemsCardTitle}>{t('invoice.items')}</Text>
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
                            {t('invoice.noItemsFound')}
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
                                      style={styles.itemInputEdit}
                                      value={item.name}
                                      onChangeText={text =>
                                        handleUpdateItem(index, text)
                                      }
                                      placeholder={t('invoice.itemNamePlaceholder')}
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
                                + {t('transactions.addItem')}
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
            </Animated.View>
          )}

          {}
          {isDetailMode &&
            !isIgnored &&
            (() => {
              const result = allResults[selectedResultIndex];

              const imageUrl =
                (result as any)?.file_url ||
                (result as any)?.fileUrl ||
                (result as any)?.result?.file_url ||
                (result as any)?._originalResult?.file_url ||
                null;

              if (imageUrl) {
                return (
                  <View style={styles.imagePreviewContainer}>
                    <Text style={styles.imagePreviewLabel}>{t('invoice.receipt')}</Text>
                    <TouchableOpacity
                      style={styles.imagePreview}
                      onPress={() => {
                        setImageUrl(imageUrl);
                        setImageModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.imagePreviewImage}
                        resizeMode="cover"
                      />
                      <View style={styles.imagePreviewOverlay}>
                        <Text style={styles.imagePreviewText}>
                          {t('invoice.tapToZoom')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              }
              return null;
            })()}

          {}
          <View style={{ height: 100 }} />
        </ScrollView>

        {}
        <View style={styles.bottomButtons}>
          {isDetailMode && !isIgnored ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  setIsDetailMode(false);
                  setIsExpanded(false);
                }}
                style={[styles.button, styles.cancelButton]}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[
                  styles.button,
                  styles.saveButtonBottom,
                  { backgroundColor: getTypeColor() },
                  loading && { opacity: 0.6 },
                ]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <TickCircle size={20} color="#FFFFFF" variant="Bold" />
                    <Text style={styles.saveButtonBottomText}>{t('common.save')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={handleSaveAll}
                style={[
                  styles.button,
                  styles.saveButtonBottom,
                  { backgroundColor: COLORS.primary },
                  loading && { opacity: 0.6 },
                ]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <TickCircle size={20} color="#FFFFFF" variant="Bold" />
                    <Text style={styles.saveButtonBottomText}>{t('common.save')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {}
        <CalculatorSheet
          isVisible={isCalculatorVisible}
          onClose={() => setIsCalculatorVisible(false)}
          onAmountChange={newAmount => {

            setAmount(newAmount);
          }}
          initialAmount={amount || '0'}
        />

        {}
        <CategorySheet
          isVisible={isCategorySheetVisible}
          onClose={() => setIsCategorySheetVisible(false)}
          onSelect={(category: Category) => {
            setCategoryId(category.id);
            setCategoryName(category.name);
            setCategoryIcon(category.icon);
            setCategoryColor(category.color);
          }}
          selectedCategoryId={categoryId}
          type={type}
        />

        {}
        <DateSheet
          isVisible={isDateSheetVisible}
          onClose={() => setIsDateSheetVisible(false)}
          onSelect={(selectedDate: Date) => {
            
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            setDate(`${year}-${month}-${day}`);
          }}
          initialDate={date ? new Date(date) : new Date()}
        />

        {}
        <AccountSelectorSheet
          isVisible={isWalletSheetVisible}
          onClose={() => setIsWalletSheetVisible(false)}
          onSelectAccount={account => {
            const walletId = parseInt(account.id, 10);
            setResultsState(prev => {
              const newState = new Map(prev);
              const current = newState.get(selectedResultIndex);
              if (current) {
                newState.set(selectedResultIndex, { ...current, walletId });
              }
              return newState;
            });
            setIsWalletSheetVisible(false);
          }}
          selectedAccountId={(() => {
            const currentState = resultsState.get(selectedResultIndex);
            const resultWalletId = currentState?.walletId || walletId;
            return resultWalletId ? resultWalletId.toString() : undefined;
          })()}
        />

        {}
        <Modal
          visible={imageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setImageModalVisible(false);
            setImageUrl(null);
          }}
        >
          <View style={styles.imageModalContainer}>
            <TouchableOpacity
              style={styles.imageModalCloseButton}
              onPress={() => {
                setImageModalVisible(false);
                setImageUrl(null);
              }}
              activeOpacity={0.8}
            >
              <CloseCircle size={32} color="#FFFFFF" variant="Bold" />
            </TouchableOpacity>
            {imageUrl && (
              <TouchableOpacity
                style={styles.imageModalTouchable}
                activeOpacity={1}
                onPress={() => {
                  setImageModalVisible(false);
                  setImageUrl(null);
                }}
              >
                <ScrollView
                  contentContainerStyle={styles.imageModalScrollContent}
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  bouncesZoom={true}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.imageModalImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              </TouchableOpacity>
            )}
          </View>
        </Modal>
      </View>
    </Modal>
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
    backgroundColor: '#E5E7EB',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitleContainerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: SIZES.fontLarge,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginTop: 0,
  },
  typeIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  backButton: {
    marginRight: 4,
    paddingRight: 4,
    paddingVertical: 4,
  },
  backArrow: {
    fontSize: 22,
    color: COLORS.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIZES.paddingSmall + 4,
    paddingBottom: 40,
  },
  summaryCardOuter: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 20,
    padding: 8,
    marginBottom: SIZES.paddingSmall + 4,
    position: 'relative',
    overflow: 'hidden',
  },
  summaryCardInner: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
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
  summaryCardInnerCompact: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    justifyContent: 'center',
    minHeight: 70,
    position: 'relative',
    overflow: 'hidden',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  compactIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  compactSubtitle: {
    fontSize: SIZES.fontTiny,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  compactAmount: {
    fontSize: SIZES.fontSmall + 1,
    fontWeight: '700',
  },
  lockButtonContainer: {
    opacity: 1,
    zIndex: 10,
  },
  lockButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  strikethroughOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'none',
    overflow: 'visible',
  },
  strikethroughLine: {
    position: 'absolute',
    width: '250%',
    height: 2,
    backgroundColor: '#808080',
    opacity: 0.2,
    transform: [{ rotate: '-45deg' }],
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  summaryIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCategoryIconInCircle: {
    fontSize: 18,
  },
  summaryHeaderText: {
    flex: 1,
    marginRight: 6,
  },
  summaryTitle: {
    fontSize: SIZES.fontSmall + 1,
    fontWeight: '600',
    color: COLORS.text,
  },
  summarySubtitle: {
    fontSize: SIZES.fontTiny + 1,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  summaryAmount: {
    fontSize: SIZES.fontSmall + 1,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  summaryCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryCategoryIcon: {
    fontSize: 12,
  },
  summaryCategory: {
    fontSize: SIZES.fontTiny,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  summaryTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTagText: {
    fontSize: SIZES.fontTiny - 1,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  summaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryBadgeText: {
    fontSize: SIZES.fontTiny - 1,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ignoreButtonInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.backgroundSecondary,
  },
  ignoreButtonInlineActive: {
    backgroundColor: '#9CA3AF20',
  },
  saveTransactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveTransactionButtonText: {
    color: '#FFFFFF',
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
  },
  ignoreButtonInlineText: {
    fontSize: SIZES.fontTiny,
    color: '#F97316',
    fontWeight: '500',
  },
  ignoreButtonInlineTextActive: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  walletSelectorDropdown: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  walletSelectorList: {
    maxHeight: 200,
  },
  walletSelectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  walletSelectorItemSelected: {
    backgroundColor: COLORS.backgroundLight,
  },
  walletSelectorItemText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.text,
  },
  walletSelectorItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  walletSelectorItemCheck: {
    fontSize: SIZES.fontMedium,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  returnButtonCenterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  returnButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  returnButtonText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#22C55E15',
    borderWidth: 1,
    borderColor: '#22C55E30',
  },
  confidenceBadgeText: {
    fontSize: SIZES.fontTiny,
    color: '#22C55E',
    fontWeight: '600',
  },
  summaryMetaText: {
    fontSize: SIZES.fontTiny,
    color: COLORS.textSecondary,
  },
  summaryMetaHighlight: {
    fontWeight: '600',
    color: COLORS.text,
  },
  section: {
    marginBottom: SIZES.paddingSmall + 2,
  },
  label: {
    fontSize: SIZES.fontSmall,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
  },
  inputPlaceholder: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textMuted,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    alignItems: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionActive: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  typeOptionExpense: {
    backgroundColor: '#EF444410',
  },
  typeOptionIncome: {
    backgroundColor: '#22C55E10',
  },
  typeDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  typeOptionText: {
    fontSize: SIZES.fontSmall,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  typeOptionTextActive: {
    fontWeight: '600',
  },
  itemsCardOuter: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 20,
    padding: 8,
    marginBottom: SIZES.paddingSmall + 4,
    position: 'relative',
    overflow: 'hidden',
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
  itemsList: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    gap: 0,
  },
  itemsCompactSubtitle: {
    fontSize: SIZES.fontTiny + 1,
    color: COLORS.textSecondary,
  },
  itemCard: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemCardEdit: {
    paddingVertical: 8,
    minHeight: 48,
  },
  itemCardLast: {
    borderBottomWidth: 0,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 20,
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemToggle: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: SIZES.fontTiny + 1,
  },
  itemEditBody: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemName: {
    fontSize: SIZES.fontMedium,
    fontWeight: '400',
    color: COLORS.text,
    lineHeight: 20,
    flex: 1,
    minWidth: 0,
  },
  itemInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemInputInline: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  itemInputEdit: {
    flex: 1,
    minWidth: 0,
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  itemBullet: {
    color: COLORS.textSecondary,
    fontSize: 18,
    marginRight: 2,
  },
  itemsEditorWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFBFC',
    overflow: 'hidden',
  },
  itemsEditorArea: {
    minHeight: 160,
    textAlignVertical: 'top',
    fontSize: SIZES.fontMedium,
    lineHeight: 28,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    color: COLORS.text,
    letterSpacing: 0.2,
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
  itemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  itemIconText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  itemRowInputs: {
    
  },
  itemInputSmall: {
    
  },
  itemInputLabel: {
    
  },
  itemMeta: {
    fontSize: SIZES.fontTiny,
    color: COLORS.textSecondary,
  },
  itemPrice: {
    
  },
  itemEmpty: {
    fontSize: SIZES.fontTiny,
    color: COLORS.textSecondary,
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
  addItemButton: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  addItemButtonEdit: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addItemButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.primary,
    fontWeight: '400',
  },
  addItemText: {
    fontSize: SIZES.fontTiny + 1,
    color: COLORS.primary,
    fontWeight: '600',
  },
  addItemEmpty: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  collapseItemsButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  collapseItemsText: {
    fontSize: SIZES.fontTiny + 1,
    fontWeight: '600',
    color: COLORS.text,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  categorySelectorIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
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
    borderColor: '#E5E7EB',
    gap: 10,
  },
  dateSelectorIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  amountContainer: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  amountLabel: {
    fontSize: SIZES.fontSmall,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    paddingVertical: 4,
  },
  ignoreChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F97316',
    backgroundColor: 'transparent',
  },
  ignoreChipActive: {
    backgroundColor: '#F97316',
  },
  ignoreChipText: {
    fontSize: SIZES.fontTiny - 1,
    color: '#F97316',
    fontWeight: '500',
  },
  ignoreChipTextActive: {
    color: '#FFFFFF',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: SIZES.paddingSmall + 4,
    paddingBottom: SIZES.paddingSmall + 20,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveButtonBottom: {
    
  },
  saveButtonBottomText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ignoredContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ignoredTitle: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  ignoredSubtitle: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  imagePreviewContainer: {
    marginBottom: SIZES.paddingSmall + 4,
  },
  imagePreviewLabel: {
    fontSize: SIZES.fontSmall,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundSecondary,
    position: 'relative',
  },
  imagePreviewImage: {
    width: '100%',
    height: '100%',
  },
  imagePreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalTouchable: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  imageModalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

export default InvoiceEditSheet;
