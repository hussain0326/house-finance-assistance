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
}