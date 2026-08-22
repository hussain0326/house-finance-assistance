import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ExpenseCategory, ExpenseCountry, ReceiptHistoryItem, ReceiptService } from '../../services/receipt.service';

const MONTHS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' }
];

@Component({
  selector: 'app-receipt-history-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
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
  readonly categories = signal<ExpenseCategory[]>([]);
  readonly countries = signal<ExpenseCountry[]>([]);

  readonly months = MONTHS;
  readonly years = this.buildYearOptions();

  readonly editingId = signal<string | null>(null);
  readonly editMerchant = signal('');
  readonly editAddress = signal('');
  readonly editCity = signal('');
  readonly editPostalCode = signal('');
  readonly editAmount = signal<number | null>(null);
  readonly editDate = signal('');
  readonly editCategoryId = signal<string | null>(null);
  readonly editCountryCode = signal<string | null>(null);
  readonly failedPreviewIds = signal<Set<string>>(new Set());

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly deleting = signal(false);

  readonly filterForm;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly receiptService: ReceiptService
  ) {
    this.filterForm = this.formBuilder.group({
      search: [''],
      categoryId: [''],
      year: [''],
      month: ['']
    });

    void this.loadPage();
    void this.loadCategories();
    void this.loadCountries();
  }

  async applyFilters(): Promise<void> {
    this.pageIndex.set(0);
    await this.loadPage();
  }

  async resetFilters(): Promise<void> {
    this.filterForm.reset({ search: '', categoryId: '', year: '', month: '' });
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

  isPdfReceipt(item: ReceiptHistoryItem): boolean {
    return item.image_url.toLowerCase().endsWith('.pdf');
  }

  isImagePreviewUnavailable(item: ReceiptHistoryItem): boolean {
    return !item.signed_image_url || this.failedPreviewIds().has(item.id);
  }

  markPreviewFailed(item: ReceiptHistoryItem): void {
    const next = new Set(this.failedPreviewIds());
    next.add(item.id);
    this.failedPreviewIds.set(next);
  }

  startEdit(item: ReceiptHistoryItem): void {
    this.editingId.set(item.id);
    this.editMerchant.set(item.merchant_name ?? '');
    this.editAddress.set(item.merchant_address ?? '');
    this.editCity.set(item.merchant_city ?? '');
    this.editPostalCode.set(item.merchant_postal_code ?? '');
    this.editAmount.set(item.total_amount ?? null);
    this.editDate.set(item.receipt_date ?? '');
    this.editCategoryId.set(item.category_id);
    this.editCountryCode.set(item.country_code);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editMerchant.set('');
    this.editAddress.set('');
    this.editCity.set('');
    this.editPostalCode.set('');
    this.editAmount.set(null);
    this.editDate.set('');
    this.editCategoryId.set(null);
    this.editCountryCode.set(null);
  }

  async saveEdit(item: ReceiptHistoryItem): Promise<void> {
    const result = await this.receiptService.updateReceipt(item.id, {
      merchant_name: this.editMerchant().trim() || null,
      merchant_address: this.editAddress().trim() || null,
      merchant_city: this.editCity().trim() || null,
      merchant_postal_code: this.editPostalCode().trim() || null,
      total_amount: this.editAmount() ?? null,
      receipt_date: this.editDate() || null,
      currency: item.currency,
      category_id: this.editCategoryId(),
      country_code: this.editCountryCode(),
      country_name: this.countryNameForCode(this.editCountryCode())
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

  onEditAddressChange(value: string): void {
    this.editAddress.set(value);
  }

  onEditCityChange(value: string): void {
    this.editCity.set(value);
  }

  onEditPostalCodeChange(value: string): void {
    this.editPostalCode.set(value);
  }

  onEditAmountChange(value: string): void {
    const parsed = Number(value);
    this.editAmount.set(Number.isFinite(parsed) ? parsed : null);
  }

  onEditDateChange(value: string): void {
    this.editDate.set(value);
  }

  onEditCategoryChange(value: string): void {
    this.editCategoryId.set(value || null);
  }

  onEditCountryChange(value: string): void {
    this.editCountryCode.set(value || null);
  }

  isSelected(item: ReceiptHistoryItem): boolean {
    return this.selectedIds().has(item.id);
  }

  toggleSelection(item: ReceiptHistoryItem, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) {
      next.add(item.id);
    } else {
      next.delete(item.id);
    }
    this.selectedIds.set(next);
  }

  isAllSelected(): boolean {
    const items = this.items();
    return items.length > 0 && items.every((item) => this.selectedIds().has(item.id));
  }

  toggleSelectAll(checked: boolean): void {
    this.selectedIds.set(checked ? new Set(this.items().map((item) => item.id)) : new Set());
  }

  async deleteReceipt(item: ReceiptHistoryItem): Promise<void> {
    if (!confirm(`Delete the receipt from ${item.merchant_name || 'this merchant'}?`)) {
      return;
    }
    await this.deleteByIds([item.id]);
  }

  async deleteSelected(): Promise<void> {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) {
      return;
    }
    if (!confirm(`Delete ${ids.length} selected receipt(s)?`)) {
      return;
    }
    await this.deleteByIds(ids);
  }

  private async deleteByIds(ids: string[]): Promise<void> {
    this.deleting.set(true);
    const result = await this.receiptService.deleteReceipts(ids);
    this.deleting.set(false);
    this.feedback.set(result.message);

    if (result.success) {
      const next = new Set(this.selectedIds());
      ids.forEach((id) => next.delete(id));
      this.selectedIds.set(next);
      await this.loadPage();
    }
  }

  private async loadCategories(): Promise<void> {
    this.categories.set(await this.receiptService.getCategories());
  }

  private async loadCountries(): Promise<void> {
    this.countries.set(await this.receiptService.getCountries());
  }

  private countryNameForCode(code: string | null): string | null {
    return this.countries().find((country) => country.code === code)?.name ?? null;
  }

  private buildYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }

  private resolveDateRange(
    year: string | null,
    month: string | null
  ): { startDate?: string; endDate?: string } {
    if (!year) {
      return {};
    }

    const yearNumber = Number(year);
    if (month === '' || month === null || month === undefined) {
      return {
        startDate: `${yearNumber}-01-01`,
        endDate: `${yearNumber}-12-31`
      };
    }

    const monthNumber = Number(month);
    const startDate = new Date(Date.UTC(yearNumber, monthNumber, 1)).toISOString().slice(0, 10);
    const endDate = new Date(Date.UTC(yearNumber, monthNumber + 1, 0)).toISOString().slice(0, 10);
    return { startDate, endDate };
  }

  private async loadPage(): Promise<void> {
    this.loading.set(true);
    this.feedback.set('');
    this.selectedIds.set(new Set());
    this.failedPreviewIds.set(new Set());

    const filters = this.filterForm.getRawValue();
    const { startDate, endDate } = this.resolveDateRange(filters.year, filters.month);

    const { items, total } = await this.receiptService.getReceiptHistory({
      page: this.pageIndex() + 1,
      pageSize: this.pageSize(),
      search: filters.search ?? undefined,
      categoryId: filters.categoryId ?? undefined,
      startDate,
      endDate
    });

    this.items.set(items);
    this.total.set(total);

    if (!items.length) {
      this.feedback.set('No receipts found for the selected filters.');
    }

    this.loading.set(false);
  }
}
