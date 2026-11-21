import {
  CreatedEntityOperationResult,
  createRelationship,
} from "@dataspecer/core-v2/semantic-model/operations";

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
import {
  executeCreateSemanticOperation,
  findSemanticModel,
} from "../operation-utilities";

const CreateSemanticRelationshipType =
  "create-semantic-relationship-operation";

interface CreateSemanticRelationshipArguments extends CmeOperationArguments {

  type: typeof CreateSemanticRelationshipType;

  /**
   * Identifier of the created entity.
   */
  identifier: EntityDsIdentifier;

  semanticModel: ModelDsIdentifier;

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

interface CreateSemanticRelationshipResult
  extends CmeOperationResult<CreateSemanticRelationshipArguments> {

  created: EntityDsIdentifier;

}

export const createSemanticRelationshipOperation: CmeOperation<
  CreateSemanticRelationshipArguments, CreateSemanticRelationshipResult,
  Omit<CreateSemanticRelationshipArguments, "type" | "identifier">> = {
  metadata: {
    type: CreateSemanticRelationshipType,
  },
  create: (context, parameters) => ({
    type: CreateSemanticRelationshipType,
    ...parameters,
    identifier: context.createEntityIdentifier(parameters.semanticModel),
  }),
  execute: createSemanticRelationshipExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function createSemanticRelationshipExecutor(
  context: CmeExecutionContext,
  args: CreateSemanticRelationshipArguments,
): Promise<CreateSemanticRelationshipResult> {
  const model = findSemanticModel(context, args.semanticModel);

  const operation = createRelationship({
    id: args.identifier,
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
      order: args.order ?? undefined,
    }],
  });

  const result = await executeCreateSemanticOperation(model, operation);
  return {
    args,
    created: (result as CreatedEntityOperationResult).id,
  };
}
