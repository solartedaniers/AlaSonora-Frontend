import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { speciesDisplayName } from '../../../core/models';
import { I18nService } from '../../../core/services/i18n.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { OfflineStorageService } from '../../../core/services/offline-storage.service';
import { OfflineRecordingOutcome, OfflineRecordingsLogService } from '../../../core/services/offline-recordings-log.service';
import { PendingRecordingsSyncService } from '../../../core/services/pending-recordings-sync.service';

export type OfflineRecordingStatus = 'pending' | OfflineRecordingOutcome;

export interface OfflineRecordingRow {
  id: string;
  recordedAt: string;
  status: OfflineRecordingStatus;
  detectionId?: string;
  speciesName?: string;
}

/** Muestro desde el dispositivo las grabaciones hechas sin conexión, aunque el historial del backend no cargue. */
@Component({
  selector: 'app-offline-recordings',
  standalone: true,
  imports: [DatePipe, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './offline-recordings.component.html',
  styleUrl: './offline-recordings.component.scss',
})
export class OfflineRecordingsComponent {
  private readonly queue = inject(OfflineStorageService);
  private readonly log = inject(OfflineRecordingsLogService);
  private readonly sync = inject(PendingRecordingsSyncService);
  private readonly i18n = inject(I18nService);
  readonly online = inject(ConnectivityService).online;

  readonly retrying = signal(false);

  readonly statusIcons: Record<OfflineRecordingStatus, string> = {
    pending: 'schedule',
    synced: 'check_circle',
    failed: 'error',
  };

  // Una fila por grabación: si ya está en el registro, esa versión reemplaza a la de la cola.
  readonly rows = computed<OfflineRecordingRow[]>(() => {
    const lang = this.i18n.lang();
    const logged = this.log.entries().map((entry) => ({
      id: entry.id,
      recordedAt: entry.recordedAt,
      status: entry.outcome,
      detectionId: entry.detectionId,
      speciesName: entry.species && speciesDisplayName(entry.species, lang),
    }));
    const loggedIds = new Set(logged.map((row) => row.id));
    const pending = this.queue
      .pending()
      .filter((recording) => !loggedIds.has(recording.id))
      .map((recording) => ({ ...recording, status: 'pending' as const }));
    return [...pending, ...logged].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  });

  readonly hasPending = computed(() => this.rows().some((row) => row.status === 'pending'));

  async retry(): Promise<void> {
    this.retrying.set(true);
    try {
      await this.sync.syncNow();
    } finally {
      this.retrying.set(false);
    }
  }
}
