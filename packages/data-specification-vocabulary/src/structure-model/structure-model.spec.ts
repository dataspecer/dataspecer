import type { CoreResource } from "@dataspecer/core/core/core-resource";
import * as PSM from "@dataspecer/core/data-psm/data-psm-vocabulary";
import { turtleStringToStructureModel } from "./rdf-to-structure-model.ts";
import { structureModelToRdf } from "./structure-model-to-dsv.ts";

test("DSV Structure Model serialization roundtrip", async () => {
  const model = [
    {
      iri: "http://example.com/model#",
      types: [PSM.SCHEMA],
    },
    {
      iri: "http://example.com/model#Entity1",
      types: ["http://example.com/model#SomeType"],
      someProperty: "someValue",
      complexProperty: {
        key: "value",
        number: 42,
        array: [1, 2, 3],
        complexString: "A string with special characters: \n\t\"'\\ and unicode: üñîçødé",
      }
    }
  ] as CoreResource[];

  const turtle = await structureModelToRdf(model, { });

  const parsed = await turtleStringToStructureModel(turtle);

  expect(parsed).toEqual(model);
});
