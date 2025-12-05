import { HexColor } from "@dataspecer/visual-model";
import { createEmptyUiModelState, UiModelState } from "./ui-model-state";
import {
  UI_CLASS_PROFILE_TYPE,
  UI_CLASS_TYPE,
  UI_RELATIONSHIP_PROFILE_TYPE,
  UI_RELATIONSHIP_TYPE,
  UiClass,
  UiClassProfile,
  UiEntity,
  UiRelationship,
  UiRelationshipProfile,
  UiSemanticModel,
} from "./model";
import { CmeSemanticModelType } from "../cme-model";
import { UiModelApi, wrapUiModelStateToUiModelApi } from "./ui-model-api";

export interface UiModelStateBuilder {

  semanticModel(value?: Partial<UiSemanticModel>): SemanticModelBuilder;

  buildState(): UiModelState;

  buildApi(): UiModelApi;

}

interface SemanticModelBuilder {

  class(value?: Partial<UiClass>): EntityBuilder;

  classProfile(value?: Partial<UiClassProfile>): EntityBuilder;

}

interface EntityBuilder {

  attribute(value?: Partial<UiRelationship>): EntityBuilder;

  attributeProfile(value?: Partial<UiRelationshipProfile>): EntityBuilder;

  association(value?: Partial<UiRelationship>): EntityBuilder;

  associationProfile(value?: Partial<UiRelationshipProfile>): EntityBuilder;

}

class DefaultUiModelStateBuilder implements UiModelStateBuilder {

  state: UiModelState;

  counter: number = 0;

  constructor(languages: string[], defaultColor: HexColor) {
    this.state = createEmptyUiModelState(languages[0], languages, defaultColor);
  }

  semanticModel(value?: Partial<UiSemanticModel>): SemanticModelBuilder {
    const identifier = `${this.counter++}`.padStart(3, "0");
    const model: UiSemanticModel = {
      identifier,
      color: identifier + "-color",
      label: identifier + "-label",
      modelType: CmeSemanticModelType.DefaultSemanticModel,
      ...(value ?? {}),
    };
    this.state.semanticModels.push(model);
    return new DefaultSemanticModelBuilder(this.state, model);
  }

  buildState() {
    return this.state;
  }

  buildApi(): UiModelApi {
    return wrapUiModelStateToUiModelApi(this.state);
  }

}

class DefaultSemanticModelBuilder implements SemanticModelBuilder {

  state: UiModelState;

  model: UiSemanticModel;

  counter: number = 0;

  constructor(state: UiModelState, model: UiSemanticModel) {
    this.state = state;
    this.model = model;
  }

  class(value?: Partial<UiClass>): EntityBuilder {
    const identifier = value?.identifier ??
      this.model.identifier + "-" + `${this.counter++}`.padStart(3, "0");
    const entity: UiClass = {
      type: UI_CLASS_TYPE,
      identifier,
      label: identifier + "-label",
      description: identifier + "-description",
      iri: identifier + "-iri",
      model: this.model,
      ...(value ?? {}),
    };
    this.state.classes.push(entity);
    return new DefaultEntityBuilder(this, entity);
  }

  classProfile(value?: Partial<UiClassProfile>): EntityBuilder {
    const identifier = value?.identifier ??
      this.model.identifier + "-" + `${this.counter++}`.padStart(3, "0");
    const entity: UiClassProfile = {
      type: UI_CLASS_PROFILE_TYPE,
      identifier,
      label: identifier + "-label",
      description: identifier + "-description",
      iri: identifier + "-iri",
      model: this.model,
      profiling: [],
      usageNote: identifier + "-usage-note",
      ...(value ?? {}),
    };
    this.state.classProfiles.push(entity);
    return new DefaultEntityBuilder(this, entity);
  }

}

class DefaultEntityBuilder implements EntityBuilder {

  builder: DefaultSemanticModelBuilder;

  state: UiModelState;

  model: UiSemanticModel;

  domain: UiEntity;

  constructor(builder: DefaultSemanticModelBuilder, domain: UiEntity) {
    this.builder = builder;
    this.state = builder.state;
    this.model = builder.model;
    this.domain = domain;
  }

  attribute(value?: Partial<UiRelationship>): EntityBuilder {
    const identifier = value?.identifier ??
      this.builder.model.identifier + "-" +
      `${this.builder.counter++}`.padStart(3, "0");
    const entity: UiRelationship = {
      type: UI_RELATIONSHIP_TYPE,
      identifier,
      label: identifier + "-label",
      domain: this.domain,
      domainCardinality: null,
      range: this.state.primitiveTypes[0],
      rangeCardinality: null,
      model: this.model,
      ...(value ?? {}),
    };
    this.state.relationships.push(entity);
    return this;
  }

  attributeProfile(value?: Partial<UiRelationshipProfile>): EntityBuilder {
    const identifier = value?.identifier ??
      this.builder.model.identifier + "-" +
      `${this.builder.counter++}`.padStart(3, "0");
    const entity: UiRelationshipProfile = {
      type: UI_RELATIONSHIP_PROFILE_TYPE,
      identifier,
      label: identifier + "-label",
      domain: this.domain,
      domainCardinality: null,
      range: this.state.primitiveTypes[0],
      rangeCardinality: null,
      model: this.model,
      profiling: [],
      usageNote: identifier + "-usage-note",
      mandatoryLevel: null,
      ...(value ?? {}),
    };
    this.state.relationshipProfiles.push(entity);
    return this;
  }

  association(value?: Partial<UiRelationship>): EntityBuilder {
    const identifier = value?.identifier ??
      this.builder.model.identifier + "-" +
      `${this.builder.counter++}`.padStart(3, "0");
    const entity: UiRelationship = {
      type: UI_RELATIONSHIP_TYPE,
      identifier,
      label: identifier + "-label",
      domain: this.domain,
      domainCardinality: null,
      range: this.state.unknownUiEntity,
      rangeCardinality: null,
      model: this.model,
      ...(value ?? {}),
    };
    this.state.relationships.push(entity);
    return this;
  }

  associationProfile(value?: Partial<UiRelationshipProfile>): EntityBuilder {
    const identifier = value?.identifier ??
      this.builder.model.identifier + "-" +
      `${this.builder.counter++}`.padStart(3, "0");
    const entity: UiRelationshipProfile = {
      type: UI_RELATIONSHIP_PROFILE_TYPE,
      identifier,
      label: identifier + "-label",
      domain: this.domain,
      domainCardinality: null,
      range: this.state.unknownUiEntity,
      rangeCardinality: null,
      model: this.model,
      profiling: [],
      usageNote: identifier + "-usage-note",
      mandatoryLevel: null,
      ...(value ?? {}),
    };
    this.state.relationshipProfiles.push(entity);
    return this;
  }

}

export function createDefaultUiModelStateBuilder(
  languages: string[],
  defaultColor: HexColor,
): UiModelStateBuilder {
  return new DefaultUiModelStateBuilder(languages, defaultColor);
}