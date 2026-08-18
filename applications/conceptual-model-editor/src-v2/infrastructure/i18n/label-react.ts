import React, { useContext } from "react";
import { LabelSelector } from "./label-selector";

const LabelSelectorContext = React.createContext<LabelSelector>(
  null as unknown as LabelSelector);

export function useLabelSelector(): LabelSelector {
  return useContext(LabelSelectorContext);
}

export function WithLabelSelector(props: {
  value: LabelSelector,
  children: React.ReactNode,
}) {
  return React.createElement(LabelSelectorContext.Provider, props);
}
