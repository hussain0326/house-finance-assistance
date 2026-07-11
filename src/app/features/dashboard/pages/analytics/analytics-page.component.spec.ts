import { AnalyticsPageComponent } from './analytics-page.component';

describe('AnalyticsPageComponent', () => {
  it('should create', () => {
    const component = new AnalyticsPageComponent();
    expect(component).toBeTruthy();
  });

  it('should define chart options', () => {
    const component = new AnalyticsPageComponent();

    expect(component.categoryChartOptions).toBeTruthy();
    expect(component.comparisonChartOptions).toBeTruthy();
  });
});
