import { UserGivenAlgorithmConfigurations } from "@dataspecer/layout";
import React, { useContext } from "react";

export type LayoutConfigurationContextType = {
  layoutConfiguration: UserGivenAlgorithmConfigurations;
  setLayoutConfiguration: (next: UserGivenAlgorithmConfigurations) => void;
};

export const LayoutConfigurationContext = React.createContext(null as any);

export const useLayoutConfigurationContext = () => {
  return useContext(LayoutConfigurationContext);
};
