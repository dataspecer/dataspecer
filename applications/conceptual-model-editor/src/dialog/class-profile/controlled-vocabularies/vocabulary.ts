import { Qualifier } from "../../components/select-qualifier";

export interface Vocabulary {
  id: string;
  name: string;
  iri: string;
  regex: string;
  downloadUrl: string;
  docsUrl: string;
  source?: string;
}

export interface VocabularyUsage {
  vocabulary: Vocabulary;
  qualifier: Qualifier;
}

export interface VocabularyOverride {
  vocabularyId: string;
  qualifier: Qualifier;
}
