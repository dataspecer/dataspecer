/**
 * Mixin interface for entities that support custom sort ordering.
 *
 * Uses natural sort order; items without an order value are placed at the end.
 */
export interface OrderedThing {

  /**
   * Optional ordering string for custom sorting in documentation.
   * Uses natural sort order, items without order are placed at the end.
   */
  order?: string | null;

}
