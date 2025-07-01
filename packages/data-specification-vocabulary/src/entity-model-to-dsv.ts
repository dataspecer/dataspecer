import { Entity } from "@dataspecer/core-v2/entity-model";

import {
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";

import {
  EntityListContainer,
} from "./entity-model.ts";

import {
  LanguageString,
  DsvModel,
  Cardinality,
  ClassProfile,
  ClassProfileType,
  PropertyProfile,
  ObjectPropertyProfile,
  ObjectPropertyProfileType,
  DatatypePropertyProfile,
  DatatypePropertyProfileType,
  Profile,
  ClassRole,
  RequirementLevel,
} from "./dsv-model.ts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipEndProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { DSV_CLASS_ROLE, DSV_MANDATORY_LEVEL, SKOS, VANN } from "./vocabulary.ts";
import { isPrimitiveType } from "@dataspecer/core-v2/semantic-model/datatypes";

interface EntityListContainerToConceptualModelContext {

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
 * Helper function to create {@link EntityListContainerToConceptualModelContext}.
 * Provides defaults, functionality can be changed using the arguments.
 */
export function createContext(
  containers: EntityListContainer[],
): EntityListContainerToConceptualModelContext {
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
 */
export function entityListContainerToDsvModel(
  conceptualModelIri: string,
  entityListContainer: EntityListContainer,
  context: EntityListContainerToConceptualModelContext,
): DsvModel {
  const result: DsvModel = {
    iri: conceptualModelIri,
    profiles: [],
  };
  (new EntityListContainerToConceptualModel(context))
    .loadToConceptualModel(entityListContainer, result);
  return result;
}

class EntityListContainerToConceptualModel {

  readonly context: EntityListContainerToConceptualModelContext;

  conceptualModelIri: string = "";

  generalizations: Record<string, string[]> = {};

  constructor(context: EntityListContainerToConceptualModelContext) {
    this.context = context;
  }

  loadToConceptualModel(
    modelContainer: EntityListContainer, conceptualModel: DsvModel,
  ): void {
    this.conceptualModelIri = conceptualModel.iri;
    this.loadToGeneralizations(modelContainer);
    const identifierToClassProfile = this.loadClassProfiles(modelContainer);
    this.loadRelationshipsToClassProfiles(modelContainer, identifierToClassProfile);
    conceptualModel.profiles = Object.values(identifierToClassProfile);
    // Cleanup.
    this.generalizations = {};
  }

  /**
   * Load generalizations. We load them first and then add them
   * to other properties as loading.
   */
  private loadToGeneralizations(modelContainer: EntityListContainer) {
    const result: Record<string, string[]> = {};
    modelContainer.entities.filter(isSemanticModelGeneralization)
      .forEach((item) => {
        result[item.child] = [
          ...(result[item.child] ?? []),
          this.identifierToIri(item.parent),
        ];
      });
    this.generalizations = result;
  }

  private loadClassProfiles(modelContainer: EntityListContainer)
    : Record<string, ClassProfile> {
    const result: Record<string, ClassProfile> = {};
    modelContainer.entities.filter(item => isSemanticModelClassProfile(item))
      .forEach((item) => {
        const classProfile = this.semanticClassUsageToClassProfile(item);
        result[item.id] = classProfile;
      });
    return result;
  }

  private semanticClassUsageToClassProfile(
    item: SemanticModelClassProfile,
  ): ClassProfile {

    const classProfile: ClassProfile = {
      // Profile
      iri: this.entityToIri(item),
      prefLabel: {},
      definition: {},
      usageNote: {},
      profileOfIri: [],
      externalDocumentationUrl: item.externalDocumentationUrl ?? null,
      // ClassProfile
      $type: [ClassProfileType],
      properties: [],
      reusesPropertyValue: [],
      profiledClassIri: [],
      specializationOfIri: this.generalizations[item.id] ?? [],
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
    this.setProfileFromProfile(item, classProfile);

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
  private setProfileFromProfile(
    item: {
      name: LanguageString | null,
      nameFromProfiled: string | null,
      description: LanguageString | null
      descriptionFromProfiled: string | null,
      usageNote: LanguageString | null
      usageNoteFromProfiled: string | null,
    },
    profile: Profile,
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

  private loadRelationshipsToClassProfiles(
    modelContainer: EntityListContainer,
    identifierToClassProfile: Record<string, ClassProfile>,
  ): void {
    modelContainer.entities.filter(isSemanticModelRelationshipProfile).forEach(item => {
      const propertyProfile = this.semanticRelationshipProfileToPropertyProfile(item);
      if (propertyProfile == null) {
        return;
      }
      const owner = identifierToClassProfile[propertyProfile.ownerIdentifier];
      if (owner === undefined) {
        console.warn(`Missing owner for '${item.id}' of type '${item.type}'. Relationship is ignored.`);
        return;
      }
      owner?.properties.push(propertyProfile.profile);
    });
  }

  /**
   * As decided, spring 2024, property IRI, name, usageNote, etc .. are stored in the range.
   */
  private addRangeConceptToPropertyProfile(
    item: SemanticModelRelationshipProfile,
    range: SemanticModelRelationshipEndProfile,
    propertyProfile: PropertyProfile
  ) {
    // Now we need to store the range, we store it base on the
    // relationship type.
    const rangeConcept = range.concept;
    if (rangeConcept === null) {
      console.warn("Range concept is null.", item);
    } else if (isPrimitiveType(rangeConcept)) {
      // It is an attribute, we also use the IRI as is.
      const attribute = extentToDatatypePropertyProfile(propertyProfile);
      attribute.rangeDataTypeIri.push(rangeConcept);
    } else {
      // It is an association.
      const association = extentToObjectPropertyProfile(propertyProfile);
      association.rangeClassIri.push(this.identifierToIri(rangeConcept));
    }
  }

  /**
   * Add given entity to {@link PropertyProfile} profiles list.
   * Based on the entity type we can add to one of two lists.
   */
  private addProfileToPropertyProfile(
    profileOf: Entity,
    profile: PropertyProfile,
  ) {
    if (isSemanticModelRelationship(profileOf)) {
      profile.profiledPropertyIri.push(this.entityToIri(profileOf));
    } else if (isSemanticModelRelationshipProfile(profileOf)) {
      profile.profileOfIri.push(this.entityToIri(profileOf));
    } else {
      // It can be part of the core types.
      console.warn(`Invalid profileOf '${profileOf.id}' with type '${profileOf.type}'.`)
    }
  }

  private semanticRelationshipProfileToPropertyProfile(
    item: SemanticModelRelationshipProfile,
  ): { ownerIdentifier: string, profile: PropertyProfile } | null {
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
      // Profile
      iri: this.entityToIri(item),
      cardinality: cardinalityToCardinalityEnum(range.cardinality),
      prefLabel: {},
      definition: {},
      usageNote: {},
      profileOfIri: [],
      specializationOfIri: this.generalizations[item.id] ?? [],
      externalDocumentationUrl: range.externalDocumentationUrl ?? null,
      // PropertyProfile
      profiledPropertyIri: [],
      reusesPropertyValue: [],
      requirementLevel: RequirementLevel.undefined,
    };

    for (const tag of (range.tags ?? [])) {
      switch (tag) {
        case DSV_MANDATORY_LEVEL.mandatory:
          propertyProfile.requirementLevel = RequirementLevel.mandatory;
          break;
        case DSV_MANDATORY_LEVEL.optional:
          propertyProfile.requirementLevel = RequirementLevel.optional;
          break;
        case DSV_MANDATORY_LEVEL.recommended:
          propertyProfile.requirementLevel = RequirementLevel.recommended;
          break;
      }
    }

    for (const iri of range.profiling) {
      const profileOf = this.context.identifierToEntity(iri);
      if (profileOf === null) {
        console.error(`Missing profileOf '${iri}' for '${item.id}'.`);
      } else {
        this.addProfileToPropertyProfile(profileOf, propertyProfile);
      }
    }

    this.setProfileFromProfile(range, propertyProfile);
    this.addRangeConceptToPropertyProfile(item, range, propertyProfile);

    return {
      ownerIdentifier: domain.concept,
      profile: propertyProfile,
    };
  }

}

/**
 * We have only tree values: 0, 1, and many.
 * We map 0 to 0, 1 to 1, and everything else to many.
 */
function cardinalityToCardinalityEnum(cardinality: [number, number | null] | null): Cardinality | null {
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

function extentToDatatypePropertyProfile(property: PropertyProfile): DatatypePropertyProfile {
  (property as any).$type = [DatatypePropertyProfileType];
  (property as any).rangeDataTypeIri = [];
  return property as DatatypePropertyProfile;
}

function extentToObjectPropertyProfile(property: PropertyProfile): ObjectPropertyProfile {
  (property as any).$type = [ObjectPropertyProfileType];
  (property as any).rangeClassIri = [];
  return property as ObjectPropertyProfile;
}
