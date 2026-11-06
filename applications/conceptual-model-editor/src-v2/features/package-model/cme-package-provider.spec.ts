import { describe, expect, test } from "vitest";

import { Entity } from "@dataspecer/core/entity-model";
import {
  LOCAL_SEMANTIC_MODEL, VISUAL_MODEL,
} from "@dataspecer/core-v2/model/known-models";
import {
  PROJECT_MODEL_ID, PROJECT_MODEL_MODEL_ENTITY, ProjectModelEntity,
} from "@dataspecer/core/project-model";

import { createCmePackageProvider, type CmePackageStateEvent } from "./cme-package-provider";
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

  test.each([true, false])("Tracks snapshot editability when content arrives first: %s", (contentFirst) => {
    const provider = createCmePackageProvider({ logger: createNoopLogger() });
    let state: CmePackageStateEvent | undefined;
    provider.subscribe(value => { state = value; });
    const projectEntity = createModelEntity("snapshot", LOCAL_SEMANTIC_MODEL);
    const main = {
      id: "snapshot", type: [LOCAL_SEMANTIC_MODEL], label: {},
      source: { type: "snapshot", provider: "rdfs", urls: ["https://example.com/file.ttl"] },
    };
    const projectEvent = { entityChanges: { [PROJECT_MODEL_ID]: [{ previous: null, next: projectEntity }] } };
    const contentEvent = { entityChanges: { snapshot: [{ previous: null, next: main }] } };
    for (const event of contentFirst ? [contentEvent, projectEvent] : [projectEvent, contentEvent]) {
      provider.onEntitiesDidChange(event);
    }
    expect(state!.semanticModels[0]).toMatchObject({ id: "snapshot", isReadOnly: true, isExternal: false });
    const local = { id: main.id, type: main.type, label: main.label };
    provider.onEntitiesDidChange({ entityChanges: { snapshot: [{ previous: main, next: local }] } });
    expect(state!.semanticModels[0]!.isReadOnly).toBe(false);
    provider.onEntitiesDidChange(projectEvent);
    expect(state!.semanticModels[0]!.isReadOnly).toBe(false);
    provider.onEntitiesDidChange({ entityChanges: { snapshot: [{ previous: local, next: main }] } });
    expect(state!.semanticModels[0]!.isReadOnly).toBe(true);
  });

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
