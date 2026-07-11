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
      })
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

  it('should initialize filter form without status control', () => {
    const fixture = TestBed.createComponent(ReceiptHistoryPageComponent);
    const component = fixture.componentInstance;
    const controlKeys = Object.keys(component.filterForm.controls);

    expect(controlKeys).toContain('search');
    expect(controlKeys).toContain('receiptDate');
    expect(controlKeys).not.toContain('status');
  });
});
