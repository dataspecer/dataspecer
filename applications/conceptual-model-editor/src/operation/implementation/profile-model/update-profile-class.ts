import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";

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

const UpdateProfileClassType =
  "update-profile-class-operation";

interface UpdateProfileClassArguments extends CmeOperationArguments {

  type: typeof UpdateProfileClassType;

  profileModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

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

type UpdateProfileClassResult =
  CmeOperationResult<UpdateProfileClassArguments>;

export const updateProfileClassOperation: CmeOperation<
  UpdateProfileClassArguments, UpdateProfileClassResult> = {
  metadata: {
    type: UpdateProfileClassType,
  },
  create: (_context, parameters) => ({
    type: UpdateProfileClassType,
    ...parameters,
  }),
  execute: updateProfileClassExecutor,
};

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws CmeOperationExecutionFailed
 */
async function updateProfileClassExecutor(
  context: CmeExecutionContext,
  args: UpdateProfileClassArguments,
): Promise<UpdateProfileClassResult> {
  const model = findProfileModel(context, args.profileModel);

  const operation = factory.modifyClassProfile(args.entity, {
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
    order: args.order,
  });

  await executeCreateProfileOperation(model, operation);
  return { args };
}
