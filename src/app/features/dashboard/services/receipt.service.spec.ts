import { ReceiptService } from './receipt.service';

describe('ReceiptService', () => {
  let service: ReceiptService;
  let mockSupabaseService: any;

  beforeEach(() => {
    mockSupabaseService = {
      client: {
        rpc: jasmine.createSpy('rpc'),
        from: jasmine.createSpy('from'),
        auth: {
          getUser: jasmine.createSpy('getUser')
        },
        storage: {
          from: jasmine.createSpy('storageFrom').and.returnValue({
            createSignedUrl: jasmine
              .createSpy('createSignedUrl')
              .and.resolveTo({ data: { signedUrl: 'https://signed' } }),
            upload: jasmine.createSpy('upload').and.resolveTo({ error: null })
          })
        }
      }
    };

    service = new ReceiptService(mockSupabaseService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('getDashboardSummary should return fallback zeros on error', async () => {
    mockSupabaseService.client.rpc.and.resolveTo({ data: null, error: { message: 'fail' } });

    const result = await service.getDashboardSummary();

    expect(result).toEqual({
      monthly_spend: 0,
      annual_spend: 0,
      average_daily_spend: 0
    });
  });

  it('getDashboardTrend should map amounts to numbers', async () => {
    mockSupabaseService.client.rpc.and.resolveTo({
      data: [{ month_label: 'Jan', month_date: '2026-01-01', total_amount: '12.5' }],
      error: null
    });

    const result = await service.getDashboardTrend(1);

    expect(result.length).toBe(1);
    expect(result[0].total_amount).toBe(12.5);
  });

  it('uploadReceipt should fail when user is not authenticated', async () => {
    mockSupabaseService.client.auth.getUser.and.resolveTo({
      data: { user: null },
      error: null
    });

    const result = await service.uploadReceipt(new File(['a'], 'receipt.png', { type: 'image/png' }));

    expect(result.success).toBeFalse();
    expect(result.message).toContain('Please sign in');
  });

  it('updateReceipt should return success when update has no error', async () => {
    const updateSpy = jasmine.createSpy('update').and.returnValue({
      eq: () => Promise.resolve({ error: null })
    });
    mockSupabaseService.client.from.and.returnValue({
      update: updateSpy
    });

    const result = await service.updateReceipt('id-1', {
      merchant_name: 'Store',
      category_id: 'category-1'
    });

    expect(result.success).toBeTrue();
    expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({ category_id: 'category-1' }));
  });
});
