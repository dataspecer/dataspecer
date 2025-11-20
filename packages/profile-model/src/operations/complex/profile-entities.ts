import {
  isSemanticClass,
  isSemanticGeneralization,
  isSemanticRelationship,
  type SemanticClass,
  type SemanticGeneralization,
  type SemanticRelationship,
  type SemanticRelationshipEnd,
} from "@dataspecer/semantic-model";
import {
  isProfileClass,
  isProfileGeneralization,
  isProfileRelationship,
  type ProfileClass,
  type ProfileGeneralization,
  type ProfileRelationship,
  type ProfileRelationshipEnd,
} from "../../index.ts";
import {
  createDefaultSemanticModelProfileOperationFactory,
  type CreateSemanticModelClassProfile,
  type CreateSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import { Entity, EntityIdentifier } from "@dataspecer/entity-model";
import {
  type CreatedEntityOperationResult,
  createGeneralization,
  type CreateGeneralizationOperation,
  type Operation,
  type OperationResult,
} from "@dataspecer/core-v2/semantic-model/operations";

interface OperationContext {

  targetModel: {

    /**
     * Execute given operation and return the results.
     * @param operations
     */
    executeOperations(operations: Operation[]):
      (OperationResult | CreatedEntityOperationResult)[];

  }

}

type EntityToProfileMapping = Record<EntityIdentifier, EntityIdentifier>;

type LanguageString = { [language: string]: string };

interface ProfileEntitiesResult {

  classes: EntityIdentifier[];

  relationships: EntityIdentifier[];

  generalizations: EntityIdentifier[];

}

const factory = createDefaultSemanticModelProfileOperationFactory();

export const OwlThingIdentifier = "https://www.w3.org/2002/07/owl#Thing";

export async function profileEntities(
  context: OperationContext,
  args: { entities: Entity[] },
): Promise<ProfileEntitiesResult> {
  const mappings: EntityToProfileMapping = {};
  // Split entities by type we can profile.
  const {
    semanticClasses,
    semanticRelationships,
    semanticGeneralizations,
    profileClasses,
    profileRelationships,
    profileGeneralizations,
  } = splitEntitiesToProfile(args.entities);
  // First we prepare classes. We need them so we can reference
  // them from the relationships.
  const classOperations = [
    ...prepareProfileSemanticClassOperations(semanticClasses),
    ...prepareProfileSemanticProfileClassOperations(profileClasses),
  ];
  const classes = await createSemanticClassProfiles(
    context, classOperations, mappings);
  // Next relationships.
  // We do not have a way to identify the relationships so in order to connect
  // the original and the profile, we use the ordering.
  // We collect identifiers as we prepare the operations and
  // then as we execute the operations we build the mapping.
  const relationshipSources: EntityIdentifier[] = [];
  const relationshipOperations = [
    ...prepareProfileSemanticRelationshipOperations(
      semanticRelationships, mappings, relationshipSources),
    ...prepareProfileSemanticProfileRelationshipOperations(
      profileRelationships, mappings, relationshipSources),
  ];
  const relationships = await createSemanticRelationshipProfiles(
    context, relationshipOperations, mappings, relationshipSources);
  // As the last step, we profile generalizations.
  const generalizationSources: EntityIdentifier[] = [];
  const generalizationOperations = [
    ...prepareProfileSemanticGeneralizationOperations(
      semanticGeneralizations, mappings, generalizationSources),
    ...prepareProfileSemanticProfileGeneralizationOperations(
      profileGeneralizations, mappings, generalizationSources),
  ];
  const generalizations = await createSemanticGeneralizationProfiles(
    context, generalizationOperations, mappings, generalizationSources);
  // Now we can just return the result.
  return {
    classes,
    relationships,
    generalizations,
  };
}

function splitEntitiesToProfile(entities: Entity[]) {
  const semanticClasses: SemanticClass[] = [];
  const semanticRelationships: SemanticRelationship[] = [];
  const semanticGeneralizations: SemanticGeneralization[] = [];
  const profileClasses: ProfileClass[] = [];
  const profileRelationships: ProfileRelationship[] = [];
  const profileGeneralizations: ProfileGeneralization[] = [];
  entities.forEach(item => {
    if (isSemanticClass(item)) {
      semanticClasses.push(item);
    } else if (isSemanticRelationship(item)) {
      semanticRelationships.push(item);
    } else if (isSemanticGeneralization(item)) {
      semanticGeneralizations.push(item);
    } else if (isProfileClass(item)) {
      profileClasses.push(item);
    } else if (isProfileRelationship(item)) {
      profileRelationships.push(item);
    } else if (isProfileGeneralization(item)) {
      profileGeneralizations.push(item);
    }
  });
  return {
    semanticClasses,
    semanticRelationships,
    semanticGeneralizations,
    profileClasses,
    profileRelationships,
    profileGeneralizations,
  }
}

function prepareProfileSemanticClassOperations(
  classes: SemanticClass[],
): CreateSemanticModelClassProfile[] {
  return classes.map(item => factory.createClassProfile({
    iri: item.iri,
    profiling: [item.id],
    name: item.name,
    nameFromProfiled: item.id,
    description: item.description,
    descriptionFromProfiled: item.id,
    usageNote: null,
    usageNoteFromProfiled: null,
    externalDocumentationUrl: item.externalDocumentationUrl ?? null,
    tags: [],
  }))
}

function prepareProfileSemanticProfileClassOperations(
  classes: ProfileClass[],
): CreateSemanticModelClassProfile[] {
  return classes.map(item => factory.createClassProfile({
    iri: item.iri,
    profiling: [item.id],
    name: item.name,
    nameFromProfiled: item.id,
    description: item.description,
    descriptionFromProfiled: item.id,
    usageNote: item.usageNote,
    usageNoteFromProfiled: item.id,
    externalDocumentationUrl: item.externalDocumentationUrl ?? null,
    tags: item.tags,
  }))
}

async function createSemanticClassProfiles(
  context: OperationContext,
  operations: CreateSemanticModelClassProfile[],
  mappings: EntityToProfileMapping,
): Promise<EntityIdentifier[]> {
  const classProfiles: EntityIdentifier[] = [];
  (await context.targetModel.executeOperations(operations)).map((item, index) => {
    if (item.success) {
      const source = operations[index].entity.profiling[0];
      const target = (item as CreatedEntityOperationResult).id;
      mappings[source] = target;
      classProfiles.push(target);
    }
  });
  return classProfiles;
}

function prepareProfileSemanticRelationshipOperations(
  relationships: SemanticRelationship[],
  mappings: EntityToProfileMapping,
  relationshipSources: EntityIdentifier[],
): CreateSemanticModelRelationshipProfile[] {
  const result: CreateSemanticModelRelationshipProfile[] = [];
  relationships.forEach(item => {
    if (item.ends.length !== 2) {
      return;
    }
    relationshipSources.push(item.id);
    const [first, second] = item.ends;
    // Make sure we have a correct order.
    if (first.iri === null) {
      result.push(factory.createRelationshipProfile({
        ends: [
          domainEndProfile(mappings, first),
          rangeEndProfile(mappings, second, item.id, null),
        ]
      }));
    } else {
      result.push(factory.createRelationshipProfile({
        ends: [
          domainEndProfile(mappings, second),
          rangeEndProfile(mappings, first, item.id, null),
        ]
      }));
    }
  });
  return result;
}

function domainEndProfile(
  conceptMapping: Record<EntityIdentifier, EntityIdentifier>,
  domain: SemanticRelationshipEnd | ProfileRelationshipEnd,
): ProfileRelationshipEnd {
  const concept =
    domain.concept === null
      ? OwlThingIdentifier
      : (conceptMapping[domain.concept] ?? domain.concept);
  return {
    profiling: [],
    iri: null,
    name: null,
    nameFromProfiled: null,
    description: null,
    descriptionFromProfiled: null,
    usageNote: null,
    usageNoteFromProfiled: null,
    concept: concept,
    cardinality: domain.cardinality ?? null,
    externalDocumentationUrl: null,
    tags: [],
  }
}

function rangeEndProfile(
  conceptMapping: Record<EntityIdentifier, EntityIdentifier>,
  range: SemanticRelationshipEnd | ProfileRelationshipEnd,
  profiled: EntityIdentifier,
  usageNote: LanguageString | null,
): ProfileRelationshipEnd {
  const concept =
    range.concept === null
      ? OwlThingIdentifier
      : (conceptMapping[range.concept] ?? range.concept);
  return {
    profiling: [profiled],
    iri: range.iri,
    name: range.name,
    nameFromProfiled: profiled,
    description: range.description,
    descriptionFromProfiled: profiled,
    usageNote: usageNote,
    usageNoteFromProfiled: profiled,
    concept: concept,
    cardinality: range.cardinality ?? null,
    externalDocumentationUrl: range.externalDocumentationUrl ?? null,
    tags: [],
  }
}

function prepareProfileSemanticProfileRelationshipOperations(
  relationships: ProfileRelationship[],
  mappings: EntityToProfileMapping,
  relationshipSources: EntityIdentifier[],
): CreateSemanticModelRelationshipProfile[] {
  const result: CreateSemanticModelRelationshipProfile[] = [];
  relationships.forEach(item => {
    if (item.ends.length !== 2) {
      return;
    }
    relationshipSources.push(item.id);
    const [first, second] = item.ends;
    // Make sure we have a correct order.
    if (first.iri === null) {
      result.push(factory.createRelationshipProfile({
        ends: [
          domainEndProfile(mappings, first),
          rangeEndProfile(mappings, second, item.id, null),
        ]
      }));
    } else {
      result.push(factory.createRelationshipProfile({
        ends: [
          rangeEndProfile(mappings, first, item.id, first.usageNote),
          domainEndProfile(mappings, second),
        ]
      }));
    }
  });
  return result;
}

async function createSemanticRelationshipProfiles(
  context: OperationContext,
  operations: CreateSemanticModelRelationshipProfile[],
  mappings: EntityToProfileMapping,
  relationshipSources: EntityIdentifier[],
): Promise<EntityIdentifier[]> {
  const relationshipProfiles: EntityIdentifier[] = [];
  (await context.targetModel.executeOperations(operations)).map((item, index) => {
    if (item.success) {
      const source = relationshipSources[index];
      const target = (item as CreatedEntityOperationResult).id;
      mappings[source] = target;
      relationshipProfiles.push(target);
    }
  });
  return relationshipProfiles;
}

function prepareProfileSemanticGeneralizationOperations(
  generalizations: SemanticGeneralization[],
  mappings: EntityToProfileMapping,
  generalizationSources: EntityIdentifier[],
): CreateGeneralizationOperation[] {
  const generalizationOperations: CreateGeneralizationOperation[] = [];
  generalizations.forEach(item => {
    const child = mappings[item.child];
    const parent = mappings[item.parent];
    if (child === undefined || parent === undefined) {
      return;
    }
    generalizationSources.push(item.id);
    generalizationOperations.push(createGeneralization({
      iri: item.iri,
      child,
      parent,
    }));
  });
  return generalizationOperations;
}

function prepareProfileSemanticProfileGeneralizationOperations(
  generalizations: ProfileGeneralization[],
  mappings: EntityToProfileMapping,
  generalizationSources: EntityIdentifier[],
): CreateGeneralizationOperation[] {
  const generalizationOperations: CreateGeneralizationOperation[] = [];
  generalizations.forEach(item => {
    const child = mappings[item.child];
    const parent = mappings[item.parent];
    if (child === undefined || parent === undefined) {
      return;
    }
    generalizationSources.push(item.id);
    generalizationOperations.push(createGeneralization({
      iri: item.iri,
      child,
      parent,
    }));
  });
  return generalizationOperations;
}

async function createSemanticGeneralizationProfiles(
  context: OperationContext,
  operations: CreateGeneralizationOperation[],
  mappings: EntityToProfileMapping,
  generalizationSources: EntityIdentifier[],
): Promise<EntityIdentifier[]> {
  const generalizationProfiles: EntityIdentifier[] = [];
  (await context.targetModel.executeOperations(operations)).map((item, index) => {
    if (item.success) {
      const source = generalizationSources[index];
      const target = (item as CreatedEntityOperationResult).id;
      mappings[source] = target;
      generalizationProfiles.push(target);
    }
  });
  return generalizationProfiles;
}
