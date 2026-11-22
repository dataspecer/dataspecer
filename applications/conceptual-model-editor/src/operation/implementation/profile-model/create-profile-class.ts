import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import {
  CreatedEntityOperationResult,
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
  executeCreateProfileOperation,
  findProfileModel,
} from "../operation-utilities";

const CreateProfileClassType =
  "create-profile-class-operation";

interface CreateProfileClassArguments extends CmeOperationArguments {

  type: typeof CreateProfileClassType;

  /**
   * Identifier of the created entity.
   */
  identifier: EntityDsIdentifier;

  profileModel: ModelDsIdentifier;

  profileOf: EntityDsIdentifier[];

  iri: string | null;

  name: LanguageString | null;

  nameSource: EntityDsIdentifier | null;

  description: LanguageString | null;

  descriptionSource: EntityDsIdentifier | null;

  usageNote: LanguageString | null;

  usageNoteSource: EntityDsIdentifier | null;

  externalDocumentationUrl: string | null;

  tags: string[];

  order: string | null;

}

interface CreateProfileClassResult
  extends CmeOperationResult<CreateProfileClassArguments> {

  created: EntityDsIdentifier;

}

export const createProfileClassOperation: CmeOperation<
  CreateProfileClassArguments, CreateProfileClassResult,
  Omit<CreateProfileClassArguments, "type" | "identifier">> = {
  metadata: {
    type: CreateProfileClassType,
  },
  create: (context, parameters) => ({
    type: CreateProfileClassType,
    ...parameters,
    identifier: context.createEntityIdentifier(parameters.profileModel),
  }),
  execute: createProfileClassExecutor,
};

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws DataspecerError
 */
async function createProfileClassExecutor(
  context: CmeExecutionContext,
  args: CreateProfileClassArguments,
): Promise<CreateProfileClassResult> {
  const model = findProfileModel(context, args.profileModel);

  const operation = factory.createClassProfile({
    id: args.identifier,
    iri: args.iri,
    profiling: args.profileOf,
    name: args.name,
    nameFromProfiled: args.nameSource,
    description: args.description,
    descriptionFromProfiled: args.descriptionSource,
    usageNote: args.usageNote,
    usageNoteFromProfiled: args.usageNoteSource,
    externalDocumentationUrl: args.externalDocumentationUrl,
    tags: args.tags,
    order: args.order ?? undefined,
    controlledVocabularies: [],
  });

  const result = await executeCreateProfileOperation(model, operation);
  return {
    args,
    created: (result as CreatedEntityOperationResult).id,
  };
}
