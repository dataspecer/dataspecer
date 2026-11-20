// State definitions for AttributeProfileCreateDialog
import { SelectModelState } from "../../components/select-model/select-model-state";
import { SelectEntityState } from "../../components/select-entity/select-entity-state";
import { IriInputState } from "../../components/iri-input/iri-input-state";
import { LanguageStringInputState } from "../../components/language-string-input/language-string-input-state";
import { SelectCardinalityState } from "../../components/select-cardinality/select-cardinality-state";
import { StringInputState } from "../../components/string-input/string-input-state";
import { SelectOptionState } from "../../components/select-option";

export interface AttributeProfileCreateDialogState {
  model: SelectModelState;
  name: LanguageStringInputState;
  domain: SelectEntityState;
  iri: IriInputState;
  definition: LanguageStringInputState;
  usageNote: LanguageStringInputState;
  domainCardinality: SelectCardinalityState;
  range: SelectEntityState;
  rangeCardinality: SelectCardinalityState;
  externalDocumentationUrl: StringInputState;
  order: StringInputState;
  // Mandatory level using SelectOption component
  mandatoryLevel: SelectOptionState;
}

export function createAttributeProfileCreateDialogState(): AttributeProfileCreateDialogState {
  const placeholderClasses = [
    { id: "class-1", label: "Person" },
    { id: "class-2", label: "Organization" },
    { id: "class-3", label: "Event" },
  ];

  return {
    model: {
      value: null,
      items: [
        { identifier: "model-1", displayLabel: "Model A", displayColor: "#4b2d9d" },
        { identifier: "model-2", displayLabel: "Model B", displayColor: "#19c58c" },
        { identifier: "model-3", displayLabel: "Model C", displayColor: "#ecd633" },
      ],
    },
    name: { active: null, defaultLanguage: "en", values: [] },
    domain: { value: null, items: placeholderClasses },
    iri: { value: "", base: "https://example.org/", inputMode: "relative" },
    definition: { active: null, defaultLanguage: "en", values: [] },
    usageNote: { active: null, defaultLanguage: "en", values: [] },
    domainCardinality: { value: null },
    range: { value: null, items: placeholderClasses },
    rangeCardinality: { value: null },
    externalDocumentationUrl: { value: null },
    order: { value: null },
    mandatoryLevel: {
      value: null,
      options: [
        { label: "Undefined", value: null },
        { label: "Mandatory", value: "Mandatory" },
        { label: "Recomended", value: "Recomended" },
        { label: "Optional", value: "Optional" },
      ],
    },
  };
}
