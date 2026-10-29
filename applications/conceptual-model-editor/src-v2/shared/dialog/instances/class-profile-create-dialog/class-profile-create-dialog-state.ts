// State definitions for ClassProfileCreateDialog
import { SelectModelState } from "../../components/select-model/select-model-state";
import { IriInputState } from "../../components/iri-input/iri-input-state";
import { StringInputState } from "../../components/string-input/string-input-state";
import { LanguageStringInputState } from "../../components/language-string-input/language-string-input-state";
import { SelectEntitiesState } from "../../components/select-entities/select-entities-state";
import { SelectOptionState } from "../../components/select-option";

export interface ClassProfileCreateDialogState {
  model: SelectModelState;
  profileOf: SelectEntitiesState;
  name: LanguageStringInputState;
  iri: IriInputState;
  specializationOf: SelectEntitiesState;
  definition: LanguageStringInputState;
  usageNote: LanguageStringInputState;
  externalDocumentationUrl: StringInputState;
  order: StringInputState;
  role: SelectOptionState;
}

export function createClassProfileCreateDialogState(): ClassProfileCreateDialogState {
  // Placeholder initialisation – empty values
  return {
    model: { value: null, items: [
      {identifier:"",displayLabel: "Option 1", displayColor:"#4b2d9d"},
      {identifier:"",displayLabel: "Option 2", displayColor:"#19c58c"},
      {identifier:"",displayLabel: "Option 3", displayColor:"#ecd633"},
    ] },
    profileOf: {
      value: [],
      items: [
        { id: "dsa", label: "1fdsfds" },
        { id: "dsgfda", label: "2fdsfds" },
        { id: "dsdfga", label: "3fdsfds" }
      ],
      isSelectOpen: false,
      selectEntity: {
        value: null,
        // Do items je potřeba předat dostupné položky:
        items: [
          { id: "dsa", label: "1fdsfds" },
          { id: "dsgfda", label: "2fdsfds" },
          { id: "dsdfga", label: "3fdsfds" }
        ]
      }
    },
    name: { active: null, defaultLanguage:"en", values: [] },
    iri: { value: "", base: null, inputMode: "absolute" },
    specializationOf: { value: [], items: [], isSelectOpen: false, selectEntity: { value: null, items: [] } },
    definition: { active: null, defaultLanguage:"en", values: [] },
    usageNote: { active: null, defaultLanguage:"en", values: [] },
    externalDocumentationUrl: { value: null },
    order: { value: null },
    role: {options:[
      {label: "Undefined", value:"Undefined"},
      {label: "Main", value:"Main"},
      {label: "Supportive", value:"Supportive"},
    ], value:"Undefined"},
  };
}
