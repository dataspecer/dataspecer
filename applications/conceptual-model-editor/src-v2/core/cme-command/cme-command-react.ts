import React, { useContext, useMemo } from "react";

import { Logger } from "../../infrastructure/logger";
import { cmeCommandRegistry } from "./cme-command-registry";
import { CmeDataspecerPackageApi } from "../../infrastructure/dataspecer";
import { UrlQuery } from "../../application/url-query";
import { CmeCommandContext, CmeCommandExecutor } from "./cme-command-executor";

export function useCmeCommandExecutor(): CmeCommandExecutor {
  return useContext(CmeCommandExecutorContext);
}

export function WithCmeCommandExecutor(props: {
  dataspecer: CmeDataspecerPackageApi,
  logger: Logger,
  setQuery: (value: Partial<UrlQuery>) => void,
  children: React.ReactNode,
}) {
  const { dataspecer, logger, setQuery } = props;

  // Create instance.

  const executor = useMemo<CmeCommandExecutor>(() => {
    const context = createCmeCommandContext(dataspecer, logger, setQuery);
    // Executor is just a single function.
    return {
      execute: (command) => context.execute(command),
    };
  }, [dataspecer, logger, setQuery]);

  // Render with context.

  return React.createElement(CmeCommandExecutorContext.Provider, {
    value: executor,
    children: props.children,
  });
}

function createCmeCommandContext(
  dataspecer: CmeDataspecerPackageApi,
  logger: Logger,
  setQuery: (value: Partial<UrlQuery>) => void,
): CmeCommandContext {

  const context: CmeCommandContext = {
    execute() {
      // This is just a placeholder we replace this method later.
      return null as any;
    },
    setActiveVisualModel(visualModel) {
      setQuery({ viewId: visualModel });
    },
    dataspecer,
  };

  context.execute = (command) => {
    logger.trace("Command", { command });
    const registered = cmeCommandRegistry.get(command.id);
    if (registered === null) {
      logger.critical("Can not execute a command.", { command })
      throw Error("Unknown command!");
    }
    return registered.handler(context, command.args);
  };

  return context;
}

const CmeCommandExecutorContext = React.createContext<CmeCommandExecutor>({
  execute() {
    throw Error("Using uninitialized command executor!");
  },
});
