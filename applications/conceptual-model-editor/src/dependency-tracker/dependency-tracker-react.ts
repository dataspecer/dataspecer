import { useMemo } from "react";

import { useModelObserver } from "./model-observer";
import { createDependencyTracker, Tracker } from "./dependency-tracker";
import { useClassesContext } from "../context/classes-context";

/**
 * Track changes of entities using given trackers.
 */
export function useDependencyTrackers(trackers: Tracker[]) {
  const classesContext = useClassesContext();
  const entityModels = classesContext.semanticModels;
  const visualModels = classesContext.visualModels;

  const dependencyTracker = useMemo(
    () => createDependencyTracker(trackers),
    [trackers]);

  useModelObserver(entityModels, visualModels, dependencyTracker);
}
