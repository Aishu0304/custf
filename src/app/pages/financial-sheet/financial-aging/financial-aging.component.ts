import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-financial-sheet-aging',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
    MatSortModule,
    MatTooltipModule
  ],
  templateUrl: './financial-aging.component.html',
  styleUrls: ['./financial-aging.component.scss'],
  providers: [DatePipe]
})
export class FinancialAgingComponent implements OnInit {
  agings: Aging[] = [];
  filteredAgings: Aging[] = [];
  displayedColumns: string[] = ['billingDoc', 'dueDate', 'netValue', 'currency', 'paymentStatus', 'aging', 'actions'];
  isLoading: boolean = false;
  error: string = '';

  // Filters
  searchText: string = '';
  statusFilter: string = '';
  currencyFilter: string = '';
  paymentStatuses: string[] = [];
  currencies: string[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const kunnr = localStorage.getItem('customerId');
      if (kunnr) {
        this.loadAgingData(kunnr);
      } else {
        this.error = 'Customer ID not found. Please log in.';
        this.snackBar.open(this.error, 'Close', { duration: 5000 });
        this.router.navigate(['/login']);
      }
    }
  }

  loadAgingData(kunnr: string): void {
    this.isLoading = true;
    this.http.post<any>('http://localhost:3000/aging', { CUSTNO: kunnr }).subscribe({
      next: (response) => {
        if (response.status === 'S' && response.agingDetails) {
          this.agings = response.agingDetails.map((item: any) => ({
            billingDoc: item.billingDoc,
            billingDate: item.billingDate,
            dueDate: item.dueDate,
            aging: item.aging,
            paymentStatus: item.paymentStatus,
            netValue: item.netValue,
            currency: item.currency,
            paymentTerms: item.paymentTerms,
            customer: item.customer,
            salesOrg: item.salesOrg,
            distChannel: item.distChannel,
            rawDueDate: new Date(item.dueDate),
            rawNetValue: parseFloat(item.netValue)
          }));
          this.filteredAgings = [...this.agings];
          this.paymentStatuses = [...new Set(this.agings.map(a => a.paymentStatus))];
          this.currencies = [...new Set(this.agings.map(a => a.currency))];
        } else {
          this.error = response.message || 'Failed to load aging data.';
          this.snackBar.open(this.error, 'Close', { duration: 5000 });
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Unable to load aging data.';
        this.snackBar.open(this.error, 'Close', { duration: 5000 });
        console.error(err);
        this.isLoading = false;
      }
    });
  }
 hoveredRow: string | null = null;
  selectedInvoice: Aging | null = null;
  

/**
 * Shows details of a specific invoice in a modal/dialog view
 * @param invoice The invoice/aging record to display
 */
viewDetails(invoice: Aging): void {
  this.selectedInvoice = invoice;
}

/**
 * Closes the invoice details view
 */
closeDetails(): void {
  this.selectedInvoice = null;
}

  // Add these properties to your component class
showAgingBucketFilter: boolean = true;
agingBucketFilter: string = '';

// Update the applyFilters method
applyFilters(): void {
  this.filteredAgings = this.agings.filter(a => {
    // Search by billing doc or customer name
    const matchesSearch = !this.searchText ||
      a.billingDoc.toLowerCase().includes(this.searchText.toLowerCase()) ||
      (a.customer && a.customer.toLowerCase().includes(this.searchText.toLowerCase()));

    // Payment status filter
    const matchesStatus = !this.statusFilter || a.paymentStatus === this.statusFilter;
    
    // Currency filter
    const matchesCurrency = !this.currencyFilter || a.currency === this.currencyFilter;
    
    // Aging bucket filter
    const matchesAgingBucket = !this.agingBucketFilter || this.checkAgingBucket(a.aging, this.agingBucketFilter);

    return matchesSearch && matchesStatus && matchesCurrency && matchesAgingBucket;
  });
}

// Add this helper method to check aging buckets
private checkAgingBucket(aging: string, bucket: string): boolean {
  const days = parseInt(aging);
  
  switch (bucket) {
    case 'current': return days < 0;
    case '1-30': return days >= 0 && days <= 30;
    case '31-60': return days > 30 && days <= 60;
    case '61-90': return days > 60 && days <= 90;
    case '90+': return days > 90;
    default: return true;
  }
}

// Update the clearFilters method
clearFilters(): void {
  this.searchText = '';
  this.statusFilter = '';
  this.currencyFilter = '';
  this.agingBucketFilter = '';
  this.filteredAgings = [...this.agings];
}

  sortData(sort: Sort): void {
    const data = [...this.filteredAgings];
    if (!sort.active || sort.direction === '') {
      this.filteredAgings = data;
      return;
    }

    this.filteredAgings = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'billingDoc': return compare(a.billingDoc, b.billingDoc, isAsc);
        case 'dueDate': return compare(a.rawDueDate!, b.rawDueDate!, isAsc);
        case 'netValue': return compare(a.rawNetValue!, b.rawNetValue!, isAsc);
        case 'paymentStatus': return compare(a.paymentStatus, b.paymentStatus, isAsc);
        case 'aging': return compare(parseInt(a.aging), parseInt(b.aging), isAsc);
        default: return 0;
      }
    });
  }

 
  formatDate(date: string): string {
    return this.datePipe.transform(date, 'dd/MM/yyyy') || 'N/A';
  }

  formatAmount(amount: string, currency: string): string {
    if (!amount || !currency) return 'N/A';
    const num = parseFloat(amount);
    return `${currency} ${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  getPaymentStatusClass(status: string, aging: string): string {
    const days = parseInt(aging);

    if (status === 'Paid') return 'paid';
    if (status === 'Partial') return 'partial';

    if (days < 0) return 'not-due';

    if (days > 30) return 'overdue';
    return 'due';
  }

  getPaymentStatusIcon(status: string, aging: string): string {
    const statusClass = this.getPaymentStatusClass(status, aging);

    switch (statusClass) {
      case 'paid': return 'check_circle';
      case 'not-due': return 'event_available';
      case 'due': return 'event_busy';
      case 'overdue': return 'warning';
      case 'partial': return 'pie_chart';
      default: return 'help';
    }
  }

  getPaymentStatusText(status: string, aging: string): string {
    const days = parseInt(aging);

    if (status === 'Paid') return 'Paid';
    if (status === 'Partial') return 'Partial Payment';

    if (days < 0) return 'Not Due';

    if (days > 30) return `Overdue (${days}d)`;
    return 'Due';
  }

  isPastDue(aging: string): boolean {
    return parseInt(aging) > 0;
  }

  getDaysOverdue(aging: string): number {
    return Math.max(0, parseInt(aging));
  }

  getAgingClass(aging: string): string {
    const days = parseInt(aging);

    if (days < 0) return 'current';
    if (days <= 30) return 'overdue-30';
    if (days <= 60) return 'overdue-60';
    if (days <= 90) return 'overdue-90';
    return 'overdue-120';
  }
}

interface Aging {
  billingDoc: string;
  billingDate: string;
  dueDate: string;
  aging: string;
  paymentStatus: string;
  netValue: string;
  currency: string;
  paymentTerms: string;
  customer: string;
  salesOrg: string;
  distChannel: string;
  rawDueDate?: Date;
  rawNetValue?: number;
}


function compare(a: number | string | Date, b: number | string | Date, isAsc: boolean): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}