import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ReceiptService } from '../../services/receipt.service';

@Component({
  selector: 'app-receipt-page',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    RouterLink
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
  readonly reviewMessage = signal('');
  readonly ocrStatus = signal<'idle' | 'processing' | 'complete' | 'failed'>('idle');

  constructor(private readonly receiptService: ReceiptService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.uploadMessage.set('');
    this.reviewMessage.set('');
    this.ocrStatus.set('idle');
  }

  async uploadSelected(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.isUploading.set(true);
    this.uploadMessage.set('Uploading receipt...');
    this.reviewMessage.set('');
    this.ocrStatus.set('processing');

    const result = await this.receiptService.uploadReceipt(file);

    this.isUploading.set(false);
    this.uploadSuccess.set(result.success);
    this.uploadMessage.set(result.message);

    if (result.success) {
      this.selectedFile.set(null);
      const processingResult = result.receiptId
        ? await this.receiptService.processReceipt(result.receiptId)
        : { success: false, message: 'OCR processing could not be started.' };
      this.ocrStatus.set(processingResult.success ? 'complete' : 'failed');
      this.uploadMessage.set(
        processingResult.success ? processingResult.message : `${result.message} ${processingResult.message}`
      );
      this.uploadSuccess.set(processingResult.success);
      if (processingResult.success) {
        this.reviewMessage.set(
          'Review the extracted date, country, category, and amount in Receipt History. You can edit the receipt details there.'
        );
      }
    }
  }

}
