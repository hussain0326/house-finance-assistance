import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';

@Component({
  selector: 'app-analytics-page',
  imports: [MatCardModule, NgxEchartsDirective, MatIconModule],
  templateUrl: './analytics-page.component.html',
  styleUrl: './analytics-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsPageComponent {
  readonly categoryChartOptions: EChartsCoreOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: 'Spending',
        type: 'pie',
        radius: ['38%', '70%'],
        avoidLabelOverlap: true,
        data: [
          { value: 680, name: 'Groceries' },
          { value: 350, name: 'Traveling' },
          { value: 420, name: 'Utilities' },
          { value: 220, name: 'Healthcare' },
          { value: 172, name: 'Shopping' }
        ]
      }
    ]
  };

  readonly comparisonChartOptions: EChartsCoreOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        type: 'bar',
        data: [1400, 1520, 1470, 1640, 1705, 1635, 1842],
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
  };
}
