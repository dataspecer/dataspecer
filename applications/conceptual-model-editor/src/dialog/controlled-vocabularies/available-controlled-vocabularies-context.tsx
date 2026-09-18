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
