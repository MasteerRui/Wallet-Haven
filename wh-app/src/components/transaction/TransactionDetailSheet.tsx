import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import {
  Pencil,
  Trash2,
  ArrowLeft,
  Wallet,
  FileText,
  ExternalLink,
} from 'lucide-react-native';
import Svg, { Path, G } from 'react-native-svg';
import { COLORS, SIZES } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import CategoryIcon from '../common/CategoryIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Transaction {
  id?: number;
  wallet_id?: number;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date?: string;
  name?: string;
  notes?: string;
  tags?: string;
  items?: Array<{
    name: string;
    price?: number;
    quantity?: number;
  }>;
  wallet?: {
    id: number;
    name: string;
    currency: string;
  };
  origin_wallet?: {
    id: number;
    name: string;
    currency: string;
  };
  destination_wallet?: {
    id: number;
    name: string;
    currency: string;
  };
  category?: {
    id: number;
    name: string;
    icon?: string;
    color?: string;
  };
  file?: {
    id: number;
    file_url: string;
    file_name: string;
    file_type: string;
  };
  recurrence_id?: number | null;
  recurrence?: {
    id: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    start_date: string;
    end_date?: string | null;
  } | null;
  recurrence_info?: {
    is_recurring: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    start_date?: string;
    end_date?: string | null;
    recent_transactions?: Array<{
      id: number;
      date: string;
      amount: number;
      created_at: string;
    }>;
    total_generated?: number;
  };
  created_at?: string;
}

interface TransactionDetailSheetProps {
  isVisible: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: number) => void;
}

const TransactionDetailSheet: React.FC<TransactionDetailSheetProps> = ({
  isVisible,
  onClose,
  transaction,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const formatCurrency = (amount: number): string => {
    const currency =
      transaction?.wallet?.currency ||
      transaction?.origin_wallet?.currency ||
      transaction?.destination_wallet?.currency ||
      'EUR';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Hoje, ${date.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (isYesterday) {
      return `Ontem, ${date.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else {
      return date.toLocaleDateString('pt-PT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const handleOpenFile = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const getRecurrenceFrequencyText = (frequency: string): string => {
    const frequencyMap = {
      daily: 'Diariamente',
      weekly: 'Semanalmente',
      monthly: 'Mensalmente',
      yearly: 'Anualmente',
    };
    return frequencyMap[frequency as keyof typeof frequencyMap] || frequency;
  };

  const formatRecurrenceDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleEdit = () => {
    if (transaction && onEdit) {
      onEdit(transaction);
    }
  };

  const handleDelete = () => {
    if (transaction?.id && onDelete) {
      onDelete(transaction.id);
    }
  };

  if (!transaction) return null;

  const transType = (transaction as any).type;
  const isIncome = transaction.type === 'income' || transType === 'transfer_in';
  const isExpense =
    transaction.type === 'expense' || transType === 'transfer_out';
  const isTransfer =
    transaction.type === 'transfer' ||
    transType === 'transfer_in' ||
    transType === 'transfer_out';

  const categoryIcon = isTransfer
    ? null
    : transaction.category?.icon || 'Receipt';
  const categoryColor = isTransfer
    ? COLORS.primary
    : transaction.category?.color || COLORS.textMuted;
  const categoryName = transaction.category?.name || t('transactions.noCategory');

  const typeLabel = isIncome
    ? 'Receita'
    : isExpense
    ? 'Despesa'
    : 'Transferência';
  const amountColor = isIncome
    ? '#22C55E'
    : isExpense
    ? COLORS.text
    : COLORS.primary;

  const transactionDate = transaction.date || transaction.created_at;

  const wallet = transaction.wallet;
  const originWallet = transaction.origin_wallet;
  const destinationWallet = transaction.destination_wallet;
  const file = transaction.file;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <View
                style={[styles.iconCircle, { backgroundColor: categoryColor }]}
              >
                {isTransfer ? (
                  <TransferIcon size={32} color="#FFFFFF" />
                ) : (
                  <CategoryIcon
                    iconName={categoryIcon}
                    size={32}
                    color="#FFFFFF"
                  />
                )}
              </View>
              <View
                style={[styles.iconRing, { borderColor: categoryColor + '30' }]}
              />
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    transaction.type === 'income'
                      ? '#22C55E20'
                      : transaction.type === 'expense'
                      ? '#EF444420'
                      : COLORS.primary + '20',
                },
              ]}
            >
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor:
                      transaction.type === 'income'
                        ? '#22C55E'
                        : transaction.type === 'expense'
                        ? '#EF4444'
                        : COLORS.primary,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      transaction.type === 'income'
                        ? '#22C55E'
                        : transaction.type === 'expense'
                        ? '#EF4444'
                        : COLORS.primary,
                  },
                ]}
              >
                {typeLabel}
              </Text>
            </View>

            <Text
              style={[
                styles.amountText,
                {
                  color:
                    transaction.type === 'income'
                      ? '#22C55E'
                      : transaction.type === 'expense'
                      ? '#1F2937'
                      : COLORS.primary,
                },
              ]}
            >
              {isIncome ? '+' : isExpense ? '-' : ''}
              {formatCurrency(Math.abs(transaction.amount))}
            </Text>

            <Text style={styles.transactionName}>
              {transaction.name || categoryName}
            </Text>

            <View style={styles.transactionMeta}>
              <View style={styles.completedBadge}>
                <View style={styles.completedDot} />
                <Text style={styles.completedText}>Concluída</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Detalhes</Text>
          <View style={styles.detailsSection}>
            {transactionDate && (
              <View style={styles.detailRow}>
                <View style={styles.detailLeft}>
                  <View style={styles.detailIconContainer}>
                    <CategoryIcon
                      iconName="Calendar"
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.detailRowLabel}>Data e Hora</Text>
                </View>
                <View style={styles.detailRowValueContainer}>
                  <Text style={styles.detailRowValue}>
                    {new Date(transactionDate).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.detailRowTime}>
                    {new Date(transactionDate).toLocaleTimeString('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <View style={styles.detailIconContainer}>
                  <CategoryIcon
                    iconName="DollarSign"
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.detailRowLabel}>Valor</Text>
              </View>
              <Text style={styles.detailRowValue}>
                {formatCurrency(Math.abs(transaction.amount))}
              </Text>
            </View>

            {isTransfer ? (
              <>
                {originWallet && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLeft}>
                      <View style={styles.detailIconContainer}>
                        <CategoryIcon
                          iconName="ArrowUp"
                          size={20}
                          color={COLORS.primary}
                        />
                      </View>
                      <Text style={styles.detailRowLabel}>Enviado de</Text>
                    </View>
                    <Text style={styles.detailRowValue}>
                      {originWallet.name}
                    </Text>
                  </View>
                )}
                {destinationWallet && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLeft}>
                      <View style={styles.detailIconContainer}>
                        <CategoryIcon
                          iconName="ArrowDown"
                          size={20}
                          color={COLORS.primary}
                        />
                      </View>
                      <Text style={styles.detailRowLabel}>Recebido em</Text>
                    </View>
                    <Text style={styles.detailRowValue}>
                      {destinationWallet.name}
                    </Text>
                  </View>
                )}
              </>
            ) : wallet ? (
              <View style={styles.detailRow}>
                <View style={styles.detailLeft}>
                  <View style={styles.detailIconContainer}>
                    <Wallet size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.detailRowLabel}>Carteira</Text>
                </View>
                <Text style={styles.detailRowValue}>{wallet.name}</Text>
              </View>
            ) : null}

            {categoryName !== t('transactions.noCategory') && (
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <View style={styles.detailLeft}>
                  <View style={styles.detailIconContainer}>
                    <CategoryIcon
                      iconName={categoryIcon}
                      size={20}
                      color={categoryColor}
                    />
                  </View>
                  <Text style={styles.detailRowLabel}>Categoria</Text>
                </View>
                <Text style={styles.detailRowValue}>{categoryName}</Text>
              </View>
            )}
          </View>

          {(transaction.name || transaction.notes || transaction.tags) && (
            <>
              <Text style={styles.sectionTitle}>Informações Adicionais</Text>
              <View style={styles.detailsSection}>
                {transaction.name && (
                  <View
                    style={[
                      styles.detailRowMultiline,
                      !transaction.notes &&
                        !transaction.tags && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.detailLeft}>
                      <View style={styles.detailIconContainer}>
                        <CategoryIcon
                          iconName="FileText"
                          size={20}
                          color={COLORS.primary}
                        />
                      </View>
                      <Text style={styles.detailRowLabel}>Nome</Text>
                    </View>
                    <Text style={styles.multilineValueText}>
                      {transaction.name.replace(/\s*\((In|Out)\)\s*$/g, '')}
                    </Text>
                  </View>
                )}
                {transaction.notes && (
                  <View
                    style={[
                      styles.detailRowMultiline,
                      !transaction.tags && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.detailLeft}>
                      <View style={styles.detailIconContainer}>
                        <CategoryIcon
                          iconName="MessageSquare"
                          size={20}
                          color={COLORS.primary}
                        />
                      </View>
                      <Text style={styles.detailRowLabel}>Notas</Text>
                    </View>
                    <Text style={styles.multilineValueText}>
                      {transaction.notes.replace(/\s*\((In|Out)\)\s*$/g, '')}
                    </Text>
                  </View>
                )}
                {transaction.tags && (
                  <View
                    style={[
                      styles.detailRowMultiline,
                      { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.detailLeft}>
                      <View style={styles.detailIconContainer}>
                        <CategoryIcon
                          iconName="Tag"
                          size={20}
                          color={COLORS.primary}
                        />
                      </View>
                      <Text style={styles.detailRowLabel}>Tags</Text>
                    </View>
                    <Text style={styles.multilineValueText}>
                      {transaction.tags}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {transaction.items &&
            Array.isArray(transaction.items) &&
            transaction.items.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  Itens ({transaction.items.length})
                </Text>
                <View style={styles.detailsSection}>
                  {transaction.items.map((item, index) => {
                    if (!item || typeof item !== 'object') return null;

                    return (
                      <View
                        key={index}
                        style={[
                          styles.itemCard,
                          index === transaction.items!.length - 1 &&
                            styles.itemCardLast,
                        ]}
                      >
                        <Text
                          style={styles.itemName}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item?.name || 'Item sem nome'}
                        </Text>
                        {(item?.quantity != null || item?.price != null) && (
                          <View style={styles.itemMeta}>
                            {item?.quantity != null && (
                              <Text style={styles.itemMetaText}>
                                Qtd: {item.quantity}
                              </Text>
                            )}
                            {item?.price != null && (
                              <Text style={styles.itemPrice}>
                                {formatCurrency(item.price)}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}

          {file && (
            <>
              <Text style={styles.sectionTitle}>Anexo</Text>
              <View style={styles.detailsSection}>
                <TouchableOpacity
                  style={styles.fileRow}
                  onPress={() => handleOpenFile(file.file_url)}
                  activeOpacity={0.7}
                >
                  <View style={styles.fileIcon}>
                    {file.file_type?.startsWith('image/') ? (
                      <Image
                        source={{ uri: file.file_url }}
                        style={styles.fileImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <FileText size={24} color={COLORS.primary} />
                    )}
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.file_name}
                    </Text>
                    <Text style={styles.fileType}>{file.file_type}</Text>
                  </View>
                  <ExternalLink size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {transaction.recurrence_info?.is_recurring && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Recorrência</Text>
              <View style={styles.recurrenceContainer}>
                <View style={styles.recurrenceMainInfo}>
                  <View style={styles.recurrenceFrequencyContainer}>
                    <CategoryIcon
                      iconName="Refresh2"
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text style={styles.recurrenceFrequency}>
                      {getRecurrenceFrequencyText(
                        transaction.recurrence_info.frequency || 'monthly',
                      )}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.recurrenceStatusBadge,
                      { backgroundColor: COLORS.primary + '15' },
                    ]}
                  >
                    <View
                      style={[
                        styles.recurrenceStatusDot,
                        { backgroundColor: COLORS.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.recurrenceStatusText,
                        { color: COLORS.primary },
                      ]}
                    >
                      Recorrente
                    </Text>
                  </View>
                </View>

                <View style={styles.recurrenceDates}>
                  {transaction.recurrence_info.start_date && (
                    <View style={styles.recurrenceDateItem}>
                      <Text style={styles.recurrenceDateLabel}>Início:</Text>
                      <Text style={styles.recurrenceDateValue}>
                        {formatRecurrenceDate(
                          transaction.recurrence_info.start_date,
                        )}
                      </Text>
                    </View>
                  )}

                  {transaction.recurrence_info.end_date && (
                    <View style={styles.recurrenceDateItem}>
                      <Text style={styles.recurrenceDateLabel}>Fim:</Text>
                      <Text style={styles.recurrenceDateValue}>
                        {formatRecurrenceDate(
                          transaction.recurrence_info.end_date,
                        )}
                      </Text>
                    </View>
                  )}

                  {transaction.recurrence_info.total_generated != null && (
                    <View style={styles.recurrenceDateItem}>
                      <Text style={styles.recurrenceDateLabel}>
                        Total Gerado:
                      </Text>
                      <Text style={styles.recurrenceDateValue}>
                        {transaction.recurrence_info.total_generated} transações
                      </Text>
                    </View>
                  )}
                </View>

                {transaction.recurrence_info.recent_transactions &&
                  transaction.recurrence_info.recent_transactions.length >
                    0 && (
                    <View style={styles.recentRecurrenceSection}>
                      <Text style={styles.recentRecurrenceTitle}>
                        {`Transações Recentes desta Recorrência (${transaction.recurrence_info.recent_transactions.length})`}
                      </Text>
                      {transaction.recurrence_info.recent_transactions
                        .slice(0, 5)
                        .map(recentTx => (
                          <View
                            key={recentTx.id}
                            style={styles.recentTransactionItem}
                          >
                            <Text style={styles.recentTransactionDate}>
                              {formatRecurrenceDate(recentTx.date)}
                            </Text>
                            <Text
                              style={[
                                styles.recentTransactionAmount,
                                {
                                  color:
                                    recentTx.amount >= 0
                                      ? '#22C55E'
                                      : COLORS.text,
                                },
                              ]}
                            >
                              {formatCurrency(Math.abs(recentTx.amount))}
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.actionsContainer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {onEdit && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Pencil size={20} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
          )}
          {onDelete && transaction.id && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Trash2 size={20} color={COLORS.error} strokeWidth={2.5} />
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const TransferIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.00999 20.5002L3.98999 15.4902"
      stroke={color}
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9.01001 3.5V20.5"
      stroke={color}
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <G opacity="0.4">
      <Path
        d="M14.9902 3.5L20.0102 8.51"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.9902 20.5V3.5"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

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
    paddingBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: SIZES.padding,
    backgroundColor: '#FFFFFF',
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    borderRadius: SIZES.radiusLarge,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  iconRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    top: -10,
    left: -10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: SIZES.fontSmall,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  amountText: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -1,
  },
  transactionName: {
    fontSize: SIZES.fontLarge,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  transactionMeta: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    alignItems: 'center',
  },
  transactionDate: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  completedText: {
    fontSize: SIZES.fontSmall,
    color: '#22C55E',
    fontWeight: '600',
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.padding,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.paddingSmall + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.padding,
    marginBottom: SIZES.paddingSmall,
    marginHorizontal: SIZES.padding,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailRowLabel: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  detailRowValue: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  detailRowValueContainer: {
    alignItems: 'flex-end',
  },
  detailRowTime: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemCardLast: {
    borderBottomWidth: 0,
  },
  itemName: {
    fontSize: SIZES.fontMedium,
    fontWeight: '400',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMetaText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  itemPrice: {
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
    color: COLORS.text,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusSmall,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.paddingSmall,
    overflow: 'hidden',
  },
  fileImage: {
    width: 48,
    height: 48,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: SIZES.fontMedium,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  fileType: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  recurrenceContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  recurrenceMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recurrenceFrequencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurrenceFrequency: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
  },
  recurrenceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recurrenceStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recurrenceStatusText: {
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
  },
  recurrenceDates: {
    gap: 6,
  },
  recurrenceDateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recurrenceDateLabel: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  recurrenceDateValue: {
    fontSize: SIZES.fontSmall,
    color: COLORS.text,
    fontWeight: '500',
  },
  recentRecurrenceSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  recentRecurrenceTitle: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 8,
  },
  recentTransactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  recentTransactionDate: {
    fontSize: SIZES.fontTiny,
    color: COLORS.textMuted,
  },
  recentTransactionAmount: {
    fontSize: SIZES.fontTiny,
    fontWeight: '500',
  },
  detailRowMultiline: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  multilineValueText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    paddingTop: 12,
    gap: SIZES.paddingSmall,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: '#FFFFFF',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  editButtonText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.error,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '700',
    color: COLORS.error,
    letterSpacing: 0.5,
  },
});

export default TransactionDetailSheet;
