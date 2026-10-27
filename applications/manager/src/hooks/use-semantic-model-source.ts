import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { VocabularySource } from "@dataspecer/core-v2/semantic-model/concepts";
import type { BaseResource } from "@dataspecer/core/project-model/legacy";
import { useAsyncMemo } from "./use-async-memo";

export function useSemanticModelSource(resource: BaseResource) {
  return useAsyncMemo<{ source: VocabularySource | null; error: string | null }>(async () => {
    if (!resource.types.includes(LOCAL_SEMANTIC_MODEL)) return { source: null, error: null };
    try {
      const response = await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(resource.iri));
      if (!response.ok) throw new Error(`Failed to load vocabulary source (${response.status}).`);
      const data = await response.json() as { source?: VocabularySource };
      return { source: data?.source ?? null, error: null };
    } catch (error) {
      return { source: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [resource.iri, resource.types[0], resource.metadata?.modificationDate]);
}
