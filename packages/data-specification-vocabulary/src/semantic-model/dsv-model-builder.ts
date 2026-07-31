import {
  ApplicationProfile,
  ClassProfile,
  DatatypePropertyProfile,
  ObjectPropertyProfile,
} from "./dsv-model.ts";

export interface IdentifiableBuilder {

  /**
   * The profile's IRI, i.e. its identity within the built ApplicationProfile.
   */
  readonly identifier: string;

}

export interface ReusesPropertyValue {

  /**
   * IRI of the property reused from the profiled resource.
   */
  property: string;

  /**
   * IRI of the property under which the reused value is exposed.
   * Defaults to {@link property} when not given.
   */
  as?: string;

  /**
   * The resource the value is reused from.
   */
  from: IdentifiableBuilder | string;

}

export interface ApplicationProfileBuilder {

  classProfile(value?: Partial<ClassProfile>): DsvClassProfileBuilder;

  datatypeProperty(
    value?: Partial<DatatypePropertyProfile>,
  ): DsvDatatypePropertyProfileBuilder;

  objectProperty(
    value?: Partial<ObjectPropertyProfile>,
  ): DsvObjectPropertyProfileBuilder;

  build(): ApplicationProfile;

}

export interface DsvClassProfileBuilder extends IdentifiableBuilder {

  /**
   * @lc-property dsv:class - profiles a class from the base vocabulary.
   */
  profilesClass(...classes: (IdentifiableBuilder | string)[]): DsvClassProfileBuilder;

  /**
   * @lc-property dsv:profileOf - profiles another class profile.
   */
  profileOf(...profiles: (IdentifiableBuilder | string)[]): DsvClassProfileBuilder;

  /**
   * @lc-property dsv:specializes
   */
  specializes(...parents: (IdentifiableBuilder | string)[]): DsvClassProfileBuilder;

  reuses(value: ReusesPropertyValue): DsvClassProfileBuilder;

  /**
   * Convenience for the common case of reusing both skos:prefLabel and
   * skos:definition from the same resource.
   */
  reusesNameAndDescription(from: IdentifiableBuilder | string): DsvClassProfileBuilder;

  main(): DsvClassProfileBuilder;

  supportive(): DsvClassProfileBuilder;

  build(): ClassProfile;

}

export interface DsvPropertyProfileBuilder<Self> extends IdentifiableBuilder {

  domain(value: IdentifiableBuilder | string): Self;

  /**
   * @lc-property dsv:property - profiles a property from the base vocabulary.
   */
  profilesProperty(...properties: (IdentifiableBuilder | string)[]): Self;

  /**
   * @lc-property dsv:profileOf - profiles another property profile.
   */
  profileOf(...profiles: (IdentifiableBuilder | string)[]): Self;

  /**
   * @lc-property dsv:specializes
   */
  specializes(...parents: (IdentifiableBuilder | string)[]): Self;

  reuses(value: ReusesPropertyValue): Self;

  reusesNameAndDescription(from: IdentifiableBuilder | string): Self;

  mandatory(): Self;

  optional(): Self;

  recommended(): Self;

}

export interface DsvDatatypePropertyProfileBuilder
  extends DsvPropertyProfileBuilder<DsvDatatypePropertyProfileBuilder> {

  range(dataTypeIri: string): DsvDatatypePropertyProfileBuilder;

  build(): DatatypePropertyProfile;

}

export interface DsvObjectPropertyProfileBuilder
  extends DsvPropertyProfileBuilder<DsvObjectPropertyProfileBuilder> {

  range(value: IdentifiableBuilder | string): DsvObjectPropertyProfileBuilder;

  build(): ObjectPropertyProfile;

}
