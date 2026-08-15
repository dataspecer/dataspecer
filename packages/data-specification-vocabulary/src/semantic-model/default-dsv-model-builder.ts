import {
  ApplicationProfile,
  ClassProfile,
  ClassProfileType,
  ClassRole,
  DatatypePropertyProfile,
  DatatypePropertyProfileType,
  DSV_REUSE_DESCRIPTION,
  DSV_REUSE_LABEL,
  ObjectPropertyProfile,
  ObjectPropertyProfileType,
  PropertyProfile,
  RequirementLevel,
} from "./dsv-model.ts";
import {
  ApplicationProfileBuilder,
  DsvClassProfileBuilder,
  DsvDatatypePropertyProfileBuilder,
  DsvObjectPropertyProfileBuilder,
  IdentifiableBuilder,
  ReusesPropertyValue,
} from "./dsv-model-builder.ts";

function identifierOf(value: IdentifiableBuilder | string): string {
  return typeof value === "string" ? value : value.identifier;
}

/**
 * If given value is not in the given array, push it to the end.
 */
function addToArray<T>(value: T, items: T[]): void {
  if (!items.includes(value)) {
    items.push(value);
  }
}

class DefaultApplicationProfileBuilder implements ApplicationProfileBuilder {

  counter = 0;

  readonly iri: string;

  readonly baseIdentifier: string;

  readonly classProfiles: ClassProfile[] = [];

  readonly datatypePropertyProfiles: DatatypePropertyProfile[] = [];

  readonly objectPropertyProfiles: ObjectPropertyProfile[] = [];

  constructor(iri: string, baseIdentifier: string) {
    this.iri = iri;
    this.baseIdentifier = baseIdentifier;
  }

  private nextIri(prefix: string): string {
    ++this.counter;
    return `${this.baseIdentifier}${prefix}#${String(this.counter).padStart(3, "0")}`;
  }

  classProfile(value?: Partial<ClassProfile>): DsvClassProfileBuilder {
    const entity: ClassProfile = {
      type: [ClassProfileType],
      prefLabel: {},
      definition: {},
      usageNote: {},
      profileOfIri: [],
      reusesPropertyValue: [],
      specializationOfIri: [],
      externalDocumentationUrl: null,
      profiledClassIri: [],
      classRole: ClassRole.undefined,
      ...value,
      iri: value?.iri ?? this.nextIri("classProfile"),
    };
    this.classProfiles.push(entity);
    return new DefaultDsvClassProfileBuilder(entity);
  }

  datatypeProperty(
    value?: Partial<DatatypePropertyProfile>,
  ): DsvDatatypePropertyProfileBuilder {
    const entity: DatatypePropertyProfile = {
      type: [DatatypePropertyProfileType],
      prefLabel: {},
      definition: {},
      usageNote: {},
      profileOfIri: [],
      reusesPropertyValue: [],
      specializationOfIri: [],
      externalDocumentationUrl: null,
      cardinality: null,
      domainIri: "",
      profiledPropertyIri: [],
      requirementLevel: RequirementLevel.undefined,
      rangeDataTypeIri: [],
      ...value,
      iri: value?.iri ?? this.nextIri("property"),
    };
    this.datatypePropertyProfiles.push(entity);
    return new DefaultDsvDatatypePropertyProfileBuilder(entity);
  }

  objectProperty(
    value?: Partial<ObjectPropertyProfile>,
  ): DsvObjectPropertyProfileBuilder {
    const entity: ObjectPropertyProfile = {
      type: [ObjectPropertyProfileType],
      prefLabel: {},
      definition: {},
      usageNote: {},
      profileOfIri: [],
      reusesPropertyValue: [],
      specializationOfIri: [],
      externalDocumentationUrl: null,
      cardinality: null,
      domainIri: "",
      profiledPropertyIri: [],
      requirementLevel: RequirementLevel.undefined,
      rangeClassIri: [],
      ...value,
      iri: value?.iri ?? this.nextIri("property"),
    };
    this.objectPropertyProfiles.push(entity);
    return new DefaultDsvObjectPropertyProfileBuilder(entity);
  }

  build(): ApplicationProfile {
    return {
      iri: this.iri,
      externalDocumentationUrl: null,
      classProfiles: this.classProfiles,
      datatypePropertyProfiles: this.datatypePropertyProfiles,
      objectPropertyProfiles: this.objectPropertyProfiles,
    };
  }

}

class DefaultDsvClassProfileBuilder implements DsvClassProfileBuilder {

  readonly identifier: string;

  private readonly entity: ClassProfile;

  constructor(entity: ClassProfile) {
    this.entity = entity;
    this.identifier = entity.iri;
  }

  profilesClass(...classes: (IdentifiableBuilder | string)[]): DsvClassProfileBuilder {
    for (const value of classes) {
      addToArray(identifierOf(value), this.entity.profiledClassIri);
    }
    return this;
  }

  profileOf(...profiles: (IdentifiableBuilder | string)[]): DsvClassProfileBuilder {
    for (const value of profiles) {
      addToArray(identifierOf(value), this.entity.profileOfIri);
    }
    return this;
  }

  specializes(...parents: (IdentifiableBuilder | string)[]): DsvClassProfileBuilder {
    for (const value of parents) {
      addToArray(identifierOf(value), this.entity.specializationOfIri);
    }
    return this;
  }

  reuses(value: ReusesPropertyValue): DsvClassProfileBuilder {
    this.entity.reusesPropertyValue.push({
      reusedPropertyIri: value.property,
      reusedAsPropertyIri: value.as ?? value.property,
      propertyReusedFromResourceIri: identifierOf(value.from),
    });
    return this;
  }

  reusesNameAndDescription(from: IdentifiableBuilder | string): DsvClassProfileBuilder {
    return this
      .reuses({ property: DSV_REUSE_LABEL, from })
      .reuses({ property: DSV_REUSE_DESCRIPTION, from });
  }

  main(): DsvClassProfileBuilder {
    this.entity.classRole = ClassRole.main;
    return this;
  }

  supportive(): DsvClassProfileBuilder {
    this.entity.classRole = ClassRole.supportive;
    return this;
  }

  build(): ClassProfile {
    return this.entity;
  }

}

/**
 * Shared implementation for both DsvDatatypePropertyProfileBuilder and
 * DsvObjectPropertyProfileBuilder - they differ only in the `range` method
 * and the concrete entity type returned from `build`.
 */
abstract class DefaultDsvPropertyProfileBuilder<Type extends PropertyProfile> {

  readonly identifier: string;

  protected readonly entity: Type;

  constructor(entity: Type) {
    this.entity = entity;
    this.identifier = entity.iri;
  }

  domain(value: IdentifiableBuilder | string): this {
    this.entity.domainIri = identifierOf(value);
    return this;
  }

  profilesProperty(...properties: (IdentifiableBuilder | string)[]): this {
    for (const value of properties) {
      addToArray(identifierOf(value), this.entity.profiledPropertyIri);
    }
    return this;
  }

  profileOf(...profiles: (IdentifiableBuilder | string)[]): this {
    for (const value of profiles) {
      addToArray(identifierOf(value), this.entity.profileOfIri);
    }
    return this;
  }

  specializes(...parents: (IdentifiableBuilder | string)[]): this {
    for (const value of parents) {
      addToArray(identifierOf(value), this.entity.specializationOfIri);
    }
    return this;
  }

  reuses(value: ReusesPropertyValue): this {
    this.entity.reusesPropertyValue.push({
      reusedPropertyIri: value.property,
      reusedAsPropertyIri: value.as ?? value.property,
      propertyReusedFromResourceIri: identifierOf(value.from),
    });
    return this;
  }

  reusesNameAndDescription(from: IdentifiableBuilder | string): this {
    return this
      .reuses({ property: DSV_REUSE_LABEL, from })
      .reuses({ property: DSV_REUSE_DESCRIPTION, from });
  }

  mandatory(): this {
    this.entity.requirementLevel = RequirementLevel.mandatory;
    return this;
  }

  optional(): this {
    this.entity.requirementLevel = RequirementLevel.optional;
    return this;
  }

  recommended(): this {
    this.entity.requirementLevel = RequirementLevel.recommended;
    return this;
  }

}

class DefaultDsvDatatypePropertyProfileBuilder
  extends DefaultDsvPropertyProfileBuilder<DatatypePropertyProfile>
  implements DsvDatatypePropertyProfileBuilder {

  range(dataTypeIri: string): this {
    this.entity.rangeDataTypeIri = [dataTypeIri];
    return this;
  }

  build(): DatatypePropertyProfile {
    return this.entity;
  }

}

class DefaultDsvObjectPropertyProfileBuilder
  extends DefaultDsvPropertyProfileBuilder<ObjectPropertyProfile>
  implements DsvObjectPropertyProfileBuilder {

  range(value: IdentifiableBuilder | string): this {
    this.entity.rangeClassIri = [identifierOf(value)];
    return this;
  }

  build(): ObjectPropertyProfile {
    return this.entity;
  }

}

export function createDefaultApplicationProfileBuilder(configuration: {
  iri: string,
  /**
   * Prefix for auto-generated IRIs of profiles created without an
   * explicit `iri`.
   */
  baseIdentifier?: string,
}): ApplicationProfileBuilder {
  return new DefaultApplicationProfileBuilder(
    configuration.iri, configuration.baseIdentifier ?? "");
}
