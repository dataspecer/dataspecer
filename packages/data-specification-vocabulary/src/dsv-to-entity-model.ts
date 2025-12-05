import { Entity } from "@dataspecer/core-v2/entity-model";

import { EntityListContainer } from "./entity-model.ts";

import {
  ApplicationProfile,
  Cardinality,
  ClassProfile,
  PropertyProfile,
  isObjectPropertyProfile,
  isDatatypePropertyProfile,
  PropertyValueReuse,
  TermProfile,
  RequirementLevel,
  ClassRole,
  isClassProfile,
} from "./dsv-model.ts";

import {
  SEMANTIC_MODEL_CLASS_PROFILE,
  SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
  SemanticModelClassProfile,
  SemanticModelRelationshipEndProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { DSV_CLASS_ROLE, DSV_MANDATORY_LEVEL, SKOS, VANN } from "./vocabulary.ts";
import { SEMANTIC_MODEL_GENERALIZATION, SemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";

interface MandatoryConceptualModelToEntityListContainerContext {

  /**
   * Given an IRI return internal identifier.
   * This can be used for imported profiles as well as used entities.
   *
   * For imported profiles we expect to receive a new uniq identifier.
   *
   * For used entities (profileOf), we assume the entities already exists
   * and we get back their internal identifier.
   */
  iriToIdentifier: (iri: string) => string;

}

interface OptionalConceptualModelToEntityListContainerContext {

  /**
   * Called for all imported class IRIs.
   */
  iriClassToIdentifier: (iri: string) => string;

  /**
   * Called for all imported property IRIs.
   */
  iriPropertyToIdentifier: (iri: string, rangeConcept: string) => string;

  /**
   * Called for every iri loaded to {@link EntityListContainer}.
   *
   * This can be used to change IRIs from absolute to relative.
   */
  iriUpdate: (iri: string) => string;

  /**
   * Called to get a new identifier for generalization.
   */
  generalizationIdentifier: (childIri: string, parentIri: string) => string;

}

interface ConceptualModelToEntityListContainerContext extends
  MandatoryConceptualModelToEntityListContainerContext,
  OptionalConceptualModelToEntityListContainerContext { };

export function conceptualModelToEntityListContainer(
  conceptualModel: ApplicationProfile,
  context: MandatoryConceptualModelToEntityListContainerContext &
    Partial<OptionalConceptualModelToEntityListContainerContext>,
): EntityListContainer {
  //
  const fullContext = {
    // By default we do not transform data type.
    iriClassToIdentifier: (iri: string) => context.iriToIdentifier(iri),
    // By default we do not user range concept.
    // We do this for backward compatibility.
    iriPropertyToIdentifier: (iri: string, _: string) => context.iriToIdentifier(iri),
    iriUpdate: (iri: string) => iri,
    generalizationIdentifier: (childIri: string, parentIri: string) =>
      `https://dataspecer.com/semantic-models/generalization?fromIri=${childIri}&toIri=${parentIri}`,
    ...context,
  };
  return (new ApplicationProfileToEntityModel(fullContext)
    .transform(conceptualModel));
}

class ApplicationProfileToEntityModel {

  private entities: Entity[] = [];

  private context: ConceptualModelToEntityListContainerContext;

  constructor(context: ConceptualModelToEntityListContainerContext) {
    this.context = context;
  }

  transform(dsv: ApplicationProfile): EntityListContainer {
    dsv.classProfiles.forEach(
      item => this.classProfileToEntities(item));
    dsv.datatypePropertyProfiles.forEach(
      item => this.propertyProfileToEntities(item));
    dsv.objectPropertyProfiles.forEach(
      item => this.propertyProfileToEntities(item));
    return {
      // We keep all IRIs as they are for now.
      // As a result there is no need for a base.
      baseIri: "",
      entities: this.entities
    };
  }

  private classProfileToEntities(profile: ClassProfile): void {
    const profiling = [
      ...this.profilesToIdentifier(profile.profileOfIri),
      ...this.classToIdentifier(profile.profiledClassIri),
    ];

    const tags: string[] = [];
    switch (profile.classRole) {
      case ClassRole.main:
        tags.push(DSV_CLASS_ROLE.main);
        break;
      case ClassRole.supportive:
        tags.push(DSV_CLASS_ROLE.supportive);
        break;
    }

    const classProfile: SemanticModelClassProfile = {
      // SemanticModelEntity
      iri: this.context.iriUpdate(profile.iri),
      tags,
      // Entity
      id: this.context.iriToIdentifier(profile.iri),
      type: [SEMANTIC_MODEL_CLASS_PROFILE],
      // Profile
      profiling,
      usageNote: profile.usageNote ?? {},
      usageNoteFromProfiled: this.selectFromProfiled(profile, SKOS.scopeNote.id),
      externalDocumentationUrl: profile.externalDocumentationUrl,
      // NamedThingProfile
      name: profile.prefLabel ?? {},
      nameFromProfiled: this.selectFromProfiled(profile, SKOS.prefLabel.id),
      description: profile.definition ?? {},
      descriptionFromProfiled: this.selectFromProfiled(profile, SKOS.definition.id),
    };
    this.entities.push(classProfile);
    // Convert generalizations.
    this.specializationOfToGeneralization(classProfile.id, profile);
  }

  private profilesToIdentifier(items: string[]): string[] {
    return items.map(iri => this.context.iriToIdentifier(iri));
  }

  private classToIdentifier(items: string[]): string[] {
    return items.map(iri => this.context.iriClassToIdentifier(iri));
  }

  private selectFromProfiled(profile: {
    reusesPropertyValue: PropertyValueReuse[],
  }, property: string): string | null {
    const reusesPropertyValue = profile.reusesPropertyValue.find(
      item => item.reusedPropertyIri === property);
    const iri = reusesPropertyValue?.propertyReusedFromResourceIri ?? null;
    return iri === null ? null : this.context.iriToIdentifier(iri);
  }

  private specializationOfToGeneralization(
    childIdentifier: string, profile: TermProfile,
  ): void {
    for (const iri of profile.specializationOfIri) {
      const parentIdentifier = this.context.iriToIdentifier(iri);
      const generalization: SemanticModelGeneralization = {
        id: this.context.generalizationIdentifier(profile.iri, iri),
        type: [SEMANTIC_MODEL_GENERALIZATION],
        iri: null,
        child: childIdentifier,
        parent: parentIdentifier,
      };
      this.entities.push(generalization)
    }
  }

  private propertyProfileToEntities(
    profile: PropertyProfile,
  ): void {
    let rangeConcept: string;
    if (isDatatypePropertyProfile(profile)) {
      const iri = profile.rangeDataTypeIri?.[0];
      if (iri === undefined) {
        console.error(`Property profile is null for '${profile.iri}'.`);
        return;
      }
      rangeConcept = this.context.iriToIdentifier(iri);
    } else if (isObjectPropertyProfile(profile)) {
      const iri = profile.rangeClassIri?.[0];
      if (iri === undefined) {
        console.error(`Property profile is null for '${profile.iri}'.`);
        return;
      }
      rangeConcept = this.context.iriToIdentifier(iri);
    } else {
      console.error(`Invalid type of property for profile '${profile.iri}'.`);
      return;
    }

    const profiling = [
      ...this.profilesToIdentifier(profile.profileOfIri),
      ...this.propertyToIdentifier(profile.profiledPropertyIri, rangeConcept),
    ];

    const domain: SemanticModelRelationshipEndProfile = {
      iri: null,
      concept: this.context.iriToIdentifier(profile.domainIri),
      cardinality: null,
      tags: [],
      // NamedThingProfile
      name: {},
      nameFromProfiled: null,
      description: {},
      descriptionFromProfiled: null,
      // Profile
      profiling: [],
      usageNote: {},
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
    };

    const tags: string[] = [];
    switch (profile.requirementLevel) {
      case RequirementLevel.mandatory:
        tags.push(DSV_MANDATORY_LEVEL.mandatory);
        break;
      case RequirementLevel.optional:
        tags.push(DSV_MANDATORY_LEVEL.optional);
        break;
      case RequirementLevel.recommended:
        tags.push(DSV_MANDATORY_LEVEL.recommended);
        break;
    }

    const range: SemanticModelRelationshipEndProfile = {
      iri: this.context.iriUpdate(profile.iri),
      concept: rangeConcept,
      cardinality: cardinalityEnumToCardinality(profile.cardinality),
      tags,
      // NamedThingProfile
      name: profile.prefLabel ?? {},
      nameFromProfiled: this.selectFromPropertyProfiled(
        profile, SKOS.prefLabel.id, rangeConcept),
      description: profile.definition ?? {},
      descriptionFromProfiled: this.selectFromPropertyProfiled(
        profile, SKOS.definition.id, rangeConcept),
      // Profile
      profiling,
      usageNote: profile.usageNote ?? {},
      usageNoteFromProfiled: this.selectFromPropertyProfiled(
        profile, SKOS.scopeNote.id, rangeConcept),
      externalDocumentationUrl: profile.externalDocumentationUrl,
    };

    const propertyUsage: SemanticModelRelationshipProfile = {
      ends: [domain, range],
      // Entity
      id: this.context.iriToIdentifier(profile.iri),
      type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
    };

    this.entities.push(propertyUsage);

    // Convert generalizations.
    this.specializationOfToGeneralization(propertyUsage.id, profile);
  }

  private propertyToIdentifier(items: string[], rangeConcept: string): string[] {
    return items.map(iri => this.context.iriPropertyToIdentifier(iri, rangeConcept));
  }

  private selectFromPropertyProfiled(profile: {
    reusesPropertyValue: PropertyValueReuse[],
  }, property: string, rangeConcept: string): string | null {
    const reusesPropertyValue = profile.reusesPropertyValue.find(
      item => item.reusedPropertyIri === property);
    const iri = reusesPropertyValue?.propertyReusedFromResourceIri ?? null;
    return iri === null ? null : this.context.iriPropertyToIdentifier(iri, rangeConcept);
  }

}

function cardinalityEnumToCardinality(
  cardinality: Cardinality | null,
): [number, number | null] | null {
  if (cardinality === null) {
    return null;
  }
  switch (cardinality) {
    case Cardinality.ZeroToZero:
      return [0, 0];
    case Cardinality.ZeroToOne:
      return [0, 1];
    case Cardinality.ZeroToMany:
      return [0, null];
    case Cardinality.OneToZero:
      return [1, 0];
    case Cardinality.OneToOne:
      return [1, 1];
    case Cardinality.OneToMany:
      return [1, null];
    // We do not really have a way how to convert
    // ManyTo* as we can not employ null, se we just
    // use a "random" number to get same result when exporting.
    case Cardinality.ManyToZero:
      return [2, 0];
    case Cardinality.ManyToOne:
      return [2, 1];
    case Cardinality.ManyToMany:
      return [2, 0];
  }
}
