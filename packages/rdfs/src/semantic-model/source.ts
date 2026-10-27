import type { VocabularySource } from "@dataspecer/core-v2/semantic-model/concepts";

/**
 * Describes a semantic model that is a federation of urls that contain web
 * vocabularies. Such model should contain all semantic entities that are
 * obtained from the urls combined.
 */
export interface VocabularySourceRdfs extends VocabularySource {
  type: "snapshot";
  provider: "rdfs";
  urls: string[];
}

export function isRdfsSnapshot(source: VocabularySource | null | undefined): source is VocabularySourceRdfs {
  return source?.type === "snapshot" && "provider" in source && source.provider === "rdfs";
}
