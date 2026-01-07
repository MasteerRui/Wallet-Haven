import { API_ENDPOINTS } from '../constants/config';
import apiService, { ApiResponse } from './apiService';

export interface OcraiItem {
  name: string;
  price: number | string;
  quantity: number | string;
}

export interface OcraiData {
  type?: 'income' | 'expense';
  amount?: number;
  date?: string;
  name?: string | null; 
  merchant?: string | null; 
  title?: string | null;
  notes?: string | null;
  tags?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  confidence?: number;
  items?: OcraiItem[];
}

export interface OcraiResult {
  id?: number; 
  ocraiResultId?: number; 
  analyzedData?: OcraiData;
  corrected_data?: OcraiData;
  extracted_data?: OcraiData;
  raw_text?: string;
  file_id?: number;
  transaction_id?: number;
  ocr_status?: string;
  created_at?: string;
  updated_at?: string;
  receiptData?: {
    items?: OcraiItem[];
  };
}

export interface PendingResponse {
  success: boolean;
  message?: string;
  data?: {
    count: number;
    results: OcraiResult[];
  };
  needsLogin?: boolean;
}

class OcraiService {
  async getPending(): Promise<PendingResponse> {
    try {
      const response = await apiService.get<{ count: number; results: OcraiResult[] }>(
        API_ENDPOINTS.ocrai.pending
      );

      if (!response.data) {
        return {
          success: response.success || false,
          message: response.message,
          data: {
            count: 0,
            results: [],
          },
          needsLogin: response.needsLogin,
        };
      }

      if (response.data.results && Array.isArray(response.data.results)) {

        const normalizedResults = response.data.results.map((result: any) => {
          const normalized = {
            ...result,
            ocraiResultId: result.ocraiResultId || result.id, 
          };

          return normalized;
        });
        
        return {
          success: response.success,
          message: response.message,
          data: {
            count: response.data.count || normalizedResults.length,
            results: normalizedResults,
          },
          needsLogin: response.needsLogin,
        };
      }

      return {
        success: response.success,
        message: response.message,
        data: {
          count: response.data.count || 0,
          results: [],
        },
        needsLogin: response.needsLogin,
      };
    } catch (error) {
      console.error('❌ [OcraiService] Error fetching pending:', error);
      return {
        success: false,
        message: 'Failed to fetch pending receipts',
        data: {
          count: 0,
          results: [],
        },
      };
    }
  }
}

export default new OcraiService();

