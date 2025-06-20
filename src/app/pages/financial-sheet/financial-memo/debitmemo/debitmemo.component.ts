import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-debitmemo',
  standalone: true,
  imports: [
    CommonModule,
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
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './debitmemo.component.html',
  styleUrls: ['./debitmemo.component.scss'],
  providers: [DatePipe]
})
export class DebitmemoComponent implements OnInit {
  creditMemos: CreditMemo[] = [];
  filteredCreditMemos: CreditMemo[] = [];
  displayedColumns: string[] = [
    'billingDoc', 'docType', 'billingDate', 'materialNo', 
    'itemNo', 'netValue', 'currency', 'salesOrg', 
    'customer', 'actions'
  ];
  isLoading: boolean = false;
  error: string = '';
  hoveredRow: string | null = null;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  // Filters
  searchText: string = '';
  docTypeFilter: string = '';
  salesOrgFilter: string = '';
  dateRangeFilter: { start: Date | null; end: Date | null } = { start: null, end: null };
  currencyFilter: string = '';

  // Filter options
  docTypes: string[] = [];
  salesOrgs: string[] = [];
  currencies: string[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const kunnr = localStorage.getItem('customerId');
      if (kunnr) {
        this.loadCreditMemos(kunnr);
      } else {
        this.error = 'Customer ID not found. Please log in.';
        this.snackBar.open(this.error, 'Close', { duration: 5000 });
        this.router.navigate(['/login']);
      }
    }
  }

  loadCreditMemos(kunnr: string): void {
    this.isLoading = true;
    this.error = '';

    this.http.post<any>('http://localhost:3000/debit', { CUSTNO: kunnr }).subscribe({
      next: (response) => {
        if (response.status === 'S' && response.creditDetails) {
          this.creditMemos = this.mapCreditMemoData(response.creditDetails);
          this.filteredCreditMemos = [...this.creditMemos];
          this.updateFilterOptions();
          this.calculateTotalPages();
        } else {
          this.error = response.message || 'No credit memos found';
          this.snackBar.open(this.error, 'Close', { duration: 5000 });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('API Error:', err);
        this.error = 'Failed to load credit memos. Please try again.';
        this.snackBar.open(this.error, 'Close', { duration: 5000 });
        this.isLoading = false;
      }
    });
  }

  private mapCreditMemoData(data: any[]): CreditMemo[] {
    return data.map((item: any) => ({
      billingDoc: item.billingDoc || '',
      docType: item.docType || '',
      billingCategory: item.billingCategory || '',
      salesDocCat: item.salesDocCat || '',
      salesOrg: item.salesOrg || '',
      customer: item.customer || '',
      currency: item.currency || '',
      pricingProc: item.pricingProc || '',
      pricingNumber: item.pricingNumber || '',
      billingDate: item.billingDate || '',
      exchangeRate: item.exchangeRate || '',
      netValue: parseFloat(item.netValue || '0'),
      entryTime: item.entryTime || '',
      entryDate: item.entryDate || '',
      poNumber: item.poNumber || '',
      materialNo: item.materialNo || '',
      itemNo: item.itemNo || '',
      salesUnit: item.salesUnit || '',
      rawBillingDate: item.billingDate ? new Date(item.billingDate) : null,
      rawNetValue: parseFloat(item.netValue || '0')
    }));
  }

  private updateFilterOptions(): void {
    this.docTypes = [...new Set(this.creditMemos.map(d => d.docType))];
    this.salesOrgs = [...new Set(this.creditMemos.map(d => d.salesOrg))];
    this.currencies = [...new Set(this.creditMemos.map(d => d.currency))];
  }

  // Pagination methods
  get paginatedCreditMemos(): CreditMemo[] {
    if (!this.filteredCreditMemos?.length) return [];
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredCreditMemos.slice(startIndex, startIndex + this.itemsPerPage);
  }
// Add this to your component class
selectedInvoice: any = null;

showDetails(invoice: any): void {
  this.selectedInvoice = invoice;
}

closeDetails(): void {
  this.selectedInvoice = null;
}
  getDisplayRange(): string {
    if (!this.filteredCreditMemos?.length) return '0 items';
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredCreditMemos.length);
    return `Showing ${start} - ${end} of ${this.filteredCreditMemos.length} items`;
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredCreditMemos.length / this.itemsPerPage) || 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.calculateTotalPages();
  }

  // Filter methods
  applyFilters(): void {
    this.currentPage = 1;
    if (!this.creditMemos) {
      this.filteredCreditMemos = [];
      return;
    }
    
    this.filteredCreditMemos = this.creditMemos.filter(memo => {
      const matchesSearch = !this.searchText || 
        memo.billingDoc.toLowerCase().includes(this.searchText.toLowerCase()) ||
        memo.materialNo.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesDocType = !this.docTypeFilter || 
        memo.docType === this.docTypeFilter;

      const matchesSalesOrg = !this.salesOrgFilter || 
        memo.salesOrg === this.salesOrgFilter;

      const matchesCurrency = !this.currencyFilter || 
        memo.currency === this.currencyFilter;

      let matchesDateRange = true;
      if ((this.dateRangeFilter.start || this.dateRangeFilter.end) && memo.rawBillingDate) {
        const memoDate = memo.rawBillingDate;
        const start = this.dateRangeFilter.start ? new Date(this.dateRangeFilter.start) : null;
        const end = this.dateRangeFilter.end ? new Date(this.dateRangeFilter.end) : null;
        
        if (start && memoDate < start) matchesDateRange = false;
        if (end && memoDate > end) matchesDateRange = false;
      }

      return matchesSearch && matchesDocType && matchesSalesOrg && 
             matchesCurrency && matchesDateRange;
    });

    this.calculateTotalPages();
  }

  clearFilters(): void {
    this.searchText = '';
    this.docTypeFilter = '';
    this.salesOrgFilter = '';
    this.currencyFilter = '';
    this.dateRangeFilter = { start: null, end: null };
    this.filteredCreditMemos = [...this.creditMemos];
    this.currentPage = 1;
    this.calculateTotalPages();
  }

  // Sorting
  sortData(sort: Sort): void {
    if (!sort.active || sort.direction === '') {
      this.filteredCreditMemos = [...this.filteredCreditMemos];
      return;
    }

    this.filteredCreditMemos = this.filteredCreditMemos.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'billingDoc': return compare(a.billingDoc, b.billingDoc, isAsc);
        case 'docType': return compare(a.docType, b.docType, isAsc);
        case 'billingDate': return compare(a.rawBillingDate || 0, b.rawBillingDate || 0, isAsc);
        case 'materialNo': return compare(a.materialNo, b.materialNo, isAsc);
        case 'itemNo': return compare(a.itemNo, b.itemNo, isAsc);
        case 'netValue': return compare(a.netValue, b.netValue, isAsc);
        case 'currency': return compare(a.currency, b.currency, isAsc);
        case 'salesOrg': return compare(a.salesOrg, b.salesOrg, isAsc);
        default: return 0;
      }
    });
  }

  // View details
  viewDetails(billingDoc: string, itemNo: string): void {
    if (!billingDoc || !itemNo) {
      this.snackBar.open('No credit memo selected', 'Close', { duration: 3000 });
      return;
    }

    const memo = this.creditMemos.find(m => 
      m.billingDoc === billingDoc && m.itemNo === itemNo);
      
    this.router.navigate(['/home/dashboard/credit-memo', billingDoc, itemNo], {
      state: { memoData: memo }
    });
  }

  // Formatting helpers
  formatDate(dateString: string): string {
    if (!dateString || dateString === '0000-00-00') return 'N/A';
    return this.datePipe.transform(dateString, 'dd/MM/yyyy') || dateString;
  }

  formatCurrency(amount: number, currency: string): string {
    if (isNaN(amount) || !currency) return 'N/A';
    return `${currency} ${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  formatDateTime(date: string, time: string): string {
    if (!date || !time) return 'N/A';
    return `${this.formatDate(date)} ${time}`;
  }
}

interface CreditMemo {
  billingDoc: string;
  docType: string;
  billingCategory: string;
  salesDocCat: string;
  salesOrg: string;
  customer: string;
  currency: string;
  pricingProc: string;
  pricingNumber: string;
  billingDate: string;
  exchangeRate: string;
  netValue: number;
  entryTime: string;
  entryDate: string;
  poNumber: string;
  materialNo: string;
  itemNo: string;
  salesUnit: string;
  rawBillingDate?: Date | null;
  rawNetValue?: number;
}

function compare(a: number | string | Date | null, b: number | string | Date | null, isAsc: boolean): number {
  if (a === null) return 1;
  if (b === null) return -1;
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}