//
// In this file we use @lc- annotations. The idea
// is to be able to collect the information automatically
// and hopefully, one day, be able to integrate it with the specification.
//

import { DSV_CLASS_ROLE, SKOS } from "./vocabulary.ts";

export type LanguageString = { [language: string]: string };

export interface DsvModel {

  /**
   * Absolute IRI for the model.
   */
  iri: string;

  // @lc-identifier dcterms:isPartOf
  profiles: ClassProfile[];
}

export enum Cardinality {
  ZeroToZero = "0-0",
  ZeroToOne = "0-1",
  ZeroToMany = "0-n",
  OneToZero = "1-0",
  OneToOne = "1-1",
  OneToMany = "1-n",
  ManyToZero = "n-0",
  ManyToOne = "n-1",
  ManyToMany = "n-n"
}

/**
 * Instead of LanguageString | null we use only LanguageString.
 * We can not distinguish between null and {} in RDF anyway.
 * So we just pick the empty object as default.
 */
// @lc-identifier dsv:Profile
export interface Profile {

  /**
   * Absolute IRI.
   */
  iri: string;

  // @lc-identifier skos:prefLabel
  prefLabel: LanguageString;

  // @lc-identifier skos:definition
  definition: LanguageString;

  // @lc-identifier skos:scopeNote
  usageNote: LanguageString;

  // @lc-identifier dsv:profileOf
  // @lc-type Profile
  profileOfIri: string[];

  // @lc-identifier dsv:reusesPropertyValue
  // @lc-type PropertyValueReuse
  reusesPropertyValue: PropertyValueReuse[];

  // @lc-identifier dsv:specializes
  specializationOfIri: string[];

  externalDocumentationUrl: string | null;

}

export const DSV_REUSE_LABEL = SKOS.prefLabel.id;

export const DSV_REUSE_DESCRIPTION = SKOS.definition.id;

export const DSV_REUSE_USAGE_NOTE = SKOS.scopeNote.id;

// @lc-identifier dsv:PropertyValueReuse
export interface PropertyValueReuse {

  // dsv:reusedProperty
  reusedPropertyIri: string;

  // dsv:reusedFromResource
  propertyReusedFromResourceIri: string;

}

// @lc-identifier dsv:InvalidProfile
export interface InvalidProfile extends Profile {

}

export enum ClassRole {
  undefined,
  main,
  supportive,
}

// @lc-identifier dsv:ClassProfile
export interface ClassProfile extends Profile {
  $type: [typeof ClassProfileType];

  // @lc-identifier dsv:class
  // @lc-type ConceptualClass
  profiledClassIri: string[];

  // @lc-identifier dsv:domain
  properties: PropertyProfile[];

  // @lc-identifier dsv:classRole
  classRole: ClassRole;

}

export const ClassProfileType = "class-profile";

export function isClassProfile(profile:Profile) : profile is ClassProfile {
  return ((profile as any).$type ?? []).includes(ClassProfileType);
}

export enum RequirementLevel {
  undefined,
  mandatory,
  optional,
  recommended,
}

// @lc-identifier dsv:PropertyProfile
export interface PropertyProfile extends Profile {

  // @ls-identifier dsv:cardinality
  cardinality: Cardinality | null;

  // @lc-identifier dsv:property
  // @lc-type ConceptualProperty
  profiledPropertyIri: string[];

  // @lc-identifier dsv:requirementLevel
  requirementLevel: RequirementLevel;

}

// @lc-identifier dsv:ObjectPropertyProfile
export interface ObjectPropertyProfile extends PropertyProfile {
  $type: [typeof ObjectPropertyProfileType];

  // @lc-identifier dsv:objectPropertyRange
  // @lc-type ClassProfile | ConceptualClass
  // https://github.com/mff-uk/data-specification-vocabulary/issues/3
  rangeClassIri: string[];
}

export const ObjectPropertyProfileType = "object-property-profile";

export function isObjectPropertyProfile(
  profile:Profile,
) : profile is ObjectPropertyProfile {
  return ((profile as any).$type ?? []).includes(ObjectPropertyProfileType);
}

// @lc-identifier dsv:DatatypePropertyProfile
export interface DatatypePropertyProfile extends PropertyProfile {
  $type: [typeof DatatypePropertyProfileType];

  // @lc-identifier dsv:datatypePropertyRange
  // @lc-type ConceptualDatatype
  rangeDataTypeIri: string[];
}

export const DatatypePropertyProfileType = "datatype-property-profile";

export function isDatatypePropertyProfile(
  profile:Profile,
) : profile is DatatypePropertyProfile {
  return ((profile as any).$type ?? []).includes(DatatypePropertyProfileType);
}
