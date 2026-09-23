import { Entity, EntityIdentifier } from "../../../entity-model/entity.ts";
import type { Operation } from "@dataspecer/core/operation";
import { ControlledVocabularyAssignment, CONTROLLED_VOCABULARY_ASSIGNMENT, isControlledVocabularyAssignment, isSemanticModelClassProfile, isSemanticModelRelationshipProfile, SEMANTIC_MODEL_CLASS_PROFILE, SEMANTIC_MODEL_RELATIONSHIP_PROFILE, SemanticModelClassProfile, SemanticModelRelationshipEndProfile, SemanticModelRelationshipProfile, } from "../concepts/index.ts";
import { CreateSemanticModelClassProfile, ModifySemanticModelClassProfile, CreateSemanticModelRelationshipProfile, ModifySemanticModelRelationshipProfile, isCreateSemanticModelClassProfile, isModifySemanticModelClassProfile, isCreateSemanticModelRelationshipProfile, isModifySemanticModelRelationshipProfile, CreateControlledVocabularyAssignment, RemoveControlledVocabularyAssignment, ModifyControlledVocabularyAssignment, isCreateControlledVocabularyAssignment, isRemoveControlledVocabularyAssignment, isModifyControlledVocabularyAssignment, ModifySemanticModelRelationshipEndProfile, isModifySemanticModelRelationshipEndProfile } from "./operations.ts";


export interface OperationResult {

  /**
   * True when operation has been successfully executed.
   */
  success: boolean;

  /**
   * Optional field contains identifiers of any created entities.
   */
  created: EntityIdentifier[];

}

export interface EntityReader {

  entity(identifier: EntityIdentifier): Entity | null;

}

export interface EntityWriter {

  change(updated: Record<EntityIdentifier, Entity>, removed: EntityIdentifier[]): void;

}

export interface SemanticModelProfileOperationExecutor {

  /**
   * Execute given operation and return results.
   *
   * @returns Null, if this executor does not know how to execute the operation.
   */
  executeOperation(operation: Operation): OperationResult | null;

}

class DefaultSemanticModelProfileOperationExecutor implements SemanticModelProfileOperationExecutor {

  private readonly entityReader: EntityReader;

  private readonly entityWriter: EntityWriter;

  public constructor(
    entityReader: EntityReader,
    entityWriter: EntityWriter,
  ) {
    this.entityReader = entityReader;
    this.entityWriter = entityWriter;
  }

  executeOperation(operation: Operation): OperationResult | null {
    if (isCreateSemanticModelClassProfile(operation)) {
      return executeCreateSemanticModelClassProfile(
        this.entityWriter, operation);
    }
    if (isModifySemanticModelClassProfile(operation)) {
      return executeModifySemanticModelClassProfile(
        this.entityReader, this.entityWriter, operation);
    }
    if (isCreateSemanticModelRelationshipProfile(operation)) {
      return executeCreateSemanticModelRelationshipProfile(
        this.entityWriter, operation);
    }
    if (isModifySemanticModelRelationshipProfile(operation)) {
      return executeModifySemanticModelRelationshipProfile(
        this.entityReader, this.entityWriter, operation);
    }
    if (isCreateControlledVocabularyAssignment(operation)) {
      return executeCreateControlledVocabularyAssignment(
        this.entityReader, this.entityWriter, operation);
    }
    if (isRemoveControlledVocabularyAssignment(operation)) {
      return executeRemoveControlledVocabularyAssignment(
        this.entityReader, this.entityWriter, operation);
    }
    if (isModifyControlledVocabularyAssignment(operation)) {
      return executeModifyControlledVocabularyAssignment(
        this.entityReader, this.entityWriter, operation);
    }
    if (isModifySemanticModelRelationshipEndProfile(operation)) {
      return executeModifySemanticModelRelationshipEndProfile(
        this.entityReader, this.entityWriter, operation);
    }
    return null;
  }

}

function executeCreateSemanticModelClassProfile(
  entityWriter: EntityWriter,
  { entity }: CreateSemanticModelClassProfile,
): OperationResult {
  const identifier = entity.id;
  const newEntity: SemanticModelClassProfile = {
    ...defaultClassProfile(),
    ...entity,
    id: identifier,
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
  };
  entityWriter.change({ [identifier]: newEntity }, []);
  return {
    success: true,
    created: [identifier],
  };
}

function defaultClassProfile(): Omit<SemanticModelClassProfile, "id" | "type"> {
  return {
    iri: null,
    name: null,
    nameFromProfiled: null,
    description: null,
    descriptionFromProfiled: null,
    usageNote: null,
    usageNoteFromProfiled: null,
    profiling: [],
    externalDocumentationUrl: null,
    tags: [],
    controlledVocabularies: [],
  }
}

function executeModifySemanticModelClassProfile(
  entityReader: EntityReader,
  entityWriter: EntityWriter,
  { identifier, entity }: ModifySemanticModelClassProfile,
): OperationResult {
  const previous = entityReader.entity(identifier);
  if (previous === null || !isSemanticModelClassProfile(previous)) {
    console.error("Previous values is not class profile, action to update the profile is ignored.",
      { previous, next: entity });
    return {
      success: false,
      created: [],
    };
  };
  const updatedEntity: SemanticModelClassProfile = {
    // The actual entity can be more specialized than SemanticModelClassProfile
    ...previous,

    id: identifier,
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    description: entity.description ?? previous.description,
    descriptionFromProfiled: mergeFromProfiled(entity.descriptionFromProfiled, previous.descriptionFromProfiled),
    name: entity.name ?? previous.name,
    nameFromProfiled: mergeFromProfiled(entity.nameFromProfiled, previous.nameFromProfiled),
    iri: entity.iri ?? previous.iri,
    usageNote: entity.usageNote ?? previous.usageNote,
    usageNoteFromProfiled: mergeFromProfiled(entity.usageNoteFromProfiled, previous.usageNoteFromProfiled),
    profiling: entity.profiling ?? previous.profiling,
    externalDocumentationUrl: mergeFromProfiled(entity.externalDocumentationUrl, previous.externalDocumentationUrl),
    tags: mergeFromProfiled(entity.tags, previous.tags),
    order: mergeFromProfiled(entity.order, previous.order) ?? null,
    controlledVocabularies: mergeFromProfiled(entity.controlledVocabularies, previous.controlledVocabularies),
  };
  entityWriter.change({ [identifier]: updatedEntity }, []);
  return {
    success: true,
    created: [],
  }
}

function mergeFromProfiled<T>(
  next: T | undefined,
  previous: T,
): T {
  // We need to store null, if next is null.
  if (next === undefined) {
    return previous;
  }
  return next;
}

function executeCreateSemanticModelRelationshipProfile(
  entityWriter: EntityWriter,
  { entity }: CreateSemanticModelRelationshipProfile,
): OperationResult {
  const identifier = entity.id;
  const newEntity: SemanticModelRelationshipProfile = {
    ...entity,
    id: identifier,
    type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
    ends: (entity.ends ?? []).map(item => ({
      ...defaultRelationshipEndProfile(),
      ...item,
    })),
  };
  entityWriter.change({ [identifier]: newEntity }, []);
  return {
    success: true,
    created: [identifier],
  };
}

function defaultRelationshipEndProfile():
  Omit<SemanticModelRelationshipEndProfile, "concept"> {
  return {
    name: null,
    nameFromProfiled: null,
    description: null,
    descriptionFromProfiled: null,
    iri: null,
    cardinality: null,
    usageNote: null,
    usageNoteFromProfiled: null,
    profiling: [],
    externalDocumentationUrl: null,
    tags: [],
    order: null,
  }
}

function executeModifySemanticModelRelationshipProfile(
  entityReader: EntityReader,
  entityWriter: EntityWriter,
  { identifier, entity }: ModifySemanticModelRelationshipProfile,
): OperationResult {
  const previous = entityReader.entity(identifier);
  if (previous === null || !isSemanticModelRelationshipProfile(previous)) {
    console.error("Previous values is not relationship profile, action to update the profile is ignored.",
      { previous, next: entity });
    return {
      success: false,
      created: [],
    };
  };

  // When no ends are give, use the one from previous state
  const ends = entity.ends === undefined ? previous.ends :
    // Else we merge old to new, otherwise we would not be able to delete.
    entity.ends.map((value, index) => ({
      ...(previous.ends[index] ?? {}),
      ...value
    }));

  const updatedEntity: SemanticModelRelationshipProfile = {
    // The actual entity can be more specialized than SemanticModelRelationshipProfile
    ...previous,

    id: identifier,
    type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
    ends,
  };
  entityWriter.change({ [identifier]: updatedEntity }, []);
  return {
    success: true,
    created: [],
  }
}

function executeCreateControlledVocabularyAssignment(
  entityReader: EntityReader,
  entityWriter: EntityWriter,
  { entity }: CreateControlledVocabularyAssignment,
): OperationResult {
  const classProfile = entityReader.entity(entity.classProfile);
  if (classProfile === null || !isSemanticModelClassProfile(classProfile)) {
    console.error("Target is not a class profile, create controlled vocabulary assignment is ignored.",
      { entity });
    return { success: false, created: [] };
  }
  const existingOwn = classProfile.controlledVocabularies ?? [];
  // A class profile can only have one of its own assignments per vocabulary
  const existingSiblings = existingOwn
    .map(id => entityReader.entity(id))
    .filter(isControlledVocabularyAssignment);
  if (existingSiblings.some(a => a.vocabulary === entity.vocabulary)) {
    console.error("This class profile already has an own controlled vocabulary assignment for this vocabulary, create controlled vocabulary assignment is ignored.",
      { entity });
    return { success: false, created: [] };
  }
  const identifier = entity.id;
  const newEntity: ControlledVocabularyAssignment = {
    replaces: null,
    iri: null,
    ...entity,
    id: identifier,
    type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
  };
  const updatedClassProfile: SemanticModelClassProfile = {
    ...classProfile,
    controlledVocabularies: [...existingOwn, identifier],
  };
  entityWriter.change(
    { [identifier]: newEntity, [classProfile.id]: updatedClassProfile }, []);
  return { success: true, created: [identifier] };
}

function executeRemoveControlledVocabularyAssignment(
  entityReader: EntityReader,
  entityWriter: EntityWriter,
  { identifier }: RemoveControlledVocabularyAssignment,
): OperationResult {
  const assignment = entityReader.entity(identifier);
  if (assignment === null || !isControlledVocabularyAssignment(assignment)) {
    console.error("Target is not a controlled vocabulary assignment, remove controlled vocabulary assignment is ignored.",
      { identifier });
    return { success: false, created: [] };
  }
  const updated: Record<EntityIdentifier, Entity> = {};
  const classProfile = entityReader.entity(assignment.classProfile);
  if (classProfile !== null && isSemanticModelClassProfile(classProfile)) {
    const updatedClassProfile: SemanticModelClassProfile = {
      ...classProfile,
      controlledVocabularies:
        (classProfile.controlledVocabularies ?? []).filter(id => id !== identifier),
    };
    updated[classProfile.id] = updatedClassProfile;
  }
  // No scan for other assignments whose `replaces.target` points at this
  // one - a dangling `replaces` is read as "no override" 
  entityWriter.change(updated, [identifier]);
  return { success: true, created: [] };
}

function executeModifyControlledVocabularyAssignment(
  entityReader: EntityReader,
  entityWriter: EntityWriter,
  { identifier, changes }: ModifyControlledVocabularyAssignment,
): OperationResult {
  const previous = entityReader.entity(identifier);
  if (previous === null || !isControlledVocabularyAssignment(previous)) {
    console.error("Target is not a controlled vocabulary assignment, modify controlled vocabulary assignment is ignored.",
      { identifier });
    return { success: false, created: [] };
  }
  const updatedEntity: ControlledVocabularyAssignment = { ...previous, ...changes };
  entityWriter.change({ [identifier]: updatedEntity }, []);
  return { success: true, created: [] };
}
function executeModifySemanticModelRelationshipEndProfile(
  entityReader: EntityReader,
  entityWriter: EntityWriter,
  { identifier, endIndex, end }: ModifySemanticModelRelationshipEndProfile,
): OperationResult {
  const previous = entityReader.entity(identifier);
  if (previous === null || !isSemanticModelRelationshipProfile(previous)) {
    console.error("Previous value is not relationship profile, action to update the end profile is ignored.",
      { previous, next: end });
    return {
      success: false,
      created: [],
    };
  }
  const previousEnd = previous.ends[endIndex];
  if (previousEnd === undefined) {
    console.error("End index out of bounds, action to update the end profile is ignored.",
      { endIndex, ends: previous.ends });
    return {
      success: false,
      created: [],
    };
  }
  const ends = [...previous.ends];
  ends[endIndex] = { ...previousEnd, ...end };
  const updatedEntity: SemanticModelRelationshipProfile = {
    ...previous,
    id: identifier,
    type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
    ends,
  };
  entityWriter.change({ [identifier]: updatedEntity }, []);
  return {
    success: true,
    created: [],
  };
}

export function createDefaultSemanticModelProfileOperationExecutor(
  entityReader: EntityReader,
  entityWriter: EntityWriter,
) {
  return new DefaultSemanticModelProfileOperationExecutor(
    entityReader, entityWriter);
}
