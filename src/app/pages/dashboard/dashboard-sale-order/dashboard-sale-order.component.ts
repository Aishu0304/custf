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

interface SalesOrder {
  customerId: string;
  salesOrderNumber: string;
  itemNumber: string;
  materialNumber: string;
  orderQuantity: number;
  salesUnit: string;
  netValue: number;
  currency: string;
  orderDate: string;
  documentType: string;
  plant: string;
  shippingPoint: string;
  status?: string; // Optional as it's not in the API response
}

interface ApiResponse {
  status: string;
  message: string;
  count: number;
  salesOrders: SalesOrder[];
}

@Component({
  selector: 'app-dashboard-sales-order',
  templateUrl: './dashboard-sale-order.component.html',
  styleUrls: ['./dashboard-sale-order.component.scss'],
  providers: [DatePipe],
  imports:[ CommonModule,
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
    MatChipsModule]
})
export class DashboardSaleOrderComponent implements OnInit {
  salesOrders: SalesOrder[] = [];
  filteredSalesOrders: SalesOrder[] = [];
  displayedColumns: string[] = [
    'salesOrderNumber', 'itemNumber', 'materialNumber', 'documentType',
    'orderDate', 'orderQuantity', 'salesUnit', 'netValue', 
    'currency',  'actions'
  ];
  isLoading: boolean = false;
  error: string = '';

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  // Filters
  searchText: string = '';
  documentTypeFilter: string = '';
  statusFilter: string = '';
  dateRangeFilter: { start: Date | null; end: Date | null } = { start: null, end: null };
  currencyFilter: string = '';
  
  // Filter options
  documentTypes: string[] = [];
  statusOptions: string[] = ['Pending', 'Completed']; // Default options since not in API
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
      const customerId = localStorage.getItem('customerId');
      if (customerId) {
        this.loadSalesOrders(customerId);
      } else {
        this.handleError('Customer ID not found. Please log in.');
        this.router.navigate(['/login']);
      }
    }
  }

  loadSalesOrders(customerId: string): void {
    this.isLoading = true;
    this.error = '';

    this.http.post<ApiResponse>('http://localhost:3000/salesorder', { CUSTNO: customerId }).subscribe({
      next: (response) => {
        if (response.status === 'S' && response.salesOrders) {
          this.salesOrders = this.transformSalesOrders(response.salesOrders);
          this.filteredSalesOrders = [...this.salesOrders];
          this.updateFilterOptions();
          this.calculateTotalPages();
        } else {
          this.handleError(response.message || 'No sales orders found');
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('API Error:', err);
        this.handleError('Failed to load sales orders. Please try again.');
        this.isLoading = false;
      }
    });
  }
  // Add to your component class
selectedSalesOrder: any = null;

showDetails(order: any): void {
  this.selectedSalesOrder = order;
}

closeDetails(): void {
  this.selectedSalesOrder = null;
}

  private transformSalesOrders(orders: any[]): SalesOrder[] {
    return orders.map(order => ({
      ...order,
      orderQuantity: parseFloat(order.orderQuantity) || 0,
      netValue: parseFloat(order.netValue) || 0,
      status: 'Pending' // Default status since not in API
    }));
  }

  private updateFilterOptions(): void {
    this.documentTypes = [...new Set(this.salesOrders.map(d => d.documentType))];
    this.currencies = [...new Set(this.salesOrders.map(d => d.currency))];
  }

  private handleError(message: string): void {
    this.error = message;
    this.snackBar.open(this.error, 'Close', { duration: 5000 });
  }

  // Pagination methods
  get paginatedSalesOrders(): SalesOrder[] {
    if (!this.filteredSalesOrders?.length) return [];
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSalesOrders.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getDisplayRange(): string {
    if (!this.filteredSalesOrders?.length) return '0 items';
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredSalesOrders.length);
    return `Showing ${start} - ${end} of ${this.filteredSalesOrders.length} items`;
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredSalesOrders.length / this.itemsPerPage) || 1;
  }

  // Filter methods
  applyFilters(): void {
    this.currentPage = 1;
    
    this.filteredSalesOrders = this.salesOrders.filter(order => {
      const matchesSearch = !this.searchText || 
        Object.values(order).some(val => 
          val?.toString().toLowerCase().includes(this.searchText.toLowerCase()));
      
      const matchesDocType = !this.documentTypeFilter || 
        order.documentType === this.documentTypeFilter;
      
      const matchesStatus = !this.statusFilter || 
        order.status === this.statusFilter;
      
      const matchesCurrency = !this.currencyFilter || 
        order.currency === this.currencyFilter;
      
      return matchesSearch && matchesDocType && matchesStatus && matchesCurrency;
    });

    this.calculateTotalPages();
  }

  clearFilters(): void {
    this.searchText = '';
    this.documentTypeFilter = '';
    this.statusFilter = '';
    this.currencyFilter = '';
    this.dateRangeFilter = { start: null, end: null };
    this.filteredSalesOrders = [...this.salesOrders];
    this.currentPage = 1;
    this.calculateTotalPages();
  }

  // View details
  viewDetails(salesOrderNumber: string, itemNumber: string): void {
    const order = this.salesOrders.find(o => 
      o.salesOrderNumber === salesOrderNumber && o.itemNumber === itemNumber);
      
    if (order) {
      this.router.navigate(['/home/dashboard/sales-order', salesOrderNumber, itemNumber], {
        state: { orderData: order }
      });
    } else {
      this.snackBar.open('Sales order not found', 'Close', { duration: 3000 });
    }
  }

  // Formatting helpers
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return this.datePipe.transform(dateString, 'dd/MM/yyyy') || 'N/A';
  }

  formatCurrency(amount: number, currency: string): string {
    if (isNaN(amount) || !currency) return 'N/A';
    return `${currency} ${amount.toFixed(2)}`;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().includes('complete') ? 'status-completed' : 'status-pending';
  }
}