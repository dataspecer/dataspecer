import { Entity } from "@dataspecer/core-v2/entity-model";

import {
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipEndProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isPrimitiveType } from "@dataspecer/core-v2/semantic-model/datatypes";

import { EntityListContainer } from "./entity-model.ts";
import {
  LanguageString,
  ApplicationProfile,
  Cardinality,
  ClassProfile,
  ClassProfileType,
  PropertyProfile,
  ObjectPropertyProfile,
  ObjectPropertyProfileType,
  DatatypePropertyProfile,
  DatatypePropertyProfileType,
  TermProfile,
  ClassRole,
  RequirementLevel,
  isDatatypePropertyProfile,
  isObjectPropertyProfile,
} from "./dsv-model.ts";
import { DSV_CLASS_ROLE, DSV_MANDATORY_LEVEL, SKOS } from "./vocabulary.ts";


interface EntityListContainerToDsvContext {

  /**
   * @return Entity with given identifier or null.
   */
  identifierToEntity: (identifier: string) => Entity | null;

  /**
   * @argument entity Entity from the {@link EntityListContainer} or {@link identifierToEntity}.
   * @return Absolute IRI for given entity.
   */
  entityToIri: (entity: Entity) => string;

  /**
   * Allows for filtering of languages strings.
   */
  languageFilter: (value: LanguageString | null | undefined) => LanguageString | null;

}

/**
 * Helper function to create {@link EntityListContainerToDsvContext}.
 * Provides defaults, functionality can be changed using the arguments.
 * @deprecated Use dsv-api-v2 instead.
 */
export function createContext(
  containers: EntityListContainer[],
): EntityListContainerToDsvContext {
  // Build an index identifier -> entity and container.
  const entityMap: {
    [identifier: string]: { entity: Entity, container: EntityListContainer }
  } = {};
  for (const container of containers) {
    for (const entity of container.entities) {
      entityMap[entity.id] = {
        container,
        entity
      };
    }
  }

  // Default behavior.
  const identifierToEntity = (identifier: string): Entity | null => {
    return entityMap[identifier]?.entity ?? null;
  };

  const entityToIri = (
    entity: Entity
  ): string => {
    // Relations store IRI in the range.
    let iri: string | null = null;
    if (isSemanticModelRelationship(entity)
      || isSemanticModelRelationshipProfile(entity)) {
      const [_, range] = entity.ends;
      iri = range?.iri ?? iri;
    } else {
      // This can by anything, we just try to graph the IRI.
      iri = (entity as any).iri;
    }
    // We use the identifier as the default fallback.
    iri = iri ?? entity.id;
    // Now deal with absolute and relative.
    if (iri.includes("://")) {
      // Absolute IRI.
      return iri;
    } else {
      // Relative IRI.
      const baseIri = entityMap[entity.id]?.container.baseIri ?? "";
      return baseIri + iri;
    }
  };

  const languageFilter = (value: LanguageString | null | undefined) =>
    value ?? null;

  return {
    identifierToEntity,
    entityToIri,
    languageFilter,
  };
}

/**
 * Create a conceptual model with given IRI based on the given model
 * container to convert. Others models are required
 * @deprecated Use dsv-api-v2 instead.
 */
export function entityListContainerToDsvModel(
  dsvIri: string,
  entityListContainer: EntityListContainer,
  context: EntityListContainerToDsvContext,
): ApplicationProfile {
  const result: ApplicationProfile = {
    iri: dsvIri,
    classProfiles: [],
    datatypePropertyProfiles: [],
    objectPropertyProfiles: [],
    externalDocumentationUrl: null,
  };
  (new EntityListContainerToDsv(context))
    .loadToDsv(entityListContainer, result);
  return result;
}
class EntityListContainerToDsv {

  readonly context: EntityListContainerToDsvContext;

  dsvIri: string = "";

  constructor(context: EntityListContainerToDsvContext) {
    this.context = context;
  }

  loadToDsv(
    modelContainer: EntityListContainer, dsv: ApplicationProfile,
  ): void {
    this.dsvIri = dsv.iri;
    const generalizations = this.loadGeneralizations(modelContainer);
    this.loadClassProfiles(modelContainer, generalizations, dsv);
    this.loadRelationshipsProfiles(modelContainer, generalizations, dsv);
  }

  private loadGeneralizations(
    modelContainer: EntityListContainer,
  ): { [iri: string]: string[] } {
    const result: { [iri: string]: string[] } = {};
    modelContainer.entities.filter(isSemanticModelGeneralization)
      .forEach((item) => {
        result[item.child] = [
          ...(result[item.child] ?? []),
          this.identifierToIri(item.parent),
        ];
      });
    return result;
  }

  private loadClassProfiles(
    modelContainer: EntityListContainer,
    generalizations: { [iri: string]: string[] },
    dsv: ApplicationProfile,
  ): void {
    modelContainer.entities
      .filter(item => isSemanticModelClassProfile(item))
      .map(item => this.loadClassProfile(item, generalizations))
      .forEach(item => dsv.classProfiles.push(item));
  }

  private loadClassProfile(
    item: SemanticModelClassProfile,
    generalizations: { [iri: string]: string[] },
  ): ClassProfile {
    const classProfile: ClassProfile = {
      // Resource
      externalDocumentationUrl: item.externalDocumentationUrl ?? null,
      // TermProfile
      iri: this.entityToIri(item),
      prefLabel: {},
      definition: {},
      usageNote: {},
      profileOfIri: [],
      // ClassProfile
      type: [ClassProfileType],
      reusesPropertyValue: [],
      profiledClassIri: [],
      specializationOfIri: generalizations[item.id] ?? [],
      classRole: ClassRole.undefined,
    };

    for (const tag of (item.tags ?? [])) {
      switch (tag) {
        case DSV_CLASS_ROLE.main:
          classProfile.classRole = ClassRole.main;
          break;
        case DSV_CLASS_ROLE.supportive:
          classProfile.classRole = ClassRole.supportive;
          break;
      }
    }

    const profiling: (Entity | null)[] = [];
    // Type specific.
    item.profiling.forEach(item => profiling.push(this.identifierToEntity(item)));
    this.setReusesPropertyValue(item, classProfile);

    // We need to know what we profile to add it to the right place.
    for (const profileOf of profiling) {
      if (profileOf === null) {
        // We ignore this here, there is nothing we can do.
        continue;
      }
      if (isSemanticModelClass(profileOf)) {
        classProfile.profiledClassIri.push(this.entityToIri(profileOf));
      } else if (isSemanticModelClassProfile(profileOf)) {
        classProfile.profileOfIri.push(this.entityToIri(profileOf))
      } else {
        console.warn(`Invalid profileOf '${profileOf.id}' of type '${profileOf.type}' for '${item.id}'.`)
      }
    }

    return classProfile;
  }

  private identifierToEntity(iri: string | null): Entity | null {
    if (iri === null) {
      return null;
    }
    const result = this.context.identifierToEntity(iri);
    if (result === null) {
      console.error(`Missing entity with IRI '${iri}'.`);
    }
    return result;
  }

  private entityToIri(entity: Entity) {
    return this.context.entityToIri(entity);
  }

  private identifierToIri(identifier: string): string {
    const entity = this.context.identifierToEntity(identifier);
    if (!entity) {
      console.warn(`Missing entity for identifier "${identifier}".`)
      return identifier;
    }
    return this.entityToIri(entity);
  }

  /**
   * Prepare string to DSV, we represent empty string as null.
   * The reason is both are same in RDF.
   */
  private prepareString(value: LanguageString | null): LanguageString {
    const result = this.context.languageFilter(value);
    if (result === null) {
      return {};
    }
    return Object.keys(result).length === 0 ? {} : result;
  };

  /**
   * Adds reusesPropertyValue values for profile.
   */
  private setReusesPropertyValue(
    item: {
      name: LanguageString | null,
      nameFromProfiled: string | null,
      description: LanguageString | null
      descriptionFromProfiled: string | null,
      usageNote: LanguageString | null
      usageNoteFromProfiled: string | null,
    },
    profile: TermProfile,
  ) {
    if (item.nameFromProfiled === null) {
      profile.prefLabel = this.prepareString(item.name);
    } else {
      profile.reusesPropertyValue.push({
        reusedPropertyIri: SKOS.prefLabel.id,
        propertyReusedFromResourceIri: this.identifierToIri(item.nameFromProfiled),
      });
    }
    if (item.descriptionFromProfiled === null) {
      profile.definition = this.prepareString(item.description);
    } else {
      profile.reusesPropertyValue.push({
        reusedPropertyIri: SKOS.definition.id,
        propertyReusedFromResourceIri: this.identifierToIri(item.descriptionFromProfiled),
      });
    }
    if (item.usageNoteFromProfiled === null) {
      profile.usageNote = this.prepareString(item.usageNote);
    } else {
      profile.reusesPropertyValue.push({
        reusedPropertyIri: SKOS.scopeNote.id,
        propertyReusedFromResourceIri: this.identifierToIri(item.usageNoteFromProfiled),
      });
    }
  }

  private loadRelationshipsProfiles(
    modelContainer: EntityListContainer,
    generalizations: { [iri: string]: string[] },
    dsv: ApplicationProfile,
  ): void {
    modelContainer.entities
      .filter(isSemanticModelRelationshipProfile)
      .map(item => this.loadRelationshipsProfile(item, generalizations))
      .filter(item => item !== null)
      .forEach(item => {
        if (isDatatypePropertyProfile(item)) {
          dsv.datatypePropertyProfiles.push(item);
        } else if (isObjectPropertyProfile(item)) {
          dsv.objectPropertyProfiles.push(item);
        } else {
          console.warn("Ignoring unknown ProfileTerm", item);
        }
      });
  }

  private loadRelationshipsProfile(
    item: SemanticModelRelationshipProfile,
    generalizations: { [iri: string]: string[] },
  ): PropertyProfile | null {
    const [domain, range] = item.ends;
    if (domain === undefined || range === undefined) {
      console.error(`Expected two ends for '${item.id}'.`);
      return null;
    }
    if (domain.concept === null) {
      console.error(`Missing 'ends[0].concept' (owner) for '${item.id}'.`);
      return null;
    }

    const propertyProfile: PropertyProfile = {
      // Resource
      externalDocumentationUrl: range.externalDocumentationUrl ?? null,
      // TermProfile
      type: [],
      iri: this.entityToIri(item),
      prefLabel: {},
      definition: {},
      usageNote: {},
      profileOfIri: [],
      specializationOfIri: generalizations[item.id] ?? [],
      reusesPropertyValue: [],
      // PropertyProfile
      cardinality: cardinalityToCardinalityEnum(range.cardinality),
      domainIri: this.identifierToIri(domain.concept),
      profiledPropertyIri: [],
      requirementLevel: RequirementLevel.undefined,
    };

    applyTagsToPropertyProfile(propertyProfile, range.tags);
    this.resolvePropertyProfiling(item, propertyProfile, range);
    this.setReusesPropertyValue(range, propertyProfile);
    return this.addRangeConceptToPropertyProfile(item, range, propertyProfile);
  }

  private resolvePropertyProfiling(
    item: SemanticModelRelationshipProfile,
    profile: PropertyProfile,
    range: SemanticModelRelationshipEndProfile,
  ) {
    for (const iri of range.profiling) {
      const profileOf = this.context.identifierToEntity(iri);
      if (profileOf === null) {
        console.error(`Missing profileOf '${iri}' for '${item.id}'.`);
        continue;
      }
      // Based on the type of "profileOf" we add the profile
      // profiledProperty or profileOf list, for non-profile
      // or profile respectively.
      if (isSemanticModelRelationship(profileOf)) {
        profile.profiledPropertyIri.push(this.entityToIri(profileOf));
      } else if (isSemanticModelRelationshipProfile(profileOf)) {
        profile.profileOfIri.push(this.entityToIri(profileOf));
      } else {
        console.warn(
          `Invalid profileOf '${profileOf.id}' with type '${profileOf.type}'.`);
      }
    }
  }

  /**
   * Add information from {@link range} to {@link propertyProfile}.
   * Type of {@link rage} determined type of the {@link propertyProfile}.
   */
  private addRangeConceptToPropertyProfile(
    item: SemanticModelRelationshipProfile,
    range: SemanticModelRelationshipEndProfile,
    propertyProfile: PropertyProfile
  ) {
    // First we obtain the concept, i.e. value of the range.
    const rangeConcept = range.concept;
    if (rangeConcept === null) {
      console.warn("Range concept is null, ignoring relationship.", item);
      return null;
    }

    // We decide the type based on the range concept.
    // If range concept is a primitive value it is datatype property, else
    // it is object property.
    // This gets more complicated once we aim for primitive type profile
    // support.
    if (isPrimitiveType(rangeConcept)) {
      const attribute = extentToDatatypePropertyProfile(propertyProfile);
      attribute.rangeDataTypeIri.push(rangeConcept);
      return attribute;
    } else {
      const association = extentToObjectPropertyProfile(propertyProfile);
      association.rangeClassIri.push(this.identifierToIri(rangeConcept));
      return association;
    }
  }

}

/**
 * Takes given {@link PropertyProfile} and turn it into
 * {@link DatatypePropertyProfile}.
 */
function extentToDatatypePropertyProfile(
  property: PropertyProfile,
): DatatypePropertyProfile {
  property.type = [DatatypePropertyProfileType];
  (property as any).rangeDataTypeIri = [];
  return property as DatatypePropertyProfile;
}

/**
 * We have only tree values: 0, 1, and many.
 * We map 0 to 0, 1 to 1, and everything else to many.
 */
function cardinalityToCardinalityEnum(
  cardinality: [number, number | null] | null,
): Cardinality | null {
  if (cardinality === null) {
    // Cardinality is not specified.
    return null;
  }
  const [start, end] = cardinality;
  if (start === 0) {
    if (end === 0) {
      return Cardinality.ZeroToZero;
    } else if (end === 1) {
      return Cardinality.ZeroToOne;
    } else {
      return Cardinality.ZeroToMany;
    }
  } else if (start === 1) {
    if (end === 0) {
      return Cardinality.OneToZero;
    } else if (end === 1) {
      return Cardinality.OneToOne;
    } else {
      return Cardinality.OneToMany;
    }
  } else {
    if (end === 0) {
      return Cardinality.ManyToZero;
    } else if (end === 1) {
      return Cardinality.ManyToOne;
    } else {
      return Cardinality.ManyToMany;
    }
  }
}

function applyTagsToPropertyProfile(
  profile: PropertyProfile, tags: string[] | undefined,
): void {
  if (tags === undefined) {
    return;
  }
  for (const tag of tags) {
    switch (tag) {
      case DSV_MANDATORY_LEVEL.mandatory:
        profile.requirementLevel = RequirementLevel.mandatory;
        break;
      case DSV_MANDATORY_LEVEL.optional:
        profile.requirementLevel = RequirementLevel.optional;
        break;
      case DSV_MANDATORY_LEVEL.recommended:
        profile.requirementLevel = RequirementLevel.recommended;
        break;
    }
  }
}

/**
 * Takes given {@link PropertyProfile} and turn it into
 * {@link ObjectPropertyProfile}.
 */
function extentToObjectPropertyProfile(property: PropertyProfile): ObjectPropertyProfile {
  property.type = [ObjectPropertyProfileType];
  (property as any).rangeClassIri = [];
  return property as ObjectPropertyProfile;
}
