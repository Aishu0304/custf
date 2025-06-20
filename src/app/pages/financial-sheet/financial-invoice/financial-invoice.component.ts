import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, throwError } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-financial-invoice',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    MatSelectModule
  ],
  templateUrl: './financial-invoice.component.html',
  styleUrls: ['./financial-invoice.component.scss']
})
export class FinancialInvoiceComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['customerId', 'billingDoc', 'billingDate', 'itemNumber', 'billingtype', 'actions'];
  dataSource: any[] = [];
  filteredData: any[] = [];
  
  searchText: string = '';
  billingTypeFilter: string = '';
  customerId: string = '';
  isLoading: boolean = false;
  errorMessage: string | null = null;
  billingTypes: string[] = []; // Will store unique billing types

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.customerId = localStorage.getItem('customerId') || '';
    
    if (!this.customerId) {
      this.errorMessage = 'Customer ID not found. Please log in again.';
      return;
    }

    this.fetchInvoiceData();
  }

  fetchInvoiceData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.http.post<any>('http://localhost:3000/invoice1', { CUSTNO: this.customerId })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = this.getErrorMessage(error);
          return throwError(() => new Error(this.errorMessage || 'Unknown error'));
        })
      )
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.status === 'S' && response.agingDetails) {
            this.dataSource = response.agingDetails;
            this.filteredData = [...this.dataSource];
            this.extractBillingTypes();
          } else {
            this.errorMessage = 'No invoice data found';
            this.dataSource = [];
            this.filteredData = [];
          }
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  private extractBillingTypes(): void {
    // Get unique billing types from data
    const types = new Set(this.dataSource.map(item => item.billingtype));
    this.billingTypes = Array.from(types).sort();
  }

  applyFilters(): void {
    this.filteredData = this.dataSource.filter(item => {
      const matchesSearch = !this.searchText || 
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase());
      const matchesBillingType = !this.billingTypeFilter || 
        item.billingtype === this.billingTypeFilter;
      return matchesSearch && matchesBillingType;
    });
    
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  clearFilters(): void {
    this.searchText = '';
    this.billingTypeFilter = '';
    this.applyFilters();
  }
 downloadPDF(billingDoc: string, itemNumber: string): void {
    this.isLoading = true;
    this.errorMessage = null;

    const payload = {
      IV_KUNNR: itemNumber,
      IV_VBELN: billingDoc
    };

    this.http.post('http://localhost:3000/invoice', payload, { 
      responseType: 'blob',
      observe: 'response'
    })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.isLoading = false;
          if (error.status === 404) {
            this.errorMessage = 'Invoice document not found';
          } else {
            this.errorMessage = this.getErrorMessage(error);
          }
          return throwError(() => new Error(this.errorMessage || 'Unknown error'));
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.body) {
            this.handlePdfResponse(response.body, billingDoc);
          } else {
            this.errorMessage = 'Empty PDF response from server';
          }
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  private handlePdfResponse(pdfBlob: Blob, billingDoc: string): void {
    const blob = new Blob([pdfBlob], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const fileName = `Invoice_${billingDoc}.pdf`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Network error. Please check your connection.';
    } else if (error.status === 400) {
      return 'Invalid request. Please check your inputs.';
    } else if (error.status === 401) {
      return 'Authentication failed. Please log in again.';
    } else if (error.status === 404) {
      return 'Invoice not found for the provided details.';
    } else {
      return error.error?.message || 'Failed to process request. Please try again later.';
    }
  }

  clearError(): void {
    this.errorMessage = null;
  }
}
  // ... (keep all other existing methods the same)


 