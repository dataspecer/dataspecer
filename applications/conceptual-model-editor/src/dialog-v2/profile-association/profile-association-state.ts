import {
  SelectModelState,
  LanguageStringInputState,
  IriInputState,
  SelectEntityState,
  StringInputState,
  SelectEntitiesState,
  SelectCardinalityState,
  ProfileValueState,
} from "../shared/";

export interface ProfileAssociationState {

  // Editable state.

  model: SelectModelState;

  iri: IriInputState;

  name: ProfileValueState<LanguageStringInputState>;

  description: ProfileValueState<LanguageStringInputState>;

  usageNote: ProfileValueState<LanguageStringInputState>;

  profileOf: SelectEntitiesState;

  specializationOf: SelectEntitiesState;

  externalDocumentationUrl: StringInputState;

  order: StringInputState;

  mandatoryLevel: SelectEntityState;

  domain: SelectEntityState;

  domainCardinality: ProfileValueState<SelectCardinalityState>;

  range: SelectEntityState;

  rangeCardinality: ProfileValueState<SelectCardinalityState>;

}
