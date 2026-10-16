import { environment } from '../../../environments/environment';
import { AUDIO_UPLOAD_ACCEPT, audioUploadProblem } from './audio-upload.validator';

describe('audioUploadProblem', () => {
  const { maxBytes, extensions } = environment.audioUpload;
  const fileOf = (name: string, size: number) => new File([new Uint8Array(size)], name);

  it('accepts every allowed extension regardless of case', () => {
    for (const extension of extensions) {
      expect(audioUploadProblem(fileOf(`song.${extension.toUpperCase()}`, 1))).toBeNull();
    }
  });

  it('rejects unknown extensions and names without one', () => {
    expect(audioUploadProblem(fileOf('song.ogg', 1))).toBe('unsupported');
    expect(audioUploadProblem(fileOf('wav', 1))).toBe('unsupported');
  });

  it('rejects files above the configured size limit', () => {
    const extension = extensions[0];
    expect(audioUploadProblem(fileOf(`song.${extension}`, maxBytes))).toBeNull();
    expect(audioUploadProblem(fileOf(`song.${extension}`, maxBytes + 1))).toBe('tooLarge');
  });

  it('builds the accept attribute from the allowed extensions', () => {
    expect(AUDIO_UPLOAD_ACCEPT.split(',')).toEqual(extensions.map((extension) => `.${extension}`));
  });
});
