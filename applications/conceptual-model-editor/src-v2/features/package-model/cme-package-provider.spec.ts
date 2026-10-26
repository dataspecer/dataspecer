import { describe, expect, test } from "vitest";

import { Entity } from "@dataspecer/core/entity-model";
import {
  LOCAL_SEMANTIC_MODEL, VISUAL_MODEL,
} from "@dataspecer/core-v2/model/known-models";
import {
  PROJECT_MODEL_ID, PROJECT_MODEL_MODEL_ENTITY, ProjectModelEntity,
} from "@dataspecer/core/project-model";

import { createCmePackageProvider } from "./cme-package-provider";
import { EntitiesChangeEvent } from "../../infrastructure/dataspecer";
import { createNoopLogger } from "../../infrastructure/logger";

function createModelEntity(
  id: string, modelType: string,
): ProjectModelEntity {
  return {
    id,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: { en: id },
    description: {},
    modelType,
    projectId: "project",
  } as ProjectModelEntity;
}

describe("CmePackageProvider", () => {

  test("Does not duplicate models when a create event is received again.", () => {
    const provider = createCmePackageProvider({ logger: createNoopLogger() });

    const semanticModel = createModelEntity("semantic-1", LOCAL_SEMANTIC_MODEL);
    const visualModel = createModelEntity("visual-1", VISUAL_MODEL);

    const event: EntitiesChangeEvent = {
      entityChanges: {
        [PROJECT_MODEL_ID]: [
          { previous: null, next: semanticModel as Entity },
          { previous: null, next: visualModel as Entity },
        ],
      },
    };

    let state: {
      semanticModels: { id: string }[];
      visualModels: { id: string }[];
    } = { semanticModels: [], visualModels: [] };

    provider.subscribe((value) => { state = value });

    // First notification creates the models.
    provider.onEntitiesDidChange(event);

    // The same, un-changed, create event is received again.
    // This can happen for example when the upstream source re-sends
    // its full state.
    provider.onEntitiesDidChange(event);

    expect(state.semanticModels.map(item => item.id))
      .toStrictEqual(["semantic-1"]);
    expect(state.visualModels.map(item => item.id))
      .toStrictEqual(["visual-1"]);
  });

});
