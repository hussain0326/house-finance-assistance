import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReceiptService } from '../../services/receipt.service';

@Component({
  selector: 'app-receipt-page',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './receipt-page.component.html',
  styleUrl: './receipt-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptPageComponent {
  readonly selectedFile = signal<File | null>(null);
  readonly isUploading = signal(false);
  readonly uploadMessage = signal('');
  readonly uploadSuccess = signal(false);

  constructor(private readonly receiptService: ReceiptService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.uploadMessage.set('');
  }

  async uploadSelected(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.isUploading.set(true);
    this.uploadMessage.set('Uploading receipt...');

    const result = await this.receiptService.uploadReceipt(file);

    this.isUploading.set(false);
    this.uploadSuccess.set(result.success);
    this.uploadMessage.set(result.message);

    if (result.success) {
      this.selectedFile.set(null);
    }
  }
}
