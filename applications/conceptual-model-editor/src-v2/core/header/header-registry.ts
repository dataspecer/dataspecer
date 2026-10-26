import { ComponentType } from "react";
import { ModelIdentifier } from "@dataspecer/core/model";
import { createRegistry } from "../shared/registry";

export const headerRegionRegistry = createRegistry<HeaderRegionContribution>();

/**
 * Slot a header region is placed in. "start" sits next to the logo (package
 * info, view selector, ...); "end" sits before the shell's own chrome
 * (language, theme) and hosts action buttons.
 */
export type HeaderRegionSlot = "start" | "end";

/**
 * Contribution of a region to the header. A region is a self-contained widget
 * that owns its own data subscription and actions; the shell only positions it.
 */
export interface HeaderRegionContribution {

  id: string;

  /**
   * Where in the bar to place the region. Defaults to "start".
   */
  slot?: HeaderRegionSlot;

  /**
   * Ordering within a slot, ascending. Defaults to 0.
   */
  order?: number;

  component: ComponentType<HeaderRegionProps>;

}

export interface HeaderRegionProps {

  /**
   * Currently active visual model.
   */
  activeVisualModel: ModelIdentifier | null;

}
