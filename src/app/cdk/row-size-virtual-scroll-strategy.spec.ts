import { ListRange } from '@angular/cdk/collections';
import { RowSizeVirtualScrollStrategy } from './row-size-virtual-scroll-strategy';

/** A minimal stand-in for CdkVirtualScrollViewport sufficient to drive the strategy under test. */
class FakeViewport {
  totalContentSize = 0;
  renderedRange: ListRange = { start: 0, end: 0 };
  renderedContentOffset = 0;
  scrollOffset = 0;
  viewportSize = 300;

  setTotalContentSize(size: number): void {
    this.totalContentSize = size;
  }

  getRenderedRange(): ListRange {
    return this.renderedRange;
  }

  setRenderedRange(range: ListRange): void {
    this.renderedRange = range;
  }

  setRenderedContentOffset(offset: number): void {
    this.renderedContentOffset = offset;
  }

  getViewportSize(): number {
    return this.viewportSize;
  }

  measureScrollOffset(): number {
    return this.scrollOffset;
  }

  scrollToOffset = jest.fn();
}

describe('RowSizeVirtualScrollStrategy', () => {
  let viewport: FakeViewport;

  function attach(sizes: number[], bufferPx = 100): RowSizeVirtualScrollStrategy {
    const strategy = new RowSizeVirtualScrollStrategy(sizes, bufferPx);
    strategy.attach(viewport as unknown as import('@angular/cdk/scrolling').CdkVirtualScrollViewport);
    return strategy;
  }

  beforeEach(() => {
    viewport = new FakeViewport();
  });

  it('sets the total content size to the sum of every declared item size', () => {
    attach([56, 96, 96, 176, 96]);
    expect(viewport.totalContentSize).toBe(56 + 96 + 96 + 176 + 96);
  });

  it('renders starting at index 0 when scrolled to the top', () => {
    attach([56, 96, 96, 96, 96]);
    expect(viewport.renderedRange.start).toBe(0);
    expect(viewport.renderedContentOffset).toBe(0);
  });

  it('expands the rendered range to include items scrolled into the buffer', () => {
    // 20 uniform 96px rows; scroll to offset 960 (start of row 10) with a 300px viewport.
    const sizes = new Array(20).fill(96);
    const strategy = attach(sizes, 100);

    viewport.scrollOffset = 960;
    strategy.onContentScrolled();

    // Row 10 starts the visible window; the rendered range must extend a buffer's worth on each
    // side and always cover the visible viewport.
    expect(viewport.renderedRange.start).toBeLessThan(10);
    expect(viewport.renderedRange.end).toBeGreaterThan(10);
    const visibleRowsCovered = viewport.renderedRange.end - viewport.renderedRange.start;
    expect(visibleRowsCovered).toBeGreaterThanOrEqual(Math.ceil(viewport.viewportSize / 96));
  });

  it('computes an identical range for a tiny scroll delta that stays within the same rows', () => {
    const sizes = new Array(20).fill(96);
    const strategy = attach(sizes, 100);
    strategy.onContentScrolled();
    const rangeAfterFirstScroll = { ...viewport.renderedRange };

    // A 5px nudge doesn't cross any row boundary, so the recomputed range comes out identical —
    // real CdkVirtualScrollViewport.setRenderedRange() no-ops in that case (see class doc).
    viewport.scrollOffset += 5;
    strategy.onContentScrolled();

    expect(viewport.renderedRange).toEqual(rangeAfterFirstScroll);
  });

  it('shrinks cleanly when an item is removed (e.g. a details row collapsing)', () => {
    // Simulate: header + 3 users, the 2nd user currently expanded (details row present).
    const expanded = [56, 96, 176, 96, 96];
    const strategy = attach(expanded, 100);
    viewport.scrollOffset = 0;
    strategy.onContentScrolled();
    expect(viewport.renderedRange.end).toBeLessThanOrEqual(expanded.length);

    // Collapse: details row removed, list shrinks by one item.
    const collapsed = [56, 96, 96, 96];
    strategy.updateItemSizesAndBuffer(collapsed, 100);

    expect(viewport.totalContentSize).toBe(collapsed.reduce((a, b) => a + b, 0));
    expect(viewport.renderedRange.start).toBeLessThanOrEqual(collapsed.length);
    expect(viewport.renderedRange.end).toBeLessThanOrEqual(collapsed.length);
  });

  it('grows total content size correctly when a details row is inserted at the very end of a long list (scrolled to bottom)', () => {
    // 200 uniform 96px rows; scroll all the way to the bottom.
    const baseSizes = new Array(200).fill(96);
    const strategy = attach(baseSizes, 100);
    viewport.scrollOffset = baseSizes.reduce((a, b) => a + b, 0) - viewport.viewportSize;
    strategy.onContentScrolled();

    const totalBefore = viewport.totalContentSize;

    // Expand the very last user: a 176px details row is inserted as the new last item.
    const withDetailsAppended = [...baseSizes, 176];
    strategy.updateItemSizesAndBuffer(withDetailsAppended, 100);

    // The scrollable area must grow by exactly the inserted row's size — no estimation, no drift.
    expect(viewport.totalContentSize).toBe(totalBefore + 176);
    expect(viewport.renderedRange.end).toBe(withDetailsAppended.length);
  });

  it('scrolls to the correct pixel offset for a given index', () => {
    const strategy = attach([56, 96, 176, 96]);
    strategy.scrollToIndex(2, 'smooth');
    expect(viewport.scrollToOffset).toHaveBeenCalledWith(56 + 96, 'smooth');
  });

  it('renders nothing when the list is empty', () => {
    attach([]);
    expect(viewport.renderedRange).toEqual({ start: 0, end: 0 });
    expect(viewport.totalContentSize).toBe(0);
  });

  it('leaves scrolledIndexChange unimplemented (never emits) — unused by this app, same call CDK\'s own autosize strategy makes', () => {
    const strategy = attach(new Array(10).fill(100), 30);
    const next = jest.fn();
    strategy.scrolledIndexChange.subscribe(next);

    viewport.scrollOffset = 320;
    strategy.onContentScrolled();

    expect(next).not.toHaveBeenCalled();
  });
});
