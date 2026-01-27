import { RequirementLevel } from "@dataspecer/data-specification-vocabulary";
import {
  StructureClass,
  StructureModel,
  StructureProperty,
  StructurePropertyType,
} from "./structure-model.ts";

export interface StructureModelBuilder {

  class: (iri: string, value?: Partial<StructureClass>)
    => StructureClassBuilder;

  build: () => StructureModel;

}

export interface StructureClassBuilder {

  attribute: (iri: string, value?: Partial<StructureProperty>) => void;

  association: (iri: string, value?: Partial<StructureProperty>) => void;

}

export interface StructurePropertyBuilder {

}

class DefaultStructureModelBuilder implements StructureModelBuilder {

  readonly classes: StructureClass[] = [];

  class(iri: string, value?: Partial<StructureClass>): StructureClassBuilder {
    const next: StructureClass = {
      ...this.defaultStructureClass(iri),
      ...value ?? {},
    };
    this.classes.push(next);
    return new DefaultStructureClassBuilder(this, next);
  }

  private defaultStructureClass(iri: string): StructureClass {
    return {
      iri,
      name: {},
      nameSource: null,
      description: {},
      descriptionSource: null,
      usageNote: {},
      usageNoteSource: null,
      specializationOf: [],
      properties: [],
      rdfTypes: [iri],
    };
  }

  build(): StructureModel {
    return { classes: this.classes };
  }

}

class DefaultStructureClassBuilder implements StructureClassBuilder {

  readonly builder: DefaultStructureModelBuilder;

  readonly value: StructureClass;

  constructor(builder: DefaultStructureModelBuilder, value: StructureClass) {
    this.builder = builder;
    this.value = value;
  }


  attribute(iri: string, value?: Partial<StructureProperty>): void {
    const property: StructureProperty = {
      ...this.defaultStructureProperty(iri),
      ...value ?? {},
      type: StructurePropertyType.PrimitiveProperty,
    };
    this.value.properties.push(property);
  }

  private defaultStructureProperty(iri: string): StructureProperty {
    return {
      iri,
      name: {},
      nameSource: null,
      description: {},
      descriptionSource: null,
      usageNote: {},
      usageNoteSource: null,
      specializationOf: [],
      rdfPredicates: [iri],
      range: [],
      rangeCardinality: { min: null, max: null },
      type: StructurePropertyType.Undecidable,
      requirementLevel: RequirementLevel.undefined,
    };
  }

  association(iri: string, value?: Partial<StructureProperty>): void {
    const property: StructureProperty = {
      ...this.defaultStructureProperty(iri),
      ...value ?? {},
      type: StructurePropertyType.ComplexProperty,
    };
    this.value.properties.push(property);
  }

}

export function createStructureModelBuilder(): StructureModelBuilder {
  return new DefaultStructureModelBuilder();
}
