import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  ExpenseCategory,
  FilteredAnalyticsMonth,
  ReceiptService
} from '../../services/receipt.service';

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
  selector: 'app-analytics-page',
  imports: [
    MatCardModule,
    NgxEchartsDirective,
    MatIconModule,
    CurrencyPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './analytics-page.component.html',
  styleUrl: './analytics-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsPageComponent {
  readonly loading = signal(true);
  readonly feedback = signal('');
  readonly categoryTotal = signal(0);
  readonly monthlyTotal = signal(0);
  readonly currencyCode = () => this.authService?.getProfile().defaultCurrency ?? 'EUR';

  readonly categories = signal<ExpenseCategory[]>([]);
  readonly months = MONTHS;
  readonly years = this.buildYearOptions();

  readonly filterForm;
  readonly filterLoading = signal(false);
  readonly filterApplied = signal(false);
  readonly filterTotal = signal(0);
  readonly filterCount = signal(0);
  readonly filterBreakdown = signal<FilteredAnalyticsMonth[]>([]);
  readonly filterFeedback = signal('');

  readonly categoryChartOptions = signal<EChartsCoreOption>({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: 'Spending',
        type: 'pie',
        radius: ['38%', '70%'],
        avoidLabelOverlap: true,
        data: []
      }
    ]
  });

  readonly comparisonChartOptions = signal<EChartsCoreOption>({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: []
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        type: 'bar',
        data: [],
        itemStyle: {
          borderRadius: [6, 6, 0, 0]
        }
      }
    ],
    grid: {
      left: 20,
      right: 20,
      top: 20,
      bottom: 20,
      containLabel: true
    }
  });

  constructor(
    private readonly formBuilder?: FormBuilder,
    private readonly receiptService?: ReceiptService,
    private readonly authService?: AuthService
  ) {
    this.filterForm = (this.formBuilder ?? new FormBuilder()).group({
      merchant: [''],
      categoryId: [''],
      year: [''],
      month: ['']
    });

    if (receiptService) {
      void this.loadAnalytics();
      void this.loadCategories();
    }
  }

  async applyFilters(): Promise<void> {
    const filters = this.filterForm.getRawValue();
    const { startDate, endDate } = this.resolveDateRange(filters.year, filters.month);

    this.filterLoading.set(true);
    this.filterFeedback.set('');

    const result = await this.receiptService!.getFilteredAnalytics({
      merchant: filters.merchant ?? undefined,
      categoryId: filters.categoryId ?? undefined,
      startDate,
      endDate
    });

    this.filterTotal.set(result.total_amount);
    this.filterCount.set(result.receipt_count);
    this.filterBreakdown.set(result.monthly_breakdown);
    this.filterApplied.set(true);
    this.filterLoading.set(false);

    if (!result.receipt_count) {
      this.filterFeedback.set('No receipts match these filters.');
    }
  }

  resetFilters(): void {
    this.filterForm.reset({ merchant: '', categoryId: '', year: '', month: '' });
    this.filterApplied.set(false);
    this.filterFeedback.set('');
    this.filterBreakdown.set([]);
    this.filterTotal.set(0);
    this.filterCount.set(0);
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

  private buildYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }

  private async loadCategories(): Promise<void> {
    this.categories.set(await this.receiptService!.getCategories());
  }

  private async loadAnalytics(): Promise<void> {
    const result = await this.receiptService!.getSpendingAnalytics();
    const categoryData = result.category_breakdown.map((item) => ({
      value: item.total_amount,
      name: item.category_name,
      itemStyle: item.color ? { color: item.color } : undefined
    }));

    this.categoryTotal.set(categoryData.reduce((total, item) => total + Number(item.value), 0));
    this.monthlyTotal.set(
      result.monthly_comparison.at(-1)?.total_amount ?? 0
    );
    this.categoryChartOptions.set({
      ...this.categoryChartOptions(),
      series: [{
        name: 'Spending',
        type: 'pie',
        radius: ['38%', '70%'],
        avoidLabelOverlap: true,
        data: categoryData
      }]
    });
    this.comparisonChartOptions.set({
      ...this.comparisonChartOptions(),
      xAxis: { type: 'category', data: result.monthly_comparison.map((item) => item.month_label) },
      series: [{
        type: 'bar',
        data: result.monthly_comparison.map((item) => item.total_amount),
        itemStyle: { borderRadius: [6, 6, 0, 0] }
      }]
    });
    this.loading.set(false);
    if (!categoryData.length && !result.monthly_comparison.length) {
      this.feedback.set('Analytics will appear after categorized expenses are available.');
    }
  }
}

