import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  it('should create', () => {
    const receiptService = {
      getDashboardSummary: jasmine.createSpy('getDashboardSummary').and.resolveTo({
        monthly_spend: 100,
        annual_spend: 1200,
        average_daily_spend: 10
      }),
      getDashboardTrend: jasmine
        .createSpy('getDashboardTrend')
        .and.resolveTo([{ month_label: 'Jan', month_date: '2026-01-01', total_amount: 100 }]),
      getReceiptHistory: jasmine.createSpy('getReceiptHistory').and.resolveTo({
        items: [],
        total: 0
      })
    };

    const component = new DashboardPageComponent(receiptService as any);
    expect(component).toBeTruthy();
  });
});
