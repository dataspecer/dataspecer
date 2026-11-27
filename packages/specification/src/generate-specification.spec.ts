import { expect, test } from "vitest";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { SEMANTIC_MODEL_APPLICATION_PROFILE_SUBTYPE } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { MemoryStreamDictionary } from "@dataspecer/core/io/stream/memory-stream-dictionary";
import { PROJECT_MODEL_MODEL_ENTITY } from "@dataspecer/core/project-model";
import { generateSpecification } from "./specification.ts";

const PACKAGE_ID = "package";
const MODEL_ID = `${PACKAGE_ID}/semantic-model`;

test("A package whose only model is an empty application profile still produces its DSV file.", async () => {
  const output = new MemoryStreamDictionary();

  await generateSpecification(PACKAGE_ID, {
    models: {
      _project_model: {
        [PACKAGE_ID]: { id: PACKAGE_ID, type: [PROJECT_MODEL_MODEL_ENTITY], projectId: PACKAGE_ID, modelType: LOCAL_PACKAGE, label: { en: "Empty profile" }, subModels: [MODEL_ID] },
        [MODEL_ID]: { id: MODEL_ID, type: [PROJECT_MODEL_MODEL_ENTITY], projectId: PACKAGE_ID, modelType: LOCAL_SEMANTIC_MODEL, label: { en: "Empty profile" } },
      },
      [MODEL_ID]: {
        [MODEL_ID]: {
          id: MODEL_ID,
          type: ["http://dataspecer.com/resources/local/semantic-model"],
          subType: SEMANTIC_MODEL_APPLICATION_PROFILE_SUBTYPE,
          baseIri: "https://example.com/profile/",
          modelId: MODEL_ID,
          entities: {},
        },
      },
    } as never,
    output,
    fetch: (async () => { throw new Error("No network expected."); }) as never,
    artifacts: [],
  });

  expect(await output.list()).toContain("dsv.ttl");
});
