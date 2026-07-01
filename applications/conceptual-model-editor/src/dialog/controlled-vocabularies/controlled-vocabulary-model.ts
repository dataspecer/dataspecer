import { Qualifier } from "../components/select-qualifier";

export interface ControlledVocabulary {
  id: string;
  name: string;
  iri: string;
  regex: string;
  downloadUrl: string;
  docsUrl: string;
  source?: string;
}

export interface ControlledVocabularyUsage {
  vocabulary: ControlledVocabulary;
  qualifier: Qualifier;
}

export interface ControlledVocabularyOverride {
  vocabularyId: string;
  qualifier: Qualifier;
}
