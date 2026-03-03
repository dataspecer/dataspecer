import { SKOS } from "./vocabulary.ts";

export type LanguageString = { [language: string]: string };

interface Resource {

  /**
   * @lc-property dsv:externalDocumentation
   */
  externalDocumentationUrl: string | null;

}

/**
 * @lc-resource dsv:ApplicationProfile
 */
export interface ApplicationProfile extends Resource {

  iri: string;

  /**
   * @lc-property dcterms:isPartOf
   */
  classProfiles: ClassProfile[];

  /**
   * @lc-property dcterms:isPartOf
   */
  datatypePropertyProfiles: DatatypePropertyProfile[];

  /**
   * @lc-property dcterms:isPartOf
   */
  objectPropertyProfiles: ObjectPropertyProfile[];

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
 *
 * @lc-resource dsv:TermProfile
 */
export interface TermProfile extends Resource {

  type: string[];

  iri: string;

  /**
   * @lc-property skos:prefLabel
   */
  prefLabel: LanguageString;

  /**
   * @lc-property skos:definition
   */
  definition: LanguageString;

  /**
   * @lc-property skos:scopeNote
   */
  usageNote: LanguageString;

  /**
   * @lc-property dsv:profileOf
   */
  profileOfIri: string[];

  /**
   * @lc-property dsv:reusesPropertyValue
   */
  reusesPropertyValue: PropertyValueReuse[];

  /**
   * @lc-property dsv:specializes
   */
  specializationOfIri: string[];

}

export const DSV_REUSE_LABEL = SKOS.prefLabel.id;

export const DSV_REUSE_DESCRIPTION = SKOS.definition.id;

export const DSV_REUSE_USAGE_NOTE = SKOS.scopeNote.id;

/**
 * @lc-resource dsv:PropertyValueReuse
 */
export interface PropertyValueReuse {

  /**
   * @lc-property dsv:reusedProperty
   */
  reusedPropertyIri: string;

  /**
   * @lc-property dsv:reusedFromResource
   */
  propertyReusedFromResourceIri: string;

}

/**
 * @lc-resource dsv:InvalidTermProfile
 */
export interface InvalidTermProfile extends TermProfile {

}

export enum ClassRole {
  undefined,
  main,
  supportive,
}

/**
 * @lc-resource dsv:ClassProfile
 */
export interface ClassProfile extends TermProfile {

  type: [typeof ClassProfileType];

  /**
   * @lc-property dsv:class
   */
  profiledClassIri: string[];

  /**
   * @lc-property dsv:classRole
   */
  classRole: ClassRole;

}

export const ClassProfileType = "class-profile";

export function isClassProfile(profile: TermProfile): profile is ClassProfile {
  return profile.type.includes(ClassProfileType);
}

export enum RequirementLevel {
  undefined,
  mandatory,
  optional,
  recommended,
}

/**
 * @lc-resource dsv:PropertyProfile
 */
export interface PropertyProfile extends TermProfile {

  /**
   * @lc-property dsv:cardinality
   */
  cardinality: Cardinality | null;

  /**
   * @lc-property dsv:domain
   */
  domainIri: string;

  /**
   * @lc-property dsv:property
   */
  profiledPropertyIri: string[];

  /**
   * @lc-property dsv:requirementLevel
   */
  requirementLevel: RequirementLevel;

}

export function isPropertyProfile(
  profile: TermProfile,
): profile is PropertyProfile {
  return profile.type.includes(ObjectPropertyProfileType)
    || profile.type.includes(DatatypePropertyProfileType);
}

/**
 * @lc-resource dsv:ObjectPropertyProfile
 */
export interface ObjectPropertyProfile extends PropertyProfile {
  type: [typeof ObjectPropertyProfileType];

  /**
   * {@link https://github.com/mff-uk/data-specification-vocabulary/issues/3}
   *
   * @lc-property dsv:range
   */
  rangeClassIri: string[];
}

export const ObjectPropertyProfileType = "object-property-profile";

export function isObjectPropertyProfile(
  profile: TermProfile,
): profile is ObjectPropertyProfile {
  return ((profile as any).type ?? []).includes(ObjectPropertyProfileType);
}

/**
 * @lc-resource dsv:DatatypePropertyProfile
 */
export interface DatatypePropertyProfile extends PropertyProfile {
  type: [typeof DatatypePropertyProfileType];

  /**
   * @lc-property dsv:datatype
   */
  rangeDataTypeIri: string[];
}

export const DatatypePropertyProfileType = "datatype-property-profile";

export function isDatatypePropertyProfile(
  profile: TermProfile,
): profile is DatatypePropertyProfile {
  return ((profile as any).type ?? []).includes(DatatypePropertyProfileType);
}
