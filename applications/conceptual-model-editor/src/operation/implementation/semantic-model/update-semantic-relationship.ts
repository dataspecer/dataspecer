import { modifyRelation } from "@dataspecer/core-v2/semantic-model/operations";

import {
  EntityDsIdentifier,
  LanguageString,
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
  executeCreateSemanticOperation,
  findSemanticModel,
} from "../operation-utilities";

export function updateSemanticRelationshipOperation(
  args: Omit<UpdateSemanticRelationshipArguments, "type">,
): CmeOperation<UpdateSemanticRelationshipArguments, UpdateSemanticRelationshipResult> {
  return {
    type: UpdateSemanticRelationshipType,
    ...args,
  };
}

const UpdateSemanticRelationshipType =
  "update-semantic-relationship-operation";

interface UpdateSemanticRelationshipArguments extends CmeOperationArguments {

  type: typeof UpdateSemanticRelationshipType;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  domain: EntityDsIdentifier | null;

  domainCardinality: [number, number | null] | null;

  range: EntityDsIdentifier | null;

  rangeCardinality: [number, number | null] | null;

  externalDocumentationUrl: string | null;

  order: string | null;

}

type UpdateSemanticRelationshipResult =
  CmeOperationResult<UpdateSemanticRelationshipArguments>;

cmeOperationExecutorRegistry.register(
  UpdateSemanticRelationshipType,
  updateSemanticRelationshipOperation,
  { execute: updateSemanticRelationshipExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function updateSemanticRelationshipExecutor(
  context: CmeExecutionContext,
  args: UpdateSemanticRelationshipArguments,
): Promise<UpdateSemanticRelationshipResult> {
  const model = findSemanticModel(context, args.semanticModel);

  const operation = modifyRelation(args.entity, {
    ends: [{
      iri: null,
      name: {},
      description: {},
      concept: args.domain,
      cardinality: args.domainCardinality ?? undefined,
    }, {
      iri: args.iri,
      name: args.name ?? {},
      description: args.description ?? {},
      concept: args.range,
      cardinality: args.rangeCardinality ?? undefined,
      externalDocumentationUrl: args.externalDocumentationUrl ?? null,
      order: args.order,
    }],
  });

  await executeCreateSemanticOperation(model, operation);
  return { args };
}
