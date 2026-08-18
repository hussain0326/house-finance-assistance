import { TestBed } from '@angular/core/testing';
import { ReceiptPageComponent } from './receipt-page.component';
import { ReceiptService } from '../../services/receipt.service';

describe('ReceiptPageComponent', () => {
  let receiptService: any;

  beforeEach(async () => {
    receiptService = {
      uploadReceipt: jasmine.createSpy('uploadReceipt').and.resolveTo({
        success: true,
        message: 'ok',
        receiptId: 'receipt-1'
      }),
      processReceipt: jasmine.createSpy('processReceipt').and.resolveTo({
        success: true,
        message: 'processing'
      })
    };

    await TestBed.configureTestingModule({
      imports: [ReceiptPageComponent],
      providers: [{ provide: ReceiptService, useValue: receiptService }]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ReceiptPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should keep selectedFile null when no files selected', () => {
    const fixture = TestBed.createComponent(ReceiptPageComponent);
    const component = fixture.componentInstance;
    const event = { target: { files: [] } } as unknown as Event;

    component.onFileSelected(event);

    expect(component.selectedFile()).toBeNull();
  });
});
