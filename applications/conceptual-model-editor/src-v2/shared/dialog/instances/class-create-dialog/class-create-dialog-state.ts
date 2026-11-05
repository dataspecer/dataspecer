// State definitions for ClassCreateDialog
import { SelectModelState } from "../../components/select-model/select-model-state";
import { LanguageStringInputState } from "../../components/language-string-input/language-string-input-state";
import { IriInputState } from "../../components/iri-input/iri-input-state";
import { SelectEntitiesState } from "../../components/select-entities/select-entities-state";
import { StringInputState } from "../../components/string-input/string-input-state";

export interface ClassCreateDialogState {
  model: SelectModelState;
  name: LanguageStringInputState;
  iri: IriInputState;
  specializationOf: SelectEntitiesState;
  definition: LanguageStringInputState;
  externalDocumentationUrl: StringInputState;
  order: StringInputState;
}

export function createClassCreateDialogState(): ClassCreateDialogState {
  const placeholderClasses = [
    { id: "class-1", label: "Person" },
    { id: "class-2", label: "Organization" },
    { id: "class-3", label: "Event" },
  ];
  return {
    model: { value: null, items: [] },
    name: { active: null, defaultLanguage: "en", values: [] },
    iri: { value: "", base: "https://example.org/", inputMode: "relative" },
    specializationOf: { value: [], items: placeholderClasses, isSelectOpen: false, selectEntity: { value: null, items: placeholderClasses } },
    definition: { active: null, defaultLanguage: "en", values: [] },
    externalDocumentationUrl: { value: null },
    order: { value: null },
  };
}
