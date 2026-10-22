import { describe, expect, it } from 'vitest';
import { popupNudge } from '../src/ui/sheetLayout';

describe('popupNudge', () => {
  const frame = { width: 1440, height: 900 };

  it('leaves a clear popup where it is', () => {
    expect(
      popupNudge({ left: 400, top: 200, right: 700, bottom: 420 }, frame, [
        { left: 1384, top: 400, right: 1428, bottom: 500 },
      ]),
    ).toEqual({ dx: 0, dy: 0 });
  });

  it('slides a popup off the zoom column', () => {
    const zoom = { left: 1384, top: 370, right: 1428, bottom: 470 };
    const nudge = popupNudge({ left: 1200, top: 300, right: 1420, bottom: 560 }, frame, [zoom]);
    const right = 1420 + nudge.dx;
    const top = 300 + nudge.dy;
    const bottom = 560 + nudge.dy;
    const overlaps = right > zoom.left && 1200 + nudge.dx < zoom.right && bottom > zoom.top && top < zoom.bottom;
    expect(overlaps).toBe(false);
    expect(1200 + nudge.dx).toBeGreaterThanOrEqual(12);
    expect(right).toBeLessThanOrEqual(1428);
  });
});
