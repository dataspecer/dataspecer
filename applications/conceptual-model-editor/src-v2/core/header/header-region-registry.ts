import { ComponentType } from "react";
import { ModelIdentifier } from "@dataspecer/core/model";
import { createRegistry } from "../shared/registry";

export const headerRegionRegistry = createRegistry<HeaderRegionContribution>();

/**
 * Lets a feature contribute a self-contained region to the header shell.
 * The contributed component owns its own data subscription and actions.
 */
export interface HeaderRegionContribution {

  id: string;

  component: ComponentType<HeaderRegionProps>;

}

export interface HeaderRegionProps {

  /**
   * Currently active visual model.
   */
  activeVisualModel: ModelIdentifier | null;

}
