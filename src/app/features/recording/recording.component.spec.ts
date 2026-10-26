import { ApplicationRef, CUSTOM_ELEMENTS_SCHEMA, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AiEngineStatus, AiEngineStatusService } from '../../core/services/ai-engine-status.service';
import { AudioCaptureService, AudioWorkerUnavailableError } from '../../core/services/audio-capture.service';
import { ClassificationService } from '../../core/services/classification.service';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { DetectionDraftService } from '../../core/services/detection-draft.service';
import { I18nService } from '../../core/services/i18n.service';
import { LoggerService } from '../../core/services/logger.service';
import { PendingRecordingsSyncService } from '../../core/services/pending-recordings-sync.service';
import { UserService } from '../../core/services/user.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { RecordingComponent } from './recording.component';

describe('RecordingComponent with the AI engine off', () => {
  const status = signal<AiEngineStatus>('waking');
  const online = signal(true);
  let warmUp: jasmine.Spy;

  beforeEach(() => {
    warmUp = jasmine.createSpy('warmUp');
    status.set('waking');
    online.set(true);
    TestBed.configureTestingModule({
      imports: [RecordingComponent],
      providers: [
        provideRouter([]),
        { provide: AiEngineStatusService, useValue: { status, ready: computed(() => status() === 'ready'), warmUp } },
        { provide: ConnectivityService, useValue: { online } },
        {
          provide: AudioCaptureService,
          useValue: {
            history: [],
            isRecording: signal(false),
            latestFrame: signal(null),
            elapsedSeconds: signal(0),
            gainDb: signal(0),
            highPassEnabled: signal(false),
          },
        },
        { provide: ClassificationService, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: DetectionDraftService, useValue: {} },
        { provide: PendingRecordingsSyncService, useValue: {} },
        { provide: LoggerService, useValue: {} },
        { provide: I18nService, useValue: { lang: signal('es'), translate: (key: string) => `t:${key}` } },
      ],
    });
    // Los visualizadores y la cabecera no influyen en los botones: los dejo como elementos vacíos.
    TestBed.overrideComponent(RecordingComponent, {
      set: { imports: [DecimalPipe, TranslatePipe], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  const render = (tab: 'live' | 'upload') => {
    const fixture = TestBed.createComponent(RecordingComponent);
    fixture.componentInstance.setTab(tab);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    return {
      refresh: () => fixture.detectChanges(),
      recordButton: () => element.querySelector<HTMLButtonElement>('.record-button')!,
      browseButton: () => element.querySelector<HTMLButtonElement>('.record-dropzone button')!,
      lockedMessage: () => element.querySelector('#engine-locked'),
      retryButton: () => element.querySelector<HTMLButtonElement>('.btn--quiet'),
    };
  };

  it('disables recording until the engine is on, with the i18n message', () => {
    const view = render('live');
    expect(view.recordButton().disabled).toBeTrue();
    expect(view.lockedMessage()?.textContent).toContain('t:recording.engine.locked');

    status.set('ready');
    view.refresh();
    expect(view.recordButton().disabled).toBeFalse();
    expect(view.lockedMessage()).toBeNull();
  });

  it('disables uploading until the engine is on', () => {
    const view = render('upload');
    expect(view.browseButton().disabled).toBeTrue();

    status.set('ready');
    view.refresh();
    expect(view.browseButton().disabled).toBeFalse();
  });

  it('still records offline, where the audio is queued for later', () => {
    online.set(false);
    const view = render('live');
    expect(view.recordButton().disabled).toBeFalse();
  });

  it('wakes the engine on entering and from the "turn on again" button', async () => {
    const view = render('live');
    await TestBed.inject(ApplicationRef).whenStable();
    expect(warmUp).toHaveBeenCalledTimes(1);

    status.set('unavailable');
    view.refresh();
    view.retryButton()!.click();
    expect(warmUp).toHaveBeenCalledTimes(2);
  });

  it('tells the user the engine is busy instead of treating it as asleep', () => {
    const component = TestBed.createComponent(RecordingComponent).componentInstance;
    const busy = new HttpErrorResponse({ status: 503, error: { errorCode: 'AI_ENGINE_BUSY' } });

    expect(RecordingComponent['isEngineAsleep'](busy)).toBeFalse();
    expect(RecordingComponent['isEngineAsleep'](new HttpErrorResponse({ status: 503 }))).toBeTrue();
    expect(component['resolveClassifyErrorMessage'](busy)).toBe('t:recording.engine.busy');
  });

  it('explains that the audio worker is unavailable instead of blaming the microphone', async () => {
    status.set('ready');
    const capture = TestBed.inject(AudioCaptureService) as unknown as { start: () => Promise<void> };
    capture.start = () => Promise.reject(new AudioWorkerUnavailableError());
    const component = TestBed.createComponent(RecordingComponent).componentInstance;

    await component.toggleRecording();

    expect(component.classifyError()).toBe('t:recording.workerUnavailable');
    expect(component['micDenied']()).toBeFalse();
  });
});
