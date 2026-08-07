import { Directive, forwardRef, Input, OnChanges } from '@angular/core';
import { VIRTUAL_SCROLL_STRATEGY } from '@angular/cdk/scrolling';
import { RowSizeVirtualScrollStrategy } from './row-size-virtual-scroll-strategy';

/**
 * Provides a `RowSizeVirtualScrollStrategy` to a `cdk-virtual-scroll-viewport[rowSizes]`.
 * Mirrors how `@angular/cdk/scrolling`'s own `CdkFixedSizeVirtualScroll` wires up
 * `FixedSizeVirtualScrollStrategy` (an internal strategy instance, refreshed via `ngOnChanges`,
 * exposed to the viewport through the `VIRTUAL_SCROLL_STRATEGY` DI token).
 */
@Directive({
  selector: 'cdk-virtual-scroll-viewport[rowSizes]',
  standalone: true,
  providers: [
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useFactory: (dir: CdkRowSizeVirtualScroll) => dir.scrollStrategy,
      deps: [forwardRef(() => CdkRowSizeVirtualScroll)]
    }
  ]
})
export class CdkRowSizeVirtualScroll implements OnChanges {
  /** The pixel height of every row currently in the list, in order. */
  @Input('rowSizes') sizes: number[] = [];
  /** How far beyond the visible viewport (in pixels) to keep rows rendered, in each direction. */
  @Input() bufferPx = 200;

  readonly scrollStrategy = new RowSizeVirtualScrollStrategy(this.sizes, this.bufferPx);

  ngOnChanges(): void {
    this.scrollStrategy.updateItemSizesAndBuffer(this.sizes, this.bufferPx);
  }
}
