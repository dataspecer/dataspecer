// State definitions for RelationshipProfileCreateDialog
import { SelectModelState } from "../../components/select-model/select-model-state";
import { SelectEntitiesState } from "../../components/select-entities/select-entities-state";
import { SelectEntityState } from "../../components/select-entity/select-entity-state";
import { IriInputState } from "../../components/iri-input/iri-input-state";
import { LanguageStringInputState } from "../../components/language-string-input/language-string-input-state";
import { SelectCardinalityState } from "../../components/select-cardinality/select-cardinality-state";
import { StringInputState } from "../../components/string-input/string-input-state";
import { SelectOptionState } from "../../components/select-option";
import { Underline } from "lucide-react";

export interface RelationshipProfileCreateDialogState {
  model: SelectModelState;
  profileOf: SelectEntitiesState;
  domain: SelectEntityState;
  iri: IriInputState;
  specializationOf: SelectEntitiesState;
  usageNote: LanguageStringInputState;
  domainCardinality: SelectCardinalityState;
  range: SelectEntityState;
  rangeCardinality: SelectCardinalityState;
  externalDocumentationUrl: StringInputState;
  order: StringInputState;
  mandatoryLevel: SelectOptionState;
}

export function createRelationshipProfileCreateDialogState(): RelationshipProfileCreateDialogState {
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
    model: {
      value: null,
      items: [
        { identifier: "model-1", displayLabel: "Model A", displayColor: "#4b2d9d" },
        { identifier: "model-2", displayLabel: "Model B", displayColor: "#19c58c" },
        { identifier: "model-3", displayLabel: "Model C", displayColor: "#ecd633" },
      ],
    },
    profileOf: {
      value: [],
      items: placeholderRelationships,
      isSelectOpen: false,
      selectEntity: { value: null, items: placeholderRelationships },
    },
    domain: { value: null, items: placeholderClasses },
    iri: { value: "", base: "https://example.org/", inputMode: "relative" },
    specializationOf: {
      value: [],
      items: placeholderRelationships,
      isSelectOpen: false,
      selectEntity: { value: null, items: placeholderRelationships },
    },
    usageNote: { active: null, defaultLanguage: "en", values: [] },
    domainCardinality: { value: null },
    range: { value: null, items: placeholderClasses },
    rangeCardinality: { value: null },
    externalDocumentationUrl: { value: null },
    order: { value: null },
    mandatoryLevel: { value: "Undefined", options:[
      {label: "Undefined", value: "Undefined"},
      {label: "Mandatory", value: "Mandatory"},
      {label: "Recomended", value: "Recomended"},
      {label: "Optional", value: "Optional"}
    ] },
  };
}
