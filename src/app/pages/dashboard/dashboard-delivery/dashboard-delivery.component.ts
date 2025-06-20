import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-dashboard-delivery',
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
    MatPaginatorModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './dashboard-delivery.component.html',
  styleUrls: ['./dashboard-delivery.component.scss'],
  providers: [DatePipe]
})
export class DashboardDeliveryComponent implements OnInit {
  deliveries: Delivery[] = [];
  filteredDeliveries: Delivery[] = [];
  displayedColumns: string[] = [
    'deliveryNumber', 'itemNumber', 'materialNumber', 'deliveryType',
    'deliveryDate', 'deliveryQty', 'salesUnit', 'netValue', 
    'currency', 'status', 'actions'
  ];

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  isLoading: boolean = false;
  error: string = '';
  hoveredRow: string | null = null;

  // Filter properties
  searchText: string = '';
  deliveryTypeFilter: string = '';
  statusFilter: string = '';
  dateRangeFilter: { start: Date | null; end: Date | null } = { start: null, end: null };
  currencyFilter: string = '';
  
  // Filter options
  deliveryTypes: string[] = [];
  statusOptions: string[] = [];
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
        this.loadDeliveries(kunnr);
      } else {
        this.error = 'Customer ID not found. Please log in.';
        this.snackBar.open(this.error, 'Close', { duration: 5000 });
        this.router.navigate(['/login']);
      }
    }
  }

  loadDeliveries(kunnr: string): void {
    this.isLoading = true;
    this.error = '';

    this.http.post<any>('http://localhost:3000/delivery', { CUSTNO: kunnr }).subscribe({
      next: (response) => {
        if (response.status === 'S' && response.delivery) {
          const deliveryData = Array.isArray(response.delivery) 
            ? response.delivery 
            : [response.delivery];
              
          this.deliveries = deliveryData.map((item: any) => ({
            deliveryNumber: item.VBELN || item.deliveryNumber || '',
            itemNumber: item.POSNR || item.itemNumber || '',
            materialNumber: item.MATNR || item.materialNumber || '',
            deliveryType: item.LFART || item.deliveryType || '',
            deliveryDate: item.LFDAT_V || item.deliveryDate || '',
            deliveryQty: parseFloat(item.LFIMG || item.deliveryQty || '0'),
            salesUnit: item.VRKME || item.salesUnit || '',
            netValue: parseFloat(item.NETWR || item.netValue || '0'),
            currency: item.WAERK || item.currency || '',
            status: item.GBSTK || item.overallStatus || item.status || '',
            shippingPoint: item.VSTEL || item.shippingPoint || '',
            storageLocation: item.LGORT || item.storageLocation || '',
            plant: item.WERKS || item.plant || '',
            rawDeliveryDate: item.LFDAT_V ? new Date(item.LFDAT_V) : 
                  (item.deliveryDate ? new Date(item.deliveryDate) : null),
            rawNetValue: parseFloat(item.NETWR || item.netValue || '0')
          }));

          this.filteredDeliveries = [...this.deliveries];
          this.deliveryTypes = [...new Set(this.deliveries.map(d => d.deliveryType))];
          this.statusOptions = [...new Set(this.deliveries.map(d => d.status))];
          this.currencies = [...new Set(this.deliveries.map(d => d.currency))];
          this.calculateTotalPages();
        } else {
          this.error = response.message || 'No deliveries found';
          this.snackBar.open(this.error, 'Close', { duration: 5000 });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('API Error:', err);
        this.error = 'Failed to load deliveries. Please try again.';
        this.snackBar.open(this.error, 'Close', { duration: 5000 });
        this.isLoading = false;
      }
    });
  }
  onPageChange(event: any): void {
  this.itemsPerPage = event.pageSize;
  this.currentPage = event.pageIndex + 1;
}
// Add this property to your component class
selectedDelivery: any = null;

// Replace viewDetails method with this:
showDetails(delivery: any): void {
  this.selectedDelivery = delivery;
}

closeDetails(): void {
  this.selectedDelivery = null;
}

  applyFilters(): void {
    this.currentPage = 1;
    this.filteredDeliveries = this.deliveries.filter(delivery => {
      const matchesSearch = !this.searchText || 
        delivery.deliveryNumber.toLowerCase().includes(this.searchText.toLowerCase()) ||
        delivery.materialNumber.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesDeliveryType = !this.deliveryTypeFilter || 
        delivery.deliveryType === this.deliveryTypeFilter;

      const matchesStatus = !this.statusFilter || 
        delivery.status === this.statusFilter;

      const matchesCurrency = !this.currencyFilter || 
        delivery.currency === this.currencyFilter;

      let matchesDateRange = true;
      if ((this.dateRangeFilter.start || this.dateRangeFilter.end) && delivery.rawDeliveryDate) {
        const deliveryDate = delivery.rawDeliveryDate;
        const start = this.dateRangeFilter.start ? new Date(this.dateRangeFilter.start) : null;
        const end = this.dateRangeFilter.end ? new Date(this.dateRangeFilter.end) : null;
        
        if (start && deliveryDate < start) matchesDateRange = false;
        if (end && deliveryDate > end) matchesDateRange = false;
      }

      return matchesSearch && matchesDeliveryType && matchesStatus && 
             matchesCurrency && matchesDateRange;
    });
    this.calculateTotalPages();
  }

  get paginatedDeliveries(): Delivery[] {
  if (!this.filteredDeliveries?.length) return [];
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  return this.filteredDeliveries.slice(startIndex, startIndex + this.itemsPerPage);
}

  getDisplayRange(): string {
    if (!this.filteredDeliveries?.length) return '0 items';
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredDeliveries.length);
    return `Showing ${start} - ${end} of ${this.filteredDeliveries.length} items`;
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredDeliveries.length / this.itemsPerPage) || 1;
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

  clearFilters(): void {
    this.searchText = '';
    this.deliveryTypeFilter = '';
    this.statusFilter = '';
    this.currencyFilter = '';
    this.dateRangeFilter = { start: null, end: null };
    this.filteredDeliveries = [...this.deliveries];
    this.currentPage = 1;
    this.calculateTotalPages();
  }

  sortData(sort: Sort): void {
    if (!sort.active || sort.direction === '') {
      this.filteredDeliveries = [...this.filteredDeliveries];
      return;
    }

    this.filteredDeliveries = this.filteredDeliveries.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'deliveryNumber': return compare(a.deliveryNumber, b.deliveryNumber, isAsc);
        case 'itemNumber': return compare(a.itemNumber, b.itemNumber, isAsc);
        case 'materialNumber': return compare(a.materialNumber, b.materialNumber, isAsc);
        case 'deliveryDate': 
          return compare(a.rawDeliveryDate || 0, b.rawDeliveryDate || 0, isAsc);
        case 'deliveryQty': return compare(a.deliveryQty, b.deliveryQty, isAsc);
        case 'currency': return compare(a.currency, b.currency, isAsc);
        case 'status': return compare(a.status, b.status, isAsc);
        default: return 0;
      }
    });
  }

  viewDetails(deliveryNumber: string, itemNumber: string): void {
    if (!deliveryNumber || !itemNumber) {
      this.snackBar.open('No delivery selected', 'Close', { duration: 3000 });
      return;
    }

    const delivery = this.deliveries.find(d => 
      d.deliveryNumber === deliveryNumber && d.itemNumber === itemNumber);
      
    this.router.navigate(['/home/dashboard/delivery', deliveryNumber, itemNumber], {
      state: { deliveryData: delivery }
    });
  }

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

  getStatusClass(status: string): string {
    switch (status) {
      case 'C': return 'status-completed';
      case 'A': return 'status-active';
      case 'B': return 'status-Processing';
      default: return 'status-default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'C': return 'Completed';
      case 'A': return 'Active';
      case 'B': return 'Processing';
      default: return status || 'Unknown';
    }
  }
}

interface Delivery {
  deliveryNumber: string;
  itemNumber: string;
  materialNumber: string;
  deliveryType: string;
  deliveryDate: string;
  deliveryQty: number;
  salesUnit: string;
  netValue: number;
  currency: string;
  status: string;
  shippingPoint?: string;
  storageLocation?: string;
  plant?: string;
  rawDeliveryDate?: Date | null;
  rawNetValue?: number;
}

function compare(a: number | string | Date | null, b: number | string | Date | null, isAsc: boolean): number {
  if (a === null) return 1;
  if (b === null) return -1;
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}