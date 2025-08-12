import {
  InMemorySemanticModel,
} from "@dataspecer/core-v2/semantic-model/in-memory";
import { EntityModel } from "@dataspecer/entity-model";

export {
  InMemorySemanticModel,
} from "@dataspecer/core-v2/semantic-model/in-memory";

export function isInMemorySemanticModel(
  what: EntityModel,
): what is InMemorySemanticModel {
  return what instanceof InMemorySemanticModel;
}
