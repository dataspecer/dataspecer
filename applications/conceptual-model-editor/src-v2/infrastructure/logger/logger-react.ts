import React, { useContext } from "react";
import { Logger } from "./logger";

export function useLogger(): Logger {
  return useContext(LoggerContext);
}

const LoggerContext = React.createContext<Logger>(null as any);

export function WithLogger(
  props: { value: Logger, children: React.ReactNode },
) {
  return React.createElement(LoggerContext.Provider, props);
}
