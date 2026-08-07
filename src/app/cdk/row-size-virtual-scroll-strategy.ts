import { CdkVirtualScrollViewport, VirtualScrollStrategy } from '@angular/cdk/scrolling';
import { Observable } from 'rxjs';

/**
 * A `VirtualScrollStrategy` for lists whose items have known, deterministic sizes that vary
 * per-item (header row vs. user row vs. details row) — item sizes are declared via
 * `setItemSizes()`, never measured from the DOM. Callers must ensure each rendered row's actual
 * CSS height matches its declared size exactly.
 *
 * Why not CDK's own strategies: `FixedSizeVirtualScrollStrategy` only supports one uniform size
 * for every item. `@angular/cdk-experimental`'s `autosize` supports varying sizes, but estimates
 * total content size from a running average across everything it's rendered — mixing our very
 * different row kinds into one average made that estimate unreliable (most visibly: the
 * scrollable area grew/shrank inconsistently when expanding a row near the end of a long list).
 * Declaring exact sizes up front avoids estimating altogether.
 *
 * The render-range math recomputes the ideal window directly from the current scroll offset on
 * every call — no incremental "only expand once the buffer runs low" bookkeeping. That's safe
 * unconditionally because `CdkVirtualScrollViewport.setRenderedRange()`/`setRenderedContentOffset()`
 * both already no-op when given a value they already hold (see `@angular/cdk/scrolling`), so
 * recomputing every time costs a cheap array scan, not a redundant re-render.
 *
 * `scrolledIndexChange` is left unimplemented (never emits) — nothing in this app reads it, and
 * CDK's own `autosize` strategy makes the same call for the same reason.
 */
export class RowSizeVirtualScrollStrategy implements VirtualScrollStrategy {
  /** @docs-private Implemented as part of VirtualScrollStrategy. Unused — see class doc. */
  readonly scrolledIndexChange: Observable<number> = new Observable();

  private viewport: CdkVirtualScrollViewport | null = null;
  private bufferPx: number;
  /** Prefix sums: offsets[i] = pixel offset of item i's top edge; offsets[length] = total size. */
  private offsets: number[] = [0];

  constructor(sizes: number[], bufferPx: number) {
    this.bufferPx = bufferPx;
    this.setOffsets(sizes);
  }

  /** Update the declared per-item sizes and/or buffer size, and recompute what should render. */
  updateItemSizesAndBuffer(sizes: number[], bufferPx: number): void {
    this.bufferPx = bufferPx;
    this.setOffsets(sizes);
    this.refresh();
  }

  attach(viewport: CdkVirtualScrollViewport): void {
    this.viewport = viewport;
    this.refresh();
  }

  detach(): void {
    this.viewport = null;
  }

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  onContentScrolled(): void {
    this.updateRenderedRange();
  }

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  onDataLengthChanged(): void {
    this.refresh();
  }

  // @docs-private Implemented as part of VirtualScrollStrategy. Both no-ops: sizes are declared,
  // not measured, and we always set the rendered offset ourselves.
  onContentRendered(): void {}
  onRenderedOffsetChanged(): void {}

  scrollToIndex(index: number, behavior: ScrollBehavior): void {
    const clamped = Math.min(Math.max(index, 0), this.offsets.length - 1);
    this.viewport?.scrollToOffset(this.offsets[clamped], behavior);
  }

  private setOffsets(sizes: number[]): void {
    const offsets = [0];
    for (const size of sizes) {
      offsets.push(offsets[offsets.length - 1] + size);
    }
    this.offsets = offsets;
  }

  /**
   * The index of the row spanning the given pixel offset. A plain left-to-right scan: lists here
   * top out around a few thousand rows (the whole flattened, ungrouped user list), so this is a
   * negligible cost per scroll frame — not worth a binary search.
   */
  private indexAtOffset(offset: number): number {
    const lastIndex = this.offsets.length - 2;
    for (let i = 0; i <= lastIndex; i++) {
      if (this.offsets[i + 1] > offset) {
        return i;
      }
    }
    return Math.max(0, lastIndex);
  }

  private refresh(): void {
    const total = this.offsets[this.offsets.length - 1];
    this.viewport?.setTotalContentSize(total);
    this.updateRenderedRange();
  }

  private updateRenderedRange(): void {
    if (!this.viewport) {
      return;
    }

    // No dataLength===0 special case needed: indexAtOffset degrades to 0 on an empty `offsets`,
    // and the `Math.min(dataLength, ...)` below clamps `end` to 0 regardless — the general
    // formula already produces {start: 0, end: 0} for an empty list on its own.
    const dataLength = this.offsets.length - 1;
    const viewportSize = this.viewport.getViewportSize();
    const totalSize = this.offsets[dataLength];
    const scrollOffset = Math.max(0, Math.min(totalSize, this.viewport.measureScrollOffset()));

    const start = this.indexAtOffset(Math.max(0, scrollOffset - this.bufferPx));
    const end = Math.min(dataLength, this.indexAtOffset(scrollOffset + viewportSize + this.bufferPx) + 1);

    this.viewport.setRenderedRange({ start, end });
    this.viewport.setRenderedContentOffset(this.offsets[start]);
  }
}
