import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { AuthService } from '../../../core/auth/auth.service';

type UploadResult = {
  success: boolean;
  message: string;
  receiptId?: string;
};

export type ReceiptUploadInput = {
  merchantName?: string;
  totalAmount?: number;
  receiptDate?: string;
  currency?: string;
};

export type ReceiptHistoryItem = {
  id: string;
  image_url: string;
  merchant_name: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  currency: string;
  processing_status: string;
  created_at: string;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  total_count: number;
  signed_image_url?: string;
};

export type ReceiptHistoryQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
};

export type DashboardSummary = {
  monthly_spend: number;
  annual_spend: number;
  average_daily_spend: number;
};

export type DashboardTrendPoint = {
  month_label: string;
  month_date: string;
  total_amount: number;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export type AnalyticsCategoryPoint = {
  category_name: string;
  total_amount: number;
  color?: string | null;
};

export type AnalyticsMonthPoint = {
  month_label: string;
  month_date: string;
  total_amount: number;
};

export type SpendingAnalytics = {
  category_breakdown: AnalyticsCategoryPoint[];
  monthly_comparison: AnalyticsMonthPoint[];
};

export type FilteredAnalyticsQuery = {
  merchant?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
};

export type FilteredAnalyticsMonth = {
  month_label: string;
  month_date: string;
  total_amount: number;
};

export type FilteredAnalyticsResult = {
  total_amount: number;
  receipt_count: number;
  monthly_breakdown: FilteredAnalyticsMonth[];
};

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private readonly bucketName = 'receipt-images';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly authService?: AuthService
  ) {}

  async getDashboardSummary(): Promise<DashboardSummary> {
    const { data, error } = await this.supabaseService.client.rpc('get_dashboard_summary', {
      p_target_currency: this.targetCurrency
    });
    if (error || !data || data.length === 0) {
      return {
        monthly_spend: 0,
        annual_spend: 0,
        average_daily_spend: 0
      };
    }

    const row = data[0] as DashboardSummary;
    return {
      monthly_spend: Number(row.monthly_spend ?? 0),
      annual_spend: Number(row.annual_spend ?? 0),
      average_daily_spend: Number(row.average_daily_spend ?? 0)
    };
  }

  async getDashboardTrend(monthsBack = 7): Promise<DashboardTrendPoint[]> {
    const { data, error } = await this.supabaseService.client.rpc('get_dashboard_trend', {
      months_back: monthsBack,
      p_target_currency: this.targetCurrency
    });

    if (error || !data) {
      return [];
    }

    return (data as DashboardTrendPoint[]).map((item) => ({
      ...item,
      total_amount: Number(item.total_amount ?? 0)
    }));
  }

  async getCategories(): Promise<ExpenseCategory[]> {
    const { data, error } = await this.supabaseService.client
      .from('categories')
      .select('id, name, icon, color')
      .order('name');

    if (error || !data) {
      return [];
    }

    return data as ExpenseCategory[];
  }

  async getSpendingAnalytics(monthsBack = 7): Promise<SpendingAnalytics> {
    const { data, error } = await this.supabaseService.client.rpc('get_spending_analytics', {
      months_back: monthsBack,
      p_target_currency: this.targetCurrency
    });

    if (error || !data) {
      return { category_breakdown: [], monthly_comparison: [] };
    }

    const result = data as Partial<SpendingAnalytics>;
    return {
      category_breakdown: (result.category_breakdown ?? []).map((item) => ({
        ...item,
        total_amount: Number(item.total_amount ?? 0)
      })),
      monthly_comparison: (result.monthly_comparison ?? []).map((item) => ({
        ...item,
        total_amount: Number(item.total_amount ?? 0)
      }))
    };
  }

  async getFilteredAnalytics(query: FilteredAnalyticsQuery): Promise<FilteredAnalyticsResult> {
    const { data, error } = await this.supabaseService.client.rpc('get_filtered_analytics', {
      p_merchant: query.merchant?.trim() ? query.merchant.trim() : null,
      p_category_id: query.categoryId || null,
      p_start_date: query.startDate ?? null,
      p_end_date: query.endDate ?? null,
      p_target_currency: this.targetCurrency
    });

    if (error || !data) {
      return { total_amount: 0, receipt_count: 0, monthly_breakdown: [] };
    }

    const result = data as Partial<FilteredAnalyticsResult>;
    return {
      total_amount: Number(result.total_amount ?? 0),
      receipt_count: Number(result.receipt_count ?? 0),
      monthly_breakdown: (result.monthly_breakdown ?? []).map((item) => ({
        ...item,
        total_amount: Number(item.total_amount ?? 0)
      }))
    };
  }

  async processReceipt(receiptId: string): Promise<{
    success: boolean;
    message: string;
    receipt?: { merchant: string | null; date: string | null; currency: string | null; totalAmount: number | null };
  }> {
    try {
      const { data, error } = await this.supabaseService.client.functions.invoke('process-receipt', {
        body: { receiptId }
      });

      if (error) {
        const details = await this.readFunctionError(error);
        return {
          success: false,
          message: details
            ? `Receipt uploaded, but OCR processing failed: ${details}`
            : 'Receipt uploaded, but OCR processing failed.'
        };
      }

      return {
        success: true,
        message: 'Receipt processed. Merchant, date, totals, and currency have been saved.',
        receipt: data?.receipt
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unexpected OCR processing error.';
      return { success: false, message: `Receipt uploaded, but OCR processing failed: ${details}` };
    }
  }

  private async readFunctionError(error: { message?: string; context?: Response }): Promise<string> {
    const response = error.context;
    if (response) {
      try {
        const payload = (await response.clone().json()) as { error?: string; message?: string };
        const responseMessage = payload.error ?? payload.message;
        if (responseMessage) {
          return responseMessage;
        }
      } catch {
        // Fall back to the SDK error when the function did not return JSON.
      }
    }

    return error.message?.trim() ?? '';
  }

  async getReceiptHistory(query: ReceiptHistoryQuery): Promise<{ items: ReceiptHistoryItem[]; total: number }> {
    const { data, error } = await this.supabaseService.client.rpc('get_receipt_history', {
      p_page: query.page,
      p_page_size: query.pageSize,
      p_search: query.search?.trim() ? query.search.trim() : null,
      p_status: query.status?.trim() ? query.status.trim() : null,
      p_start_date: query.startDate ?? null,
      p_end_date: query.endDate ?? null,
      p_category_id: query.categoryId || null,
      p_target_currency: this.targetCurrency
    });

    if (error || !data) {
      return { items: [], total: 0 };
    }

    const rows = data as ReceiptHistoryItem[];
    const withUrls = await Promise.all(
      rows.map(async (item) => {
        const { data: signedData } = await this.supabaseService.client.storage
          .from(this.bucketName)
          .createSignedUrl(item.image_url, 60 * 30);

        return {
          ...item,
          total_amount: item.total_amount === null ? null : Number(item.total_amount),
          signed_image_url: signedData?.signedUrl
        };
      })
    );

    const total = rows[0]?.total_count ?? 0;
    return { items: withUrls, total };
  }

  async uploadReceipt(file: File, input?: ReceiptUploadInput): Promise<UploadResult> {
    const {
      data: { user },
      error: userError
    } = await this.supabaseService.client.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'Please sign in to upload receipts.' };
    }

    const receiptId = crypto.randomUUID();
    const extension = this.extractFileExtension(file.name);
    const filePath = `${user.id}/${receiptId}.${extension}`;

    // Read into memory before upload: some mobile browsers (iOS Safari/Chrome)
    // send a 0-byte body when a File object is passed directly as the fetch body.
    const fileBuffer = await file.arrayBuffer();
    if (fileBuffer.byteLength === 0) {
      return { success: false, message: 'The selected file is empty. Please retake the photo and try again.' };
    }

    const { error: uploadError } = await this.supabaseService.client.storage
      .from(this.bucketName)
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      return { success: false, message: this.mapStorageError(uploadError.message) };
    }

    const metadata = {
      id: receiptId,
      user_id: user.id,
      image_url: filePath,
      merchant_name: input?.merchantName?.trim() || null,
      receipt_date: input?.receiptDate || new Date().toISOString().slice(0, 10),
      total_amount:
        typeof input?.totalAmount === 'number' && Number.isFinite(input.totalAmount)
          ? Number(input.totalAmount)
          : null,
      currency: input?.currency?.trim() || 'EUR',
      processing_status: 'uploaded',
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await this.supabaseService.client.from('receipts').insert(metadata);

    if (insertError) {
      return {
        success: false,
        message:
          insertError.code === '42P01'
            ? 'Uploaded to storage. Receipts table is not created yet.'
            : insertError.message
      };
    }

    return {
      success: true,
      message: 'Receipt uploaded successfully.',
      receiptId
    };
  }

  async updateReceipt(
    receiptId: string,
    changes: {
      merchant_name?: string | null;
      total_amount?: number | null;
      receipt_date?: string | null;
      currency?: string | null;
      category_id?: string | null;
    }
  ): Promise<{ success: boolean; message: string }> {
    const payload = {
      merchant_name: changes.merchant_name ?? null,
      total_amount: changes.total_amount ?? null,
      receipt_date: changes.receipt_date ?? null,
      currency: changes.currency ?? 'EUR',
      category_id: changes.category_id ?? null
    };

    const { error } = await this.supabaseService.client
      .from('receipts')
      .update(payload)
      .eq('id', receiptId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Receipt details updated.' };
  }

  async deleteReceipts(receiptIds: string[]): Promise<{ success: boolean; message: string }> {
    if (!receiptIds.length) {
      return { success: false, message: 'No receipts selected.' };
    }

    const { data: rows, error: fetchError } = await this.supabaseService.client
      .from('receipts')
      .select('id, image_url')
      .in('id', receiptIds);

    if (fetchError) {
      return { success: false, message: fetchError.message };
    }

    const imagePaths = (rows ?? []).map((row) => row.image_url).filter(Boolean);
    if (imagePaths.length) {
      await this.supabaseService.client.storage.from(this.bucketName).remove(imagePaths);
    }

    const { error: deleteError } = await this.supabaseService.client
      .from('receipts')
      .delete()
      .in('id', receiptIds);

    if (deleteError) {
      return { success: false, message: deleteError.message };
    }

    return {
      success: true,
      message: receiptIds.length === 1 ? 'Receipt deleted.' : `${receiptIds.length} receipts deleted.`
    };
  }

  private extractFileExtension(fileName: string): string {
    const value = fileName.split('.').pop()?.toLowerCase();
    if (!value || !['jpg', 'jpeg', 'png', 'pdf'].includes(value)) {
      return 'jpg';
    }
    return value;
  }

  private get targetCurrency(): string {
    return this.authService?.getProfile().defaultCurrency ?? 'EUR';
  }

  private mapStorageError(message: string): string {
    const value = message.toLowerCase();
    if (value.includes('bucket not found')) {
      return 'Storage bucket "receipt-images" not found. Create it in Supabase Storage first.';
    }
    if (value.includes('row-level security')) {
      return 'Upload blocked by RLS policy. Please configure storage policies.';
    }
    return message;
  }
}
