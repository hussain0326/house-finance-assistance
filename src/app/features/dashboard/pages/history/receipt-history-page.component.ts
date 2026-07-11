import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ReceiptHistoryItem, ReceiptService } from '../../services/receipt.service';

@Component({
  selector: 'app-receipt-history-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    CurrencyPipe,
    DatePipe
  ],
  templateUrl: './receipt-history-page.component.html',
  styleUrl: './receipt-history-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptHistoryPageComponent {
  readonly pageSize = signal(10);
  readonly pageIndex = signal(0);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly items = signal<ReceiptHistoryItem[]>([]);
  readonly feedback = signal('');

  readonly editingId = signal<string | null>(null);
  readonly editMerchant = signal('');
  readonly editAmount = signal<number | null>(null);

  readonly filterForm;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly receiptService: ReceiptService
  ) {
    this.filterForm = this.formBuilder.group({
      search: [''],
      receiptDate: [null as Date | null]
    });

    void this.loadPage();
  }

  async applyFilters(): Promise<void> {
    this.pageIndex.set(0);
    await this.loadPage();
  }

  async resetFilters(): Promise<void> {
    this.filterForm.reset({ search: '', receiptDate: null });
    this.pageIndex.set(0);
    await this.loadPage();
  }

  async onPageChange(event: PageEvent): Promise<void> {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    await this.loadPage();
  }

  trackById(_: number, item: ReceiptHistoryItem): string {
    return item.id;
  }

  startEdit(item: ReceiptHistoryItem): void {
    this.editingId.set(item.id);
    this.editMerchant.set(item.merchant_name ?? '');
    this.editAmount.set(item.total_amount ?? null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editMerchant.set('');
    this.editAmount.set(null);
  }

  async saveEdit(item: ReceiptHistoryItem): Promise<void> {
    const result = await this.receiptService.updateReceipt(item.id, {
      merchant_name: this.editMerchant().trim() || null,
      total_amount: this.editAmount() ?? null,
      receipt_date: item.receipt_date,
      currency: item.currency
    });

    if (!result.success) {
      this.feedback.set(result.message);
      return;
    }

    this.cancelEdit();
    await this.loadPage();
  }

  onEditMerchantChange(value: string): void {
    this.editMerchant.set(value);
  }

  onEditAmountChange(value: string): void {
    const parsed = Number(value);
    this.editAmount.set(Number.isFinite(parsed) ? parsed : null);
  }

  private async loadPage(): Promise<void> {
    this.loading.set(true);
    this.feedback.set('');

    const filters = this.filterForm.getRawValue();
    const selectedDate = filters.receiptDate
      ? new Date(filters.receiptDate).toISOString().slice(0, 10)
      : undefined;

    const { items, total } = await this.receiptService.getReceiptHistory({
      page: this.pageIndex() + 1,
      pageSize: this.pageSize(),
      search: filters.search ?? undefined,
      startDate: selectedDate,
      endDate: selectedDate
    });

    this.items.set(items);
    this.total.set(total);

    if (!items.length) {
      this.feedback.set('No receipts found for the selected filters.');
    }

    this.loading.set(false);
  }
}
