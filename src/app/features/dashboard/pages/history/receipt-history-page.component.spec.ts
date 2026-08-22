import { TestBed } from '@angular/core/testing';
import { ReceiptHistoryPageComponent } from './receipt-history-page.component';
import { ReceiptService } from '../../services/receipt.service';

describe('ReceiptHistoryPageComponent', () => {
  let receiptService: any;

  beforeEach(async () => {
    receiptService = {
      getReceiptHistory: jasmine.createSpy('getReceiptHistory').and.resolveTo({
        items: [],
        total: 0
      }),
      updateReceipt: jasmine.createSpy('updateReceipt').and.resolveTo({
        success: true,
        message: 'ok'
      }),
      deleteReceipts: jasmine.createSpy('deleteReceipts').and.resolveTo({
        success: true,
        message: 'Receipt deleted.'
      }),
      getCategories: jasmine.createSpy('getCategories').and.resolveTo([])
    };

    await TestBed.configureTestingModule({
      imports: [ReceiptHistoryPageComponent],
      providers: [{ provide: ReceiptService, useValue: receiptService }]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ReceiptHistoryPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize filter form with merchant, category, year, and month controls', () => {
    const fixture = TestBed.createComponent(ReceiptHistoryPageComponent);
    const component = fixture.componentInstance;
    const controlKeys = Object.keys(component.filterForm.controls);

    expect(controlKeys).toContain('search');
    expect(controlKeys).toContain('categoryId');
    expect(controlKeys).toContain('year');
    expect(controlKeys).toContain('month');
    expect(controlKeys).not.toContain('status');
  });

  it('should delete selected receipts after confirmation', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const fixture = TestBed.createComponent(ReceiptHistoryPageComponent);
    const component = fixture.componentInstance;

    component.toggleSelection({ id: 'receipt-1' } as any, true);
    await component.deleteSelected();

    expect(receiptService.deleteReceipts).toHaveBeenCalledWith(['receipt-1']);
  });

  it('should save corrected receipt details', async () => {
    const fixture = TestBed.createComponent(ReceiptHistoryPageComponent);
    const component = fixture.componentInstance;
    const item = {
      id: 'receipt-1',
      merchant_name: 'Old merchant',
      total_amount: 12,
      receipt_date: '2026-08-19',
      currency: 'EUR',
      category_id: 'old-category'
    } as any;

    component.startEdit(item);
    component.onEditMerchantChange('New merchant');
    component.onEditAmountChange('15.5');
    component.onEditDateChange('2026-08-20');
    component.onEditCategoryChange('new-category');
    await component.saveEdit(item);

    expect(receiptService.updateReceipt).toHaveBeenCalledWith('receipt-1', {
      merchant_name: 'New merchant',
      total_amount: 15.5,
      receipt_date: '2026-08-20',
      currency: 'EUR',
      category_id: 'new-category'
    });
  });
});
