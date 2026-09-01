import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  get isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  async captureReceipt(): Promise<File | null> {
    if (!this.isNativePlatform) {
      return null;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });
      if (!photo.webPath) {
        return null;
      }

      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const extension = photo.format === 'png' ? 'png' : 'jpg';
      return new File([blob], `receipt-${Date.now()}.${extension}`, { type: blob.type || `image/${extension}` });
    } catch {
      return null;
    }
  }

  /**
   * Downscales and re-encodes large receipt photos before upload. Camera/gallery
   * captures can be several MB at full resolution, which is unnecessary for OCR and
   * inflates Supabase storage egress. Non-image files (e.g. PDFs) pass through untouched.
   */
  async compressImage(file: File, maxDimension = 1600, quality = 0.75): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      return file;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        return file;
      }
      context.drawImage(bitmap, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (!blob || blob.size >= file.size) {
        return file;
      }

      const name = `${file.name.replace(/\.[^.]+$/, '')}.jpg`;
      return new File([blob], name, { type: 'image/jpeg' });
    } catch {
      return file;
    }
  }
}