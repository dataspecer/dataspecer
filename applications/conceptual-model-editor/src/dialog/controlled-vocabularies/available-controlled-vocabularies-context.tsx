/**
 * This provider is a temporary solution to provide access to controlled vocabulary models trough model-store.
 * This approach is used because the CME does not support frontend model store yet, 
 * so model store is used only to enable controlled vocabulary assignment component.
 * Once CME properly supports model store in the future, this provider and `useAvailableControlledVocabularies` should be unified.
 * This future work is recorded in issue#1558 https://github.com/dataspecer/dataspecer/issues/1558
 */
import React, { createContext, useContext, useMemo } from "react";
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";
import { useAvailableControlledVocabularies } from "./use-available-controlled-vocabularies";

interface AvailableControlledVocabularies {
  vocabularies: ControlledVocabulary[];
  /**
   * False until the vocabularies have been loaded, so an empty list can be
   * told apart from vocabularies that are still loading.
   */
  loaded: boolean;
}

const AvailableControlledVocabulariesContext = createContext<AvailableControlledVocabularies>({
  vocabularies: [],
  loaded: false,
});

/**
 * Loads every controlled vocabulary available under {@link packageId} once
 * and keeps it up to date via subscription, making it available to the
 * synchronous class-profile dialog-state builders below it via
 * {@link useAvailableControlledVocabulariesContext}.
 */
export const AvailableControlledVocabulariesProvider = (props: {
  packageId: string | null,
  children: React.ReactNode,
}) => {
  const { vocabularies, loading } = useAvailableControlledVocabularies(props.packageId);
  const value = useMemo(
    () => ({ vocabularies, loaded: !loading }),
    [vocabularies, loading]);

  return (
    <AvailableControlledVocabulariesContext.Provider value={value}>
      {props.children}
    </AvailableControlledVocabulariesContext.Provider>
  );
};

export function useAvailableControlledVocabulariesContext(): ControlledVocabulary[] {
  return useContext(AvailableControlledVocabulariesContext).vocabularies;
}

/**
 * @returns False while the available vocabularies are still loading.
 */
export function useAvailableControlledVocabulariesLoaded(): boolean {
  return useContext(AvailableControlledVocabulariesContext).loaded;
}
