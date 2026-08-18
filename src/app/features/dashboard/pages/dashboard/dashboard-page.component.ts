import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsCoreOption } from 'echarts/core';
import { ReceiptService } from '../../services/receipt.service';
import { AuthService } from '../../../../core/auth/auth.service';

type Expense = {
  readonly merchant: string;
  readonly category: string;
  readonly amount: number;
  readonly date: string;
};

@Component({
  selector: 'app-dashboard-page',
  imports: [MatCardModule, CurrencyPipe, DatePipe, NgxEchartsDirective, MatIconModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  readonly monthlySpend = signal(0);
  readonly annualSpend = signal(0);
  readonly avgSpend = signal(0);
  readonly loading = signal(true);
  readonly recentExpenses = signal<Expense[]>([]);

  readonly profile = () => this.authService.getProfile();

  readonly trendChartOptions = signal<EChartsCoreOption>({
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        data: [],
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.15
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
    private readonly receiptService: ReceiptService,
    private readonly authService: AuthService
  ) {
    void this.loadDashboard();
  }

  private async loadDashboard(): Promise<void> {
    const [summary, trend, history] = await Promise.all([
      this.receiptService.getDashboardSummary(),
      this.receiptService.getDashboardTrend(7),
      this.receiptService.getReceiptHistory({ page: 1, pageSize: 5 })
    ]);

    this.monthlySpend.set(summary.monthly_spend);
    this.annualSpend.set(summary.annual_spend);
    this.avgSpend.set(summary.average_daily_spend);

    this.recentExpenses.set(
      history.items.map((item) => ({
        merchant: item.merchant_name ?? 'Unknown Merchant',
        category: item.processing_status,
        amount: item.total_amount ?? 0,
        date: item.receipt_date ?? item.created_at
      }))
    );

    this.trendChartOptions.set({
      ...this.trendChartOptions(),
      xAxis: {
        type: 'category',
        data: trend.map((item) => item.month_label)
      },
      series: [
        {
          data: trend.map((item) => item.total_amount),
          type: 'line',
          smooth: true,
          areaStyle: {
            opacity: 0.15
          }
        }
      ]
    });

    this.loading.set(false);
  }
}
