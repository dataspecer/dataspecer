import { useAsyncMemo } from "../../../editor/hooks/use-async-memo";
import { useEffect } from "react";
import { Configuration } from "../configuration";
import { getConfiguration } from "../provided-configuration";

/**
 * Loads the configuration from the given IRIs and registers the stores properly
 * to be updated when modification occurs. This hook requires loaders that
 * decide how to load the configuration from the given IRIs.
 * @param dataSpecificationIri IRI of the whole specification
 * @param dataPsmSchemaIri IRI of the given PSM schema that will be updated
 */
export const useProvidedConfiguration = (dataSpecificationIri: string | null, dataPsmSchemaIri: string | null): Configuration | null => {
  const [configuration] = useAsyncMemo(() => getConfiguration(dataSpecificationIri, dataPsmSchemaIri), [dataSpecificationIri, dataPsmSchemaIri]);
  useEffect(() => {
    // @ts-ignore
    const modelStore = (configuration as any)?.modelStore;

    if (!modelStore) return;

    // WIP

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      // Undo: Ctrl/Cmd+Z (without Shift)
      if (mod && !e.shiftKey && key === "z") {
        e.preventDefault();
        if (typeof modelStore.undo === "function") modelStore.undo();
        return;
      }
      // Redo: Ctrl/Cmd+Shift+Z or Ctrl+Y
      if (mod && ((e.shiftKey && key === "z") || key === "y")) {
        e.preventDefault();
        if (typeof modelStore.redo === "function") modelStore.redo();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [configuration]);
  return configuration;
};
