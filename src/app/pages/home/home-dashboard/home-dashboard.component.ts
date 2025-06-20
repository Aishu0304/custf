import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './home-dashboard.component.html',
  styleUrls: ['./home-dashboard.component.scss']
})
export class HomeDashboardComponent implements OnInit {
  isLoading = true;
  error = '';
  
  // KPI Data
  inquiryKPIs = {
    total: 0,
    thisMonth: 0,
    avgValue: 0,
    topDocType: 'N/A'
  };

  salesOrderKPIs = {
    total: 0,
    totalValue: 0,
    avgOrderValue: 0,
    pendingOrders: 0
  };

  deliveryKPIs = {
    total: 0,
    completed: 0,
    pending: 0,
    onTimeRate: 0
  };

  invoiceKPIs = {
    total: 0,
    totalAmount: 0,
    avgAmount: 0,
    currency: 'USD'
  };

  agingKPIs = {
    total: 0,
    overdue: 0,
    overdueAmount: 0,
    avgAgingDays: 0
  };

  creditDebitKPIs = {
    creditMemos: 0,
    debitMemos: 0,
    creditAmount: 0,
    debitAmount: 0
  };

  // Recent activities
  recentActivities: any[] = [];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const customerId = localStorage.getItem('customerId');
      if (customerId) {
        this.loadDashboardData(customerId);
      } else {
        this.error = 'Customer ID not found. Please log in.';
        this.isLoading = false;
      }
    }
  }

  loadDashboardData(customerId: string): void {
    this.isLoading = true;
    
    // Fetch all data in parallel
    forkJoin({
      inquiries: this.http.post<any>('http://localhost:3000/inquiry', { CUSTNO: customerId }),
      salesOrders: this.http.post<any>('http://localhost:3000/salesorder', { CUSTNO: customerId }),
      deliveries: this.http.post<any>('http://localhost:3000/delivery', { CUSTNO: customerId }),
      invoices: this.http.post<any>('http://localhost:3000/invoice1', { CUSTNO: customerId }),
      aging: this.http.post<any>('http://localhost:3000/aging', { CUSTNO: customerId }),
      creditMemos: this.http.post<any>('http://localhost:3000/credit', { CUSTNO: customerId }),
      debitMemos: this.http.post<any>('http://localhost:3000/debit', { CUSTNO: customerId })
    }).subscribe({
      next: (responses) => {
        this.processInquiryData(responses.inquiries);
        this.processSalesOrderData(responses.salesOrders);
        this.processDeliveryData(responses.deliveries);
        this.processInvoiceData(responses.invoices);
        this.processAgingData(responses.aging);
        this.processCreditDebitData(responses.creditMemos, responses.debitMemos);
        this.generateRecentActivities(responses);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Dashboard data loading error:', err);
        this.error = 'Failed to load dashboard data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  processInquiryData(response: any): void {
    if (response.status === 'S' && response.inquiries) {
      const inquiries = response.inquiries;
      this.inquiryKPIs.total = inquiries.length;
      
      // Calculate this month's inquiries
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      this.inquiryKPIs.thisMonth = inquiries.filter((inquiry: any) => {
        const inquiryDate = new Date(inquiry.createdDate);
        return inquiryDate.getMonth() === currentMonth && inquiryDate.getFullYear() === currentYear;
      }).length;

      // Calculate average value
      const totalValue = inquiries.reduce((sum: number, inquiry: any) => 
        sum + (parseFloat(inquiry.netValue) || 0), 0);
      this.inquiryKPIs.avgValue = inquiries.length > 0 ? totalValue / inquiries.length : 0;

      // Find top document type
      const docTypes = inquiries.reduce((acc: any, inquiry: any) => {
        acc[inquiry.docType] = (acc[inquiry.docType] || 0) + 1;
        return acc;
      }, {});
      this.inquiryKPIs.topDocType = Object.keys(docTypes).reduce((a, b) => 
        docTypes[a] > docTypes[b] ? a : b, 'N/A');
    }
  }

  processSalesOrderData(response: any): void {
    if (response.status === 'S' && response.salesOrders) {
      const salesOrders = response.salesOrders;
      this.salesOrderKPIs.total = salesOrders.length;
      
      // Calculate total value
      this.salesOrderKPIs.totalValue = salesOrders.reduce((sum: number, order: any) => 
        sum + (parseFloat(order.netValue) || 0), 0);
      
      // Calculate average order value
      this.salesOrderKPIs.avgOrderValue = salesOrders.length > 0 ? 
        this.salesOrderKPIs.totalValue / salesOrders.length : 0;
      
      // Count pending orders (assuming orders without delivery are pending)
      this.salesOrderKPIs.pendingOrders = salesOrders.filter((order: any) => 
        !order.deliveryStatus || order.deliveryStatus !== 'Completed').length;
    }
  }

  processDeliveryData(response: any): void {
    if (response.status === 'S' && response.delivery) {
      const deliveries = Array.isArray(response.delivery) ? response.delivery : [response.delivery];
      this.deliveryKPIs.total = deliveries.length;
      
      // Count completed deliveries
      this.deliveryKPIs.completed = deliveries.filter((delivery: any) => 
        (delivery.status || delivery.overallStatus || delivery.GBSTK || '').toString().toUpperCase() === 'C').length;
      
      // Count pending deliveries
      this.deliveryKPIs.pending = this.deliveryKPIs.total - this.deliveryKPIs.completed;
      
      // Calculate on-time delivery rate
      this.deliveryKPIs.onTimeRate = this.deliveryKPIs.total > 0 ? 
        (this.deliveryKPIs.completed / this.deliveryKPIs.total) * 100 : 0;
    }
  }

  processInvoiceData(response: any): void {
    if (response.status === 'S' && response.agingDetails) {
      const invoices = response.agingDetails;
      this.invoiceKPIs.total = invoices.length;
      
      // Calculate total amount
      this.invoiceKPIs.totalAmount = invoices.reduce((sum: number, invoice: any) => 
        sum + (parseFloat(invoice.netValue) || 0), 0);
      
      // Calculate average amount
      this.invoiceKPIs.avgAmount = invoices.length > 0 ? 
        this.invoiceKPIs.totalAmount / invoices.length : 0;
      
      // Get currency from first invoice
      this.invoiceKPIs.currency = invoices[0]?.currency || 'USD';
    }
  }

  processAgingData(response: any): void {
    if (response.status === 'S' && response.agingDetails) {
      const agingDetails = response.agingDetails;
      this.agingKPIs.total = agingDetails.length;
      
      // Count overdue items
      this.agingKPIs.overdue = agingDetails.filter((item: any) => 
        parseInt(item.aging) > 0).length;
      
      // Calculate overdue amount
      this.agingKPIs.overdueAmount = agingDetails
        .filter((item: any) => parseInt(item.aging) > 0)
        .reduce((sum: number, item: any) => sum + (parseFloat(item.netValue) || 0), 0);
      
      // Calculate average aging days
      const totalAgingDays = agingDetails.reduce((sum: number, item: any) => 
        sum + (parseInt(item.aging) || 0), 0);
      this.agingKPIs.avgAgingDays = agingDetails.length > 0 ? 
        totalAgingDays / agingDetails.length : 0;
    }
  }

  processCreditDebitData(creditResponse: any, debitResponse: any): void {
    // Process credit memos
    if (creditResponse.status === 'S' && creditResponse.creditDetails) {
      this.creditDebitKPIs.creditMemos = creditResponse.creditDetails.length;
      this.creditDebitKPIs.creditAmount = creditResponse.creditDetails.reduce((sum: number, memo: any) => 
        sum + (parseFloat(memo.netValue) || 0), 0);
    }
    
    // Process debit memos
    if (debitResponse.status === 'S' && debitResponse.creditDetails) {
      this.creditDebitKPIs.debitMemos = debitResponse.creditDetails.length;
      this.creditDebitKPIs.debitAmount = debitResponse.creditDetails.reduce((sum: number, memo: any) => 
        sum + (parseFloat(memo.netValue) || 0), 0);
    }
  }

  generateRecentActivities(responses: any): void {
    this.recentActivities = [];
    
    // Add recent deliveries
    if (responses.deliveries?.delivery) {
      const deliveries = Array.isArray(responses.deliveries.delivery) ? 
        responses.deliveries.delivery : [responses.deliveries.delivery];
      
      deliveries.slice(0, 2).forEach((delivery: any) => {
        this.recentActivities.push({
          type: 'delivery',
          title: `Delivery #${delivery.deliveryNumber}`,
          description: `Material: ${delivery.materialNumber}`,
          time: this.formatDate(delivery.deliveryDate),
          icon: 'local_shipping',
          status: delivery.status === 'C' ? 'completed' : 'processing'
        });
      });
    }
    
    // Add recent sales orders
    if (responses.salesOrders?.salesOrders) {
      responses.salesOrders.salesOrders.slice(0, 2).forEach((order: any) => {
        this.recentActivities.push({
          type: 'order',
          title: `Sales Order #${order.salesOrderNumber}`,
          description: `Value: ${order.currency} ${order.netValue}`,
          time: this.formatDate(order.orderDate),
          icon: 'receipt',
          status: 'processing'
        });
      });
    }
    
    // Sort by most recent
    this.recentActivities.sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime());
    
    // Keep only top 4 activities
    this.recentActivities = this.recentActivities.slice(0, 4);
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return `${currency} ${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatDate(dateString: string): string {
    if (!dateString || dateString === '0000-00-00') return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  }

  getChangeClass(current: number, previous: number): string {
    if (current > previous) return 'positive';
    if (current < previous) return 'negative';
    return 'neutral';
  }

  getChangeIcon(current: number, previous: number): string {
    if (current > previous) return 'arrow_upward';
    if (current < previous) return 'arrow_downward';
    return 'remove';
  }
}