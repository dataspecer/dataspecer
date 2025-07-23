import { Entity, EntityIdentifier } from "../../../entity-model/entity.ts";
import { Operation } from "../../operations/index.ts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile, SEMANTIC_MODEL_CLASS_PROFILE, SEMANTIC_MODEL_RELATIONSHIP_PROFILE, SemanticModelClassProfile, SemanticModelRelationshipEndProfile, SemanticModelRelationshipProfile, } from "../concepts/index.ts";
import { CreateSemanticModelClassProfile, ModifySemanticModelClassProfile, CreateSemanticModelRelationshipProfile, ModifySemanticModelRelationshipProfile, isCreateSemanticModelClassProfile, isModifySemanticModelClassProfile, isCreateSemanticModelRelationshipProfile, isModifySemanticModelRelationshipProfile } from "./operations.ts";

export interface IdentifierSource {

  /**
   * Create and return a new identifier;
   */
  createIdentifier(): EntityIdentifier;

}

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

  private readonly identifierSource: IdentifierSource;

  private readonly entityReader: EntityReader;

  private readonly entityWriter: EntityWriter;

  public constructor(
    identifierSource: IdentifierSource,
    entityReader: EntityReader,
    entityWriter: EntityWriter,
  ) {
    this.identifierSource = identifierSource;
    this.entityReader = entityReader;
    this.entityWriter = entityWriter;
  }

  executeOperation(operation: Operation): OperationResult | null {
    if (isCreateSemanticModelClassProfile(operation)) {
      return executeCreateSemanticModelClassProfile(
        this.identifierSource, this.entityWriter, operation);
    }
    if (isModifySemanticModelClassProfile(operation)) {
      return executeModifySemanticModelClassProfile(
        this.entityReader, this.entityWriter, operation);
    }
    if (isCreateSemanticModelRelationshipProfile(operation)) {
      return executeCreateSemanticModelRelationshipProfile(
        this.identifierSource, this.entityWriter, operation);
    }
    if (isModifySemanticModelRelationshipProfile(operation)) {
      return executeModifySemanticModelRelationshipProfile(
        this.entityReader, this.entityWriter, operation);
    }
    return null;
  }

}

function executeCreateSemanticModelClassProfile(
  identifierSource: IdentifierSource,
  entityWriter: EntityWriter,
  { entity }: CreateSemanticModelClassProfile,
): OperationResult {
  const identifier = identifierSource.createIdentifier();
  const newEntity: SemanticModelClassProfile = {
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
  identifierSource: IdentifierSource,
  entityWriter: EntityWriter,
  { entity }: CreateSemanticModelRelationshipProfile,
): OperationResult {
  const identifier = identifierSource.createIdentifier();
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

export function createDefaultSemanticModelProfileOperationExecutor(
  identifierSource: IdentifierSource,
  entityReader: EntityReader,
  entityWriter: EntityWriter,
) {
  return new DefaultSemanticModelProfileOperationExecutor(
    identifierSource, entityReader, entityWriter);
}
