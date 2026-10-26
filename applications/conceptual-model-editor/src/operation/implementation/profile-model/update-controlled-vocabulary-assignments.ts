import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import {
  ControlledVocabularyAssignmentReplaces,
  Qualifier,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  CreatedEntityOperationResult,
} from "@dataspecer/core-v2/semantic-model/operations";

import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  executeCreateProfileOperation,
  findProfileModel,
} from "../operation-utilities";

export function updateControlledVocabularyAssignmentsOperation(
  args: Omit<UpdateControlledVocabularyAssignmentsArguments, "type">,
): CmeOperation<UpdateControlledVocabularyAssignmentsArguments, UpdateControlledVocabularyAssignmentsResult> {
  return {
    type: UpdateControlledVocabularyAssignmentsType,
    ...args,
  };
}

const UpdateControlledVocabularyAssignmentsType =
  "update-controlled-vocabulary-assignments-operation";

/**
 * Controlled vocabulary assignment owned by the class profile.
 */
export interface OwnControlledVocabularyAssignment {

  /**
   * Identifier of the assignment entity, null for a new assignment.
   */
  assignment: EntityDsIdentifier | null;

  vocabulary: EntityDsIdentifier;

  qualifier: Qualifier;

  /**
   * Inherited assignment this one overrides, null for no override.
   * Used only when creating a new assignment.
   */
  replaces: ControlledVocabularyAssignmentReplaces | null;

}

interface UpdateControlledVocabularyAssignmentsArguments
  extends CmeOperationArguments {

  type: typeof UpdateControlledVocabularyAssignmentsType;

  profileModel: ModelDsIdentifier;

  /**
   * The owning class profile.
   */
  entity: EntityDsIdentifier;

  /**
   * Own assignments before the change.
   * Use empty array for a new class profile.
   */
  previous: OwnControlledVocabularyAssignment[];

  /**
   * Own assignments after the change.
   */
  next: OwnControlledVocabularyAssignment[];

}

interface UpdateControlledVocabularyAssignmentsResult
  extends CmeOperationResult<UpdateControlledVocabularyAssignmentsArguments> {

  created: EntityDsIdentifier[];

  removed: EntityDsIdentifier[];

}

cmeOperationExecutorRegistry.register(
  UpdateControlledVocabularyAssignmentsType,
  updateControlledVocabularyAssignmentsOperation,
  { execute: updateControlledVocabularyAssignmentsExecutor });

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * Each assignment is a separate entity, so they are diffed individually.
 * New assignments are created, assignments with changed qualifier are
 * modified, and assignments missing in next are removed.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function updateControlledVocabularyAssignmentsExecutor(
  context: CmeExecutionContext,
  args: UpdateControlledVocabularyAssignmentsArguments,
): Promise<UpdateControlledVocabularyAssignmentsResult> {
  const model = findProfileModel(context, args.profileModel);

  const previousById = new Map(args.previous
    .filter(item => item.assignment !== null)
    .map(item => [item.assignment as EntityDsIdentifier, item]));

  const created: EntityDsIdentifier[] = [];
  for (const item of args.next) {
    if (item.assignment === null) {
      const result = await executeCreateProfileOperation(model,
        factory.createControlledVocabularyAssignment({
          classProfile: args.entity,
          vocabulary: item.vocabulary,
          qualifier: item.qualifier,
          replaces: item.replaces,
        }));
      created.push((result as CreatedEntityOperationResult).id);
      continue;
    }
    const before = previousById.get(item.assignment);
    if (before !== undefined && before.qualifier !== item.qualifier) {
      await executeCreateProfileOperation(model,
        factory.modifyControlledVocabularyAssignment(
          item.assignment, { qualifier: item.qualifier }));
    }
  }

  const nextIds = new Set(args.next
    .map(item => item.assignment)
    .filter(item => item !== null));
  const removed: EntityDsIdentifier[] = [];
  for (const identifier of previousById.keys()) {
    if (nextIds.has(identifier)) {
      continue;
    }
    await executeCreateProfileOperation(model,
      factory.removeControlledVocabularyAssignment(identifier));
    removed.push(identifier);
  }

  return { args, created, removed };
}
