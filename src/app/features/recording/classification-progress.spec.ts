import { fakeAsync, tick } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ClassificationProgress } from './classification-progress';

describe('ClassificationProgress', () => {
  const { uploadEnd, verifyEnd, estimateCap, tickMs } = environment.classificationProgress;
  let progress: ClassificationProgress;

  beforeEach(() => (progress = new ClassificationProgress()));
  afterEach(() => progress.reset());

  it('maps the real upload fraction onto the upload range and never goes backwards', () => {
    progress.start();
    progress.uploaded(1);
    expect(progress.percent()).toBe(uploadEnd);
    progress.uploaded(0.1);
    expect(progress.percent()).toBe(uploadEnd);
    progress.verifying();
    progress.verified();
    expect(progress.stage()).toBe('verifying');
    expect(progress.percent()).toBe(verifyEnd);
  });

  it('estimates the analysis without ever reaching the cap', fakeAsync(() => {
    progress.start();
    progress.verified();
    progress.analyzing(true);
    expect(progress.stage()).toBe('waking');
    tick(tickMs * 500);
    expect(progress.percent()).toBeGreaterThan(verifyEnd);
    expect(progress.percent()).toBeLessThanOrEqual(estimateCap);
    progress.complete();
    expect(progress.percent()).toBe(100);
  }));

  it('freezes the bar where it was when the analysis fails', fakeAsync(() => {
    progress.start();
    progress.analyzing();
    tick(tickMs * 3);
    progress.fail('engine down');
    const frozen = progress.percent();
    tick(tickMs * 10);
    expect(progress.percent()).toBe(frozen);
    expect(progress.error()).toBe('engine down');
    expect(progress.active()).toBeTrue();
  }));
});
