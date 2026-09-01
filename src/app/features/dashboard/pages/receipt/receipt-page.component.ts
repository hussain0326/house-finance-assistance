import { ChangeDetectionStrategy, Component, ElementRef, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonCard, IonCardContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { cameraOutline, checkmarkCircleOutline, closeOutline, cloudUploadOutline, documentAttachOutline, receiptOutline, timeOutline, warningOutline } from 'ionicons/icons';
import { MediaService } from '../../../../core/media/media.service';
import { ReceiptService } from '../../services/receipt.service';

@Component({
  selector: 'app-receipt-page',
  imports: [
    CommonModule,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonSpinner,
    RouterLink
  ],
  templateUrl: './receipt-page.component.html',
  styleUrl: './receipt-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptPageComponent {
  @ViewChild('cameraInput') private readonly cameraInput?: ElementRef<HTMLInputElement>;

  readonly selectedFile = signal<File | null>(null);
  readonly isUploading = signal(false);
  readonly uploadMessage = signal('');
  readonly uploadSuccess = signal(false);
  readonly reviewMessage = signal('');
  readonly ocrStatus = signal<'idle' | 'processing' | 'complete' | 'failed'>('idle');

  constructor(
    private readonly receiptService: ReceiptService,
    private readonly mediaService: MediaService
  ) {
    addIcons({
      cameraOutline,
      checkmarkCircleOutline,
      closeOutline,
      cloudUploadOutline,
      documentAttachOutline,
      receiptOutline,
      timeOutline,
      warningOutline
    });
  }

  get isNativePlatform(): boolean {
    return this.mediaService.isNativePlatform;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.uploadMessage.set('');
    this.reviewMessage.set('');
    this.ocrStatus.set('idle');
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.uploadMessage.set('');
    this.reviewMessage.set('');
    this.ocrStatus.set('idle');
  }

  async scanWithCamera(): Promise<void> {
    if (!this.isNativePlatform) {
      this.cameraInput?.nativeElement.click();
      return;
    }

    const file = await this.mediaService.captureReceipt();
    if (file) {
      this.setSelectedFile(file);
    }
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

    const uploadFile = await this.mediaService.compressImage(file);
    const result = await this.receiptService.uploadReceipt(uploadFile);

    this.isUploading.set(false);
    this.uploadSuccess.set(result.success);
    this.uploadMessage.set(result.message);

    if (result.success) {
      this.selectedFile.set(null);
      const processingResult = result.receiptId
        ? await this.receiptService.processReceipt(result.receiptId)
        : { success: false, message: "We couldn't start reading the receipt details." };
      this.ocrStatus.set(processingResult.success ? 'complete' : 'failed');
      this.uploadMessage.set(
        processingResult.success ? processingResult.message : `${result.message} ${processingResult.message}`
      );
      this.uploadSuccess.set(processingResult.success);
      if (processingResult.success) {
        this.reviewMessage.set(
          'Double-check the date, country, category, and amount in Receipt History - you can edit anything there.'
        );
      }
    }
  }

  private setSelectedFile(file: File): void {
    this.selectedFile.set(file);
    this.uploadMessage.set('');
    this.reviewMessage.set('');
    this.ocrStatus.set('idle');
  }
}
