import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { forkJoin } from 'rxjs';
import { SafeDatePipe } from '../../../pipes/safe-date.pipe';
import { CustomerService } from '../../../../services/customer.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-financial-overall',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    NgChartsModule,
    MatTabsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatGridListModule,
    SafeDatePipe,
    MatIconModule
  ],
  templateUrl: './financial-overall.component.html',
  styleUrls: ['./financial-overall.component.scss'],
  providers: [DatePipe]
})
export class FinancialOverallComponent implements OnInit {
  // Data arrays
  salesOrders: any[] = [];
  inquiries: any[] = [];
  deliveries: any[] = [];
  agingDetails: any[] = [];
  
  isLoading: boolean = true;
  error: string = '';
  dateRange: string = 'month';
  activeTab: number = 0;

  // Summary KPIs
  summaryKPIs = {
    totalInquiries: 0,
    totalSalesOrders: 0,
    totalDeliveries: 0,
    totalRevenue: 0,
    outstandingPayments: 0,
    overduePayments: 0,
    avgOrderValue: 0,
    deliveryRate: 0
  };

  // Inquiry Analytics Charts
  inquiryTrendChart: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Monthly Inquiries',
      borderColor: '#3f51b5',
      backgroundColor: 'rgba(63, 81, 181, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  inquiryTypeChart: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50']
    }]
  };

  inquiryValueChart: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Inquiry Value by Type',
      backgroundColor: 'rgba(63, 81, 181, 0.7)',
      borderColor: '#3f51b5',
      borderWidth: 1
    }]
  };

  // Sales Order Analytics Charts
  salesTrendChart: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Monthly Sales Revenue',
      borderColor: '#4caf50',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  salesVolumeChart: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Order Volume',
      backgroundColor: 'rgba(76, 175, 80, 0.7)',
      borderColor: '#4caf50',
      borderWidth: 1
    }]
  };

  salesDistributionChart: ChartData<'pie'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107']
    }]
  };

  // Delivery Analytics Charts
  deliveryStatusChart: ChartData<'doughnut'> = {
    labels: ['Completed', 'Pending', 'In Transit'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#4caf50', '#ff9800', '#2196f3']
    }]
  };

  deliveryTrendChart: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Monthly Deliveries',
      borderColor: '#ff9800',
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  deliveryPerformanceChart: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'On-Time Delivery Rate (%)',
      backgroundColor: 'rgba(255, 152, 0, 0.7)',
      borderColor: '#ff9800',
      borderWidth: 1
    }]
  };

  // Aging Analytics Charts
  agingDistributionChart: ChartData<'doughnut'> = {
    labels: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
    datasets: [{
      data: [0, 0, 0, 0, 0],
      backgroundColor: ['#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#9c27b0']
    }]
  };

  agingTrendChart: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Overdue Amount Trend',
      borderColor: '#f44336',
      backgroundColor: 'rgba(244, 67, 54, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  agingAmountChart: ChartConfiguration<'bar'>['data'] = {
    labels: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
    datasets: [{
      data: [0, 0, 0, 0, 0],
      label: 'Amount by Aging Period',
      backgroundColor: ['#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#9c27b0'],
      borderWidth: 1
    }]
  };

  // Chart Options
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { 
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: {
        grid: { display: false }
      }
    },
    plugins: {
      legend: { 
        display: true,
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  };

  doughnutOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
      this.showError('Customer ID not found');
      this.isLoading = false;
      return;
    }

    forkJoin({
      salesOrders: this.http.post<any>('http://localhost:3000/salesorder', { CUSTNO: customerId }),
      inquiries: this.http.post<any>('http://localhost:3000/inquiry', { CUSTNO: customerId }),
      deliveries: this.http.post<any>('http://localhost:3000/delivery', { CUSTNO: customerId }),
      agingDetails: this.http.post<any>('http://localhost:3000/aging', { CUSTNO: customerId })
    }).subscribe({
      next: (responses) => {
        this.processApiResponses(responses);
        this.calculateSummaryKPIs();
        this.updateAllCharts();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('API Error:', err);
        this.showError('Failed to load data. Please try again.');
        this.isLoading = false;
      }
    });
  }

  private processApiResponses(responses: any): void {
    // Process Sales Orders
    this.salesOrders = responses.salesOrders?.salesOrders || [];
    
    // Process Inquiries
    this.inquiries = responses.inquiries?.inquiries || [];
    
    // Process Deliveries
    this.deliveries = Array.isArray(responses.deliveries?.delivery) 
      ? responses.deliveries.delivery 
      : responses.deliveries?.delivery ? [responses.deliveries.delivery] : [];
    
    // Process Aging Details
    this.agingDetails = responses.agingDetails?.agingDetails || [];
  }

  calculateSummaryKPIs(): void {
    // Basic counts
    this.summaryKPIs.totalInquiries = this.inquiries.length;
    this.summaryKPIs.totalSalesOrders = this.salesOrders.length;
    this.summaryKPIs.totalDeliveries = this.deliveries.length;

    // Revenue calculations
    this.summaryKPIs.totalRevenue = this.salesOrders.reduce((sum, order) => 
      sum + (parseFloat(order.netValue) || 0), 0);

    this.summaryKPIs.avgOrderValue = this.salesOrders.length > 0 
      ? this.summaryKPIs.totalRevenue / this.salesOrders.length : 0;

    // Payment calculations
    this.summaryKPIs.outstandingPayments = this.agingDetails.reduce((sum, item) => 
      sum + (parseFloat(item.netValue) || 0), 0);

    this.summaryKPIs.overduePayments = this.agingDetails
      .filter(item => parseInt(item.aging) > 0)
      .reduce((sum, item) => sum + (parseFloat(item.netValue) || 0), 0);

    // Delivery rate
    const completedDeliveries = this.deliveries.filter(delivery => 
      (delivery.status || delivery.overallStatus || delivery.GBSTK || '').toString().toUpperCase() === 'C').length;
    
    this.summaryKPIs.deliveryRate = this.deliveries.length > 0 
      ? (completedDeliveries / this.deliveries.length) * 100 : 0;
  }

  updateAllCharts(): void {
    this.updateInquiryCharts();
    this.updateSalesOrderCharts();
    this.updateDeliveryCharts();
    this.updateAgingCharts();
  }

  updateInquiryCharts(): void {
    // Inquiry Trend Chart
    const monthlyInquiries = this.groupByMonth(this.inquiries, 'createdDate');
    this.inquiryTrendChart = {
      labels: Object.keys(monthlyInquiries),
      datasets: [{
        data: Object.values(monthlyInquiries),
        label: 'Monthly Inquiries',
        borderColor: '#3f51b5',
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };

    // Inquiry Type Distribution
    const typeDistribution = this.groupByField(this.inquiries, 'docType');
    this.inquiryTypeChart = {
      labels: Object.keys(typeDistribution),
      datasets: [{
        data: Object.values(typeDistribution),
        backgroundColor: ['#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50']
      }]
    };

    // Inquiry Value by Type
    const valueByType = this.inquiries.reduce((acc: any, inquiry) => {
      const type = inquiry.docType || 'Unknown';
      acc[type] = (acc[type] || 0) + (parseFloat(inquiry.netValue) || 0);
      return acc;
    }, {});

    this.inquiryValueChart = {
      labels: Object.keys(valueByType),
      datasets: [{
        data: Object.values(valueByType),
        label: 'Total Value by Type',
        backgroundColor: 'rgba(63, 81, 181, 0.7)',
        borderColor: '#3f51b5',
        borderWidth: 1
      }]
    };
  }

  updateSalesOrderCharts(): void {
    // Sales Trend Chart
    const monthlySales = this.groupByMonthWithSum(this.salesOrders, 'orderDate', 'netValue');
    this.salesTrendChart = {
      labels: Object.keys(monthlySales),
      datasets: [{
        data: Object.values(monthlySales),
        label: 'Monthly Sales Revenue',
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };

    // Sales Volume Chart
    const monthlyVolume = this.groupByMonth(this.salesOrders, 'orderDate');
    this.salesVolumeChart = {
      labels: Object.keys(monthlyVolume),
      datasets: [{
        data: Object.values(monthlyVolume),
        label: 'Order Volume',
        backgroundColor: 'rgba(76, 175, 80, 0.7)',
        borderColor: '#4caf50',
        borderWidth: 1
      }]
    };

    // Sales Distribution by Document Type
    const salesByType = this.groupByField(this.salesOrders, 'documentType');
    this.salesDistributionChart = {
      labels: Object.keys(salesByType),
      datasets: [{
        data: Object.values(salesByType),
        backgroundColor: ['#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107']
      }]
    };
  }

  updateDeliveryCharts(): void {
    // Delivery Status Chart
    const statusCounts = {
      completed: this.deliveries.filter(d => 
        (d.overallStatus || d.GBSTK || d.status || '').toString().toUpperCase() === 'C').length,
      pending: this.deliveries.filter(d => 
        (d.overallStatus || d.GBSTK || d.status || '').toString().toUpperCase() === 'P').length,
      inTransit: this.deliveries.filter(d => 
        (d.overallStatus || d.GBSTK || d.status || '').toString().toUpperCase() === 'A').length
    };

    this.deliveryStatusChart = {
      labels: ['Completed', 'Pending', 'In Transit'],
      datasets: [{
        data: [statusCounts.completed, statusCounts.pending, statusCounts.inTransit],
        backgroundColor: ['#4caf50', '#ff9800', '#2196f3']
      }]
    };

    // Delivery Trend Chart
    const monthlyDeliveries = this.groupByMonth(this.deliveries, 'deliveryDate');
    this.deliveryTrendChart = {
      labels: Object.keys(monthlyDeliveries),
      datasets: [{
        data: Object.values(monthlyDeliveries),
        label: 'Monthly Deliveries',
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };

    // Delivery Performance Chart (On-time rate by month)
    const performanceByMonth = Object.keys(monthlyDeliveries).map(month => {
      const monthDeliveries = this.deliveries.filter(d => {
        const deliveryMonth = this.formatMonth(d.deliveryDate);
        return deliveryMonth === month;
      });
      
      const onTimeDeliveries = monthDeliveries.filter(d => 
        (d.overallStatus || d.GBSTK || d.status || '').toString().toUpperCase() === 'C').length;
      
      return monthDeliveries.length > 0 ? (onTimeDeliveries / monthDeliveries.length) * 100 : 0;
    });

    this.deliveryPerformanceChart = {
      labels: Object.keys(monthlyDeliveries),
      datasets: [{
        data: performanceByMonth,
        label: 'On-Time Delivery Rate (%)',
        backgroundColor: 'rgba(255, 152, 0, 0.7)',
        borderColor: '#ff9800',
        borderWidth: 1
      }]
    };
  }

  updateAgingCharts(): void {
    // Aging Distribution Chart
    const agingBuckets = {
      current: this.agingDetails.filter(item => parseInt(item.aging) < 0).length,
      '1-30': this.agingDetails.filter(item => {
        const aging = parseInt(item.aging);
        return aging >= 0 && aging <= 30;
      }).length,
      '31-60': this.agingDetails.filter(item => {
        const aging = parseInt(item.aging);
        return aging > 30 && aging <= 60;
      }).length,
      '61-90': this.agingDetails.filter(item => {
        const aging = parseInt(item.aging);
        return aging > 60 && aging <= 90;
      }).length,
      '90+': this.agingDetails.filter(item => parseInt(item.aging) > 90).length
    };

    this.agingDistributionChart = {
      labels: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
      datasets: [{
        data: Object.values(agingBuckets),
        backgroundColor: ['#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#9c27b0']
      }]
    };

    // Aging Amount Chart
    const agingAmounts = {
      current: this.agingDetails.filter(item => parseInt(item.aging) < 0)
        .reduce((sum, item) => sum + (parseFloat(item.netValue) || 0), 0),
      '1-30': this.agingDetails.filter(item => {
        const aging = parseInt(item.aging);
        return aging >= 0 && aging <= 30;
      }).reduce((sum, item) => sum + (parseFloat(item.netValue) || 0), 0),
      '31-60': this.agingDetails.filter(item => {
        const aging = parseInt(item.aging);
        return aging > 30 && aging <= 60;
      }).reduce((sum, item) => sum + (parseFloat(item.netValue) || 0), 0),
      '61-90': this.agingDetails.filter(item => {
        const aging = parseInt(item.aging);
        return aging > 60 && aging <= 90;
      }).reduce((sum, item) => sum + (parseFloat(item.netValue) || 0), 0),
      '90+': this.agingDetails.filter(item => parseInt(item.aging) > 90)
        .reduce((sum, item) => sum + (parseFloat(item.netValue) || 0), 0)
    };

    this.agingAmountChart = {
      labels: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
      datasets: [{
        data: Object.values(agingAmounts),
        label: 'Amount by Aging Period',
        backgroundColor: ['#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#9c27b0'],
        borderWidth: 1
      }]
    };

    // Aging Trend Chart (monthly overdue amounts)
    const monthlyOverdue = this.groupByMonthWithSum(
      this.agingDetails.filter(item => parseInt(item.aging) > 0), 
      'dueDate', 
      'netValue'
    );

    this.agingTrendChart = {
      labels: Object.keys(monthlyOverdue),
      datasets: [{
        data: Object.values(monthlyOverdue),
        label: 'Monthly Overdue Amount',
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  }

  // Helper methods
  private groupByMonth(data: any[], dateField: string): { [key: string]: number } {
    return data.reduce((acc: any, item) => {
      const month = this.formatMonth(item[dateField]);
      if (month !== 'Invalid Date') {
        acc[month] = (acc[month] || 0) + 1;
      }
      return acc;
    }, {});
  }

  private groupByMonthWithSum(data: any[], dateField: string, valueField: string): { [key: string]: number } {
    return data.reduce((acc: any, item) => {
      const month = this.formatMonth(item[dateField]);
      if (month !== 'Invalid Date') {
        acc[month] = (acc[month] || 0) + (parseFloat(item[valueField]) || 0);
      }
      return acc;
    }, {});
  }

  private groupByField(data: any[], field: string): { [key: string]: number } {
    return data.reduce((acc: any, item) => {
      const value = item[field] || 'Unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private formatMonth(dateString: string): string {
    try {
      if (!dateString || dateString === '0000-00-00') return 'Invalid Date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return this.datePipe.transform(date, 'MMM yyyy') || 'Invalid Date';
    } catch {
      return 'Invalid Date';
    }
  }

  formatCurrency(value: number, currency: string = 'USD'): string {
    return `${currency} ${value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  setDateRange(range: string): void {
    this.dateRange = range;
    // Implement date filtering logic if needed
    this.updateAllCharts();
  }
}