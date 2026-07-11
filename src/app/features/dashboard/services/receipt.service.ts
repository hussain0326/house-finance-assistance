import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';

type UploadResult = {
  success: boolean;
  message: string;
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

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private readonly bucketName = 'receipt-images';

  constructor(private readonly supabaseService: SupabaseService) {}

  async getDashboardSummary(): Promise<DashboardSummary> {
    const { data, error } = await this.supabaseService.client.rpc('get_dashboard_summary');
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
      months_back: monthsBack
    });

    if (error || !data) {
      return [];
    }

    return (data as DashboardTrendPoint[]).map((item) => ({
      ...item,
      total_amount: Number(item.total_amount ?? 0)
    }));
  }

  async getReceiptHistory(query: ReceiptHistoryQuery): Promise<{ items: ReceiptHistoryItem[]; total: number }> {
    const { data, error } = await this.supabaseService.client.rpc('get_receipt_history', {
      p_page: query.page,
      p_page_size: query.pageSize,
      p_search: query.search?.trim() ? query.search.trim() : null,
      p_status: query.status?.trim() ? query.status.trim() : null,
      p_start_date: query.startDate ?? null,
      p_end_date: query.endDate ?? null
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

    const { error: uploadError } = await this.supabaseService.client.storage
      .from(this.bucketName)
      .upload(filePath, file, {
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
      message: 'Receipt uploaded successfully.'
    };
  }

  async updateReceipt(
    receiptId: string,
    changes: {
      merchant_name?: string | null;
      total_amount?: number | null;
      receipt_date?: string | null;
      currency?: string | null;
    }
  ): Promise<{ success: boolean; message: string }> {
    const payload = {
      merchant_name: changes.merchant_name ?? null,
      total_amount: changes.total_amount ?? null,
      receipt_date: changes.receipt_date ?? null,
      currency: changes.currency ?? 'EUR'
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

  private extractFileExtension(fileName: string): string {
    const value = fileName.split('.').pop()?.toLowerCase();
    if (!value || !['jpg', 'jpeg', 'png', 'pdf'].includes(value)) {
      return 'jpg';
    }
    return value;
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
