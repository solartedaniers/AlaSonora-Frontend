import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/services/i18n.service';
import {
  PhotoClassificationResult,
  PhotoClassificationService,
} from '../../core/services/photo-classification.service';
import { LoggerService } from '../../core/services/logger.service';

// Códigos estables del backend (ApiErrorCode) para los rechazos de la foto.
const NO_BIRD_IN_PHOTO_CODE = 'NO_BIRD_IN_PHOTO';
const PHOTO_UNAVAILABLE_CODE = 'PHOTO_UNAVAILABLE';

@Component({
  selector: 'app-photo-id',
  standalone: true,
  imports: [DecimalPipe, NavHeaderComponent, ConfidenceBadgeComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './photo-id.component.html',
})
export class PhotoIdComponent {
  private readonly classificationService = inject(PhotoClassificationService);
  private readonly logger = inject(LoggerService);
  private readonly i18n = inject(I18nService);

  readonly previewUrl = signal<string | null>(null);
  readonly classifying = signal(false);
  readonly result = signal<PhotoClassificationResult | null>(null);
  readonly errorMessage = signal<string | null>(null);

  async onPhotoSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.result.set(null);
    this.errorMessage.set(null);
    this.previewUrl.set(URL.createObjectURL(file));
    this.classifying.set(true);
    try {
      this.result.set(await this.classificationService.classify(file));
    } catch (error) {
      this.logger.error('PhotoId', 'classification failed', error);
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.classifying.set(false);
    }
  }

  reset(): void {
    this.previewUrl.set(null);
    this.result.set(null);
    this.errorMessage.set(null);
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return this.i18n.translate('photoId.genericError');
    const body = error.error as { errorCode?: string; message?: string } | null;
    if (body?.errorCode === NO_BIRD_IN_PHOTO_CODE) return this.i18n.translate('photoId.noBird');
    if (body?.errorCode === PHOTO_UNAVAILABLE_CODE) return this.i18n.translate('photoId.unavailable');
    // Un backend anterior sin código manda el texto del motor en el 422.
    if (error.status === 422 && body?.message) return body.message;
    // 502/503 sin código: el motor no responde, así que la función no está disponible ahora.
    if (error.status === 503 || error.status === 502) return this.i18n.translate('photoId.unavailable');
    return this.i18n.translate('photoId.genericError');
  }
}
