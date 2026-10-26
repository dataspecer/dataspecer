/**
 * This provider is a temporary solution to provide access to controlled vocabulary models trough model-store.
 * This approach is used because the CME does not support frontend model store yet, 
 * so model store is used only to enable controlled vocabulary assignment component.
 * Once CME properly supports model store in the future, this provider and `useAvailableControlledVocabularies` should be unified.
 * This future work is recorded in issue#1558 https://github.com/dataspecer/dataspecer/issues/1558
 */
import React, { createContext, useContext } from "react";
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";
import { useAvailableControlledVocabularies } from "./use-available-controlled-vocabularies";

const AvailableControlledVocabulariesContext = createContext<ControlledVocabulary[]>([]);

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
  const { vocabularies } = useAvailableControlledVocabularies(props.packageId);

  return (
    <AvailableControlledVocabulariesContext.Provider value={vocabularies}>
      {props.children}
    </AvailableControlledVocabulariesContext.Provider>
  );
};

export function useAvailableControlledVocabulariesContext(): ControlledVocabulary[] {
  return useContext(AvailableControlledVocabulariesContext);
}
