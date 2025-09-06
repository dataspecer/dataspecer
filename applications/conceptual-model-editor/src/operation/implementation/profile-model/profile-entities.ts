import {
  EntityDsIdentifier,
  LanguageString,
  ModelDsIdentifier,
} from "@/dataspecer/entity-model";
import {
  isSemanticClass,
  isSemanticGeneralization,
  isSemanticRelationship,
  SemanticClass,
  SemanticGeneralization,
  SemanticRelationship,
  SemanticRelationshipEnd,
} from "@dataspecer/semantic-model";
import {
  isProfileClass,
  isProfileGeneralization,
  isProfileRelationship,
  ProfileClass,
  ProfileGeneralization,
  ProfileRelationship,
  ProfileRelationshipEnd,
} from "@dataspecer/profile-model";
import {
  CreatedEntityOperationResult,
  createGeneralization,
  CreateGeneralizationOperation,
} from "@dataspecer/core-v2/semantic-model/operations";
import {
  createDefaultSemanticModelProfileOperationFactory,
  CreateSemanticModelClassProfile,
  CreateSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/operations";

import { CmeOperationArguments, CmeOperationResult } from "../../operation";
import {
  CmeExecutionContext,
  register,
} from "../../operation-registry";
import {
  findProfileModel,
} from "../operation-utilities";
import { OwlThingIdentifier } from "../../../dataspecer/semantic-model";

const ProfileEntitiesType = "profile-entities-operation";

register(
  ProfileEntitiesType,
  createDefaultProfilesExecutor,
  "Profile entities",
  "Create profiles for selected entities in the given model."
);

export interface ProfileEntities extends CmeOperationArguments {

  type: typeof ProfileEntitiesType;

  /**
   * Entities to profile.
   */
  entities: EntityDsIdentifier[];

  /**
   * Model to place the profiles into.
   */
  profileModel: ModelDsIdentifier;

}

type ProfileEntitiesResult = CmeOperationResult<ProfileEntities> & {

  classProfiles: EntityDsIdentifier[];

  relationshipProfiles: EntityDsIdentifier[];

  generalizationProfiles: EntityDsIdentifier[];

};

export type ProfileEntitiesOperation = [
  ProfileEntities, ProfileEntitiesResult];

const factory = createDefaultSemanticModelProfileOperationFactory();

export async function createDefaultProfilesExecutor(
  context: CmeExecutionContext,
  args: ProfileEntities,
): Promise<ProfileEntitiesResult> {
  const model = findProfileModel(context, args);
  const mappings: Record<EntityDsIdentifier, EntityDsIdentifier> = {};
  // Select entities to profile.
  const semanticClasses: SemanticClass[] = [];
  const semanticRelationships: SemanticRelationship[] = [];
  const semanticGeneralizations: SemanticGeneralization[] = [];
  const profileClasses: ProfileClass[] = [];
  const profileRelationships: ProfileRelationship[] = [];
  const profileGeneralizations: ProfileGeneralization[] = [];
  {
    const profiling = new Set(args.entities);
    const models = [...context.semanticModels, ...context.profileModels];
    for (const model of models) {
      const entities = model.getEntities();
      args.entities
        .map(identifier => entities[identifier])
        .filter(item => item !== undefined)
        .forEach(item => {
          if (profiling.has(item.id)) {
            profiling.delete(item.id);
          } else {
            return;
          }
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
    }
  }
  // Profile classes.
  const classOperations: CreateSemanticModelClassProfile[] = [];
  {
    semanticClasses.forEach(item => {
      classOperations.push(factory.createClassProfile({
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
    });
    profileClasses.forEach(item => {
      classOperations.push(factory.createClassProfile({
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
      }));
    });
  }
  // Execute and collect mapping.
  const classProfiles: EntityDsIdentifier[] = [];
  (await model.executeOperations(classOperations)).map((item, index) => {
    if (item.success) {
      const source = classOperations[index].entity.profiling[0];
      const target = (item as CreatedEntityOperationResult).id;
      mappings[source] = target;
      classProfiles.push(target);
    }
  });
  // Profile relationships.
  const relationshipSources: EntityDsIdentifier[] = [];
  const relationshipOperations: CreateSemanticModelRelationshipProfile[] = [];
  {
    semanticRelationships.forEach(item => {
      if (item.ends.length !== 2) {
        return;
      }
      relationshipSources.push(item.id);
      const [first, second] = item.ends;
      // Make sure we have a correct order.
      if (first.iri === null) {
        relationshipOperations.push(factory.createRelationshipProfile({
          ends: [
            domainEndProfile(mappings, first),
            rangeEndProfile(mappings, second, item.id, null),
          ]
        }));
      } else {
        relationshipOperations.push(factory.createRelationshipProfile({
          ends: [
            domainEndProfile(mappings, second),
            rangeEndProfile(mappings, first, item.id, null),
          ]
        }));
      }
    });
    profileRelationships.forEach(item => {
      if (item.ends.length !== 2) {
        return;
      }
      relationshipSources.push(item.id);
      const [first, second] = item.ends;
      // Make sure we have a correct order.
      if (first.iri === null) {
        relationshipOperations.push(factory.createRelationshipProfile({
          ends: [
            domainEndProfile(mappings, first),
            rangeEndProfile(mappings, second, item.id, null),
          ]
        }));
      } else {
        relationshipOperations.push(factory.createRelationshipProfile({
          ends: [
            rangeEndProfile(mappings, first, item.id, first.usageNote),
            domainEndProfile(mappings, second),
          ]
        }));
      }
    });
  }
  // Execute and collect mapping.
  const relationshipProfiles: EntityDsIdentifier[] = [];
  (await model.executeOperations(relationshipOperations)).map((item, index) => {
    if (item.success) {
      const source = relationshipSources[index];
      const target = (item as CreatedEntityOperationResult).id;
      mappings[source] = target;
      relationshipProfiles.push(target);
    }
  });
  // Generalizations.
  const generalizationSources: EntityDsIdentifier[] = [];
  const generalizationOperations: CreateGeneralizationOperation[] = [];
  {
    semanticGeneralizations.forEach(item => {
      const child = mappings[item.child];
      const parent = mappings[item.child];
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
    profileGeneralizations.forEach(item => {
      const child = mappings[item.child];
      const parent = mappings[item.child];
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
  }
  // Execute and collect mapping.
  const generalizationProfiles: EntityDsIdentifier[] = [];
  (await model.executeOperations(generalizationOperations)).map((item, index) => {
    if (item.success) {
      const source = relationshipSources[index];
      const target = (item as CreatedEntityOperationResult).id;
      mappings[source] = target;
      generalizationProfiles.push(target);
    }
  });
  //
  return {
    args,
    classProfiles,
    relationshipProfiles,
    generalizationProfiles,
  };
}

function domainEndProfile(
  conceptMapping: Record<EntityDsIdentifier, EntityDsIdentifier>,
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
  conceptMapping: Record<EntityDsIdentifier, EntityDsIdentifier>,
  range: SemanticRelationshipEnd | ProfileRelationshipEnd,
  profiled: EntityDsIdentifier,
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
