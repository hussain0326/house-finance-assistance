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
      getCategories: jasmine.createSpy('getCategories').and.resolveTo([]),
      getCountries: jasmine.createSpy('getCountries').and.resolveTo([{ code: 'DK', name: 'Denmark' }])
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

  it('should initialize filter form with merchant, category, country, year, and month controls', () => {
    const fixture = TestBed.createComponent(ReceiptHistoryPageComponent);
    const component = fixture.componentInstance;
    const controlKeys = Object.keys(component.filterForm.controls);

    expect(controlKeys).toContain('search');
    expect(controlKeys).toContain('categoryId');
    expect(controlKeys).toContain('countryCode');
    expect(controlKeys).toContain('year');
    expect(controlKeys).toContain('month');
    expect(controlKeys).not.toContain('status');
  });

  it('should pass countryCode filter to receiptService.getReceiptHistory when applied', async () => {
    const fixture = TestBed.createComponent(ReceiptHistoryPageComponent);
    const component = fixture.componentInstance;
    component.filterForm.controls.countryCode.setValue('DK');

    await component.applyFilters();

    expect(receiptService.getReceiptHistory).toHaveBeenCalledWith(
      jasmine.objectContaining({ countryCode: 'DK' })
    );
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
      merchant_address: 'Old street 1',
      merchant_city: 'Old city',
      merchant_postal_code: '1000',
      total_amount: 12,
      receipt_date: '2026-08-19',
      currency: 'EUR',
      category_id: 'old-category',
      country_code: 'DK',
      country_name: 'Denmark'
    } as any;

    component.startEdit(item);
    component.onEditMerchantChange('New merchant');
    component.onEditAddressChange('New street 2');
    component.onEditCityChange('Copenhagen');
    component.onEditPostalCodeChange('1702');
    component.onEditAmountChange('15.5');
    component.onEditDateChange('2026-08-20');
    component.onEditCategoryChange('new-category');
    component.onEditCountryChange('DK');
    await component.saveEdit(item);

    expect(receiptService.updateReceipt).toHaveBeenCalledWith('receipt-1', {
      merchant_name: 'New merchant',
      merchant_address: 'New street 2',
      merchant_city: 'Copenhagen',
      merchant_postal_code: '1702',
      total_amount: 15.5,
      receipt_date: '2026-08-20',
      currency: 'EUR',
      category_id: 'new-category',
      country_code: 'DK',
      country_name: 'Denmark'
    });
  });
});
