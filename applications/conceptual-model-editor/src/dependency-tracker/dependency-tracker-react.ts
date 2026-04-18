import { useMemo } from "react";

import { useModelObserver } from "./model-observer";
import { useModelGraphContext } from "../context/model-context";
import { createDependencyTracker, Tracker } from "./dependency-tracker";

/**
 * Track changes of entities using given trackers.
 */
export function useDependencyTrackers(trackers: Tracker[]) {
  const modelGraphContext = useModelGraphContext();
  const entityModels = modelGraphContext.models;
  const visualModels = modelGraphContext.visualModels;

  const dependencyTracker = useMemo(
    () => createDependencyTracker(trackers),
    [trackers]);

  useModelObserver(entityModels, visualModels, dependencyTracker);
}
