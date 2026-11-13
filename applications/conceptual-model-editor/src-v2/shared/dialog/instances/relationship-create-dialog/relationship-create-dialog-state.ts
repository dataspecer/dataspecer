// State definitions for RelationshipCreateDialog
import { SelectModelState } from "../../components/select-model/select-model-state";
import { LanguageStringInputState } from "../../components/language-string-input/language-string-input-state";
import { IriInputState } from "../../components/iri-input/iri-input-state";
import { SelectEntitiesState } from "../../components/select-entities/select-entities-state";
import { SelectEntityState } from "../../components/select-entity/select-entity-state";
import { StringInputState } from "../../components/string-input/string-input-state";

export interface RelationshipCreateDialogState {
  model: SelectModelState;
  name: LanguageStringInputState;
  iri: IriInputState;
  specializationOf: SelectEntitiesState;
  definition: LanguageStringInputState;
  domain: SelectEntityState;
  range: SelectEntityState;
  externalDocumentationUrl: StringInputState;
  order: StringInputState;
}

export function createRelationshipCreateDialogState(): RelationshipCreateDialogState {
  const placeholderClasses = [
    { id: "class-1", label: "Person" },
    { id: "class-2", label: "Organization" },
    { id: "class-3", label: "Event" },
  ];
  const placeholderRelationships = [
    { id: "rel-1", label: "knows" },
    { id: "rel-2", label: "worksFor" },
    { id: "rel-3", label: "participatesIn" },
  ];
  return {
    model: { value: null, items: [] },
    name: { active: null, defaultLanguage: "en", values: [] },
    iri: { value: "", base: "https://example.org/", inputMode: "relative" },
    specializationOf: { value: [], items: placeholderRelationships, isSelectOpen: false, selectEntity: { value: null, items: placeholderRelationships } },
    definition: { active: null, defaultLanguage: "en", values: [] },
    domain: { value: null, items: placeholderClasses },
    range: { value: null, items: placeholderClasses },
    externalDocumentationUrl: { value: null },
    order: { value: null },
  };
}
