import { FrameHistory } from './frame-history';

describe('FrameHistory', () => {
  const frame = (value: number) => Float32Array.of(value);

  it('keeps only the most recent frames up to its capacity, oldest first', () => {
    const history = new FrameHistory(2);
    [1, 2, 3].forEach((value) => history.push(frame(value)));
    expect(history.latest(5).map((f) => f[0])).toEqual([2, 3]);
    expect(history.latest(1).map((f) => f[0])).toEqual([3]);
  });

  it('bumps the revision on every push and clear so views know when to repaint', () => {
    const history = new FrameHistory(4);
    const initial = history.revision;
    history.push(frame(1));
    history.clear();
    expect(history.revision).toBe(initial + 2);
    expect(history.latest(4)).toEqual([]);
  });
});
