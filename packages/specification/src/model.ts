import { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { LanguageString, type CoreResource } from "@dataspecer/core/core/core-resource";

/**
 * Simplified structure for representing the semantic or profile model.
 * @todo Should be replace with more standardized structure, e.g. something from @dataspecer/core.
 */
export interface ModelDescription {
  isPrimary: boolean;
  documentationUrl: string | null;
  entities: Record<string, SemanticModelEntity>;
  baseIri: string | null;
  title: LanguageString | null;
}

export interface StructureModelDescription {
  id: string;
  entities: Record<string, CoreResource>;
}