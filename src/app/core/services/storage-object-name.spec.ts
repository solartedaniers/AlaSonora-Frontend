import { storageObjectName } from './storage-object-name';

describe('storageObjectName', () => {
  const NOW = 1_760_000_000_000;

  beforeEach(() => spyOn(Date, 'now').and.returnValue(NOW));

  it('keeps a safe extension from the original name in lowercase', () => {
    expect(storageObjectName(new File([], 'Garza Blanca.JPG'))).toBe(`${NOW}.jpg`);
  });

  it('prepends the prefix when given', () => {
    expect(storageObjectName(new File([], 'nest.png'), 'observer')).toBe(`observer-${NOW}.png`);
  });

  it('falls back to the MIME type, then to a generic extension', () => {
    expect(storageObjectName(new File([], 'photo', { type: 'image/webp' }))).toBe(`${NOW}.webp`);
    expect(storageObjectName(new File([], 'photo.tar gz', { type: 'application/x-tar' }))).toBe(`${NOW}.bin`);
  });
});
