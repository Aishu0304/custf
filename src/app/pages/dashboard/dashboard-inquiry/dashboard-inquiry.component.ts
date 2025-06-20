import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
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

@Component({
  selector: 'app-dashboard-inquiry',
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
  templateUrl: './dashboard-inquiry.component.html',
  styleUrls: ['./dashboard-inquiry.component.scss'],
  providers: [DatePipe]
})
export class DashboardInquiryComponent implements OnInit {
  inquiries: Inquiry[] = [];
  filteredInquiries: Inquiry[] = [];
  displayedColumns: string[] = [
    'inquiryNo', 'createdDate', 'docType', 'inquiryDate', 
    'validToDate', 'description', 'netValue', 'currency', 'actions'
  ];
  isLoading: boolean = false;
  error: string = '';
  hoveredRow: string | null = null;

  // Filter properties
  searchText: string = '';
  docTypeFilter: string = '';
  dateRangeFilter: { start: Date | null; end: Date | null } = { start: null, end: null };
  currencyFilter: string = '';
  docTypes: string[] = [];
  currencies: string[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    const kunnr = localStorage.getItem('customerId');
    if (kunnr) {
      this.loadInquiries(kunnr);
    } else {
      this.error = 'Customer ID not found. Please log in.';
      this.snackBar.open(this.error, 'Close', { duration: 5000 });
      this.router.navigate(['/login']);
    }
  }
// Add this property to your component class
selectedInquiry: any = null;

// Replace viewDetails method with this:
showDetails(inquiry: any): void {
  this.selectedInquiry = inquiry;
}
  loadInquiries(kunnr: string): void {
    this.isLoading = true;
    this.error = '';

    this.http.post<any>('http://localhost:3000/inquiry', { CUSTNO: kunnr }).subscribe({
      next: (response) => {
        if (response.status === 'S' && response.inquiries) {
          this.inquiries = response.inquiries.map((item: any) => ({
            inquiryNo: item.inquiryNo,
            createdDate: item.createdDate,
            docType: item.docType,
            inquiryDate: item.inquiryDate,
            validToDate: item.validToDate,
            description: item.description,
            netValue: item.netValue,
            currency: item.currency,
            itemNo: item.itemNo,
            salesUnit: item.salesUnit,
            quantity: item.quantity,
            // Add raw values for sorting
            rawCreatedDate: new Date(item.createdDate),
            rawInquiryDate: new Date(item.inquiryDate),
            rawValidToDate: new Date(item.validToDate),
            rawNetValue: parseFloat(item.netValue)
          }));

          // Initialize filtered data
          this.filteredInquiries = [...this.inquiries];
          
          // Extract unique doc types and currencies for filters
          this.docTypes = [...new Set(this.inquiries.map(item => item.docType))];
          this.currencies = [...new Set(this.inquiries.map(item => item.currency))];
        } else {
          this.error = response.message || 'Failed to load inquiries.';
          this.snackBar.open(this.error, 'Close', { duration: 5000 });
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Unable to load inquiries. Please try again later.';
        this.snackBar.open(this.error, 'Close', { duration: 5000 });
        this.isLoading = false;
        console.error('Inquiry load error:', err);
      }
    });
  }
  

  applyFilters(): void {
    this.filteredInquiries = this.inquiries.filter(inquiry => {
      // Search text filter
      const matchesSearch = !this.searchText || 
        inquiry.inquiryNo.toLowerCase().includes(this.searchText.toLowerCase()) ||
        inquiry.description.toLowerCase().includes(this.searchText.toLowerCase());

      // Document type filter
      const matchesDocType = !this.docTypeFilter || 
        inquiry.docType === this.docTypeFilter;

      // Currency filter
      const matchesCurrency = !this.currencyFilter || 
        inquiry.currency === this.currencyFilter;

      // Date range filter
      let matchesDateRange = true;
      if (this.dateRangeFilter.start || this.dateRangeFilter.end) {
        const inquiryDate = new Date(inquiry.inquiryDate);
        const start = this.dateRangeFilter.start ? new Date(this.dateRangeFilter.start) : null;
        const end = this.dateRangeFilter.end ? new Date(this.dateRangeFilter.end) : null;
        
        if (start && inquiryDate < start) matchesDateRange = false;
        if (end && inquiryDate > end) matchesDateRange = false;
      }

      return matchesSearch && matchesDocType && matchesCurrency && matchesDateRange;
    });
  }

  
  

  clearFilters(): void {
    this.searchText = '';
    this.docTypeFilter = '';
    this.currencyFilter = '';
    this.dateRangeFilter = { start: null, end: null };
    this.filteredInquiries = [...this.inquiries];
  }

  sortData(sort: Sort): void {
    if (!sort.active || sort.direction === '') {
      this.filteredInquiries = [...this.filteredInquiries];
      return;
    }

    
  }

  viewDetails(inquiryNo: string): void {
    if (!inquiryNo) {
      this.snackBar.open('No inquiry selected', 'Close', { duration: 3000 });
      return;
    }

    const inquiry = this.inquiries.find(i => i.inquiryNo === inquiryNo);
    this.router.navigate(['/home/dashboard/inquiry', inquiryNo], {
      state: { inquiryData: inquiry }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString || dateString === '0000-00-00') return 'N/A';
    return this.datePipe.transform(dateString, 'dd/MM/yyyy') || dateString;
  }

  formatCurrency(amount: string, currency: string): string {
    if (!amount || !currency) return 'N/A';
    const num = parseFloat(amount);
    return `${currency} ${num.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
}

interface Inquiry {
  inquiryNo: string;
  createdDate: string;
  docType: string;
  inquiryDate: string;
  validToDate: string;
  description: string;
  netValue: string;
  currency: string;
  itemNo?: string;
  salesUnit?: string;
  quantity?: string;
  // Raw values for sorting
  rawCreatedDate?: Date;
  rawInquiryDate?: Date;
  rawValidToDate?: Date;
  rawNetValue?: number;
}

function compare(a: number | string | Date, b: number | string | Date, isAsc: boolean): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}