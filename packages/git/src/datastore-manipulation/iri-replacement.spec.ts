import { expect, test } from "vitest";
import { createDatastoreWithReplacedIris } from "./iri-replacement.ts";

test("Basic test for iri replacement", () => {
  const inputForIriReplacement: object = {
    "replace1": "replace1-replace2",
    "not-replace": "replace1",
    "not-replace1": "not-replace2",
    "not-replace3": "replace2",
    "not-replace4": "replace3",
    "replace4-without-known-replacement": "replace4-without-known-replacement",
  };

  const irisToReplaceMap = {
    "replace1": "replaced-result1",
    "replace2": "replaced-result2",
    "replace3": "replaced-result3",
    "replace4-without-known-replacement": null,
  };


  const replacedInput = createDatastoreWithReplacedIris(inputForIriReplacement, irisToReplaceMap);
  console.info({replacedInput});

  expect(replacedInput.missingIrisInNew).toEqual(["replace4-without-known-replacement"]);
  expect(replacedInput.containedIriToReplace).toBe(true);

  const expectedReplaceOutput = {
    "replaced-result1": "replace1-replace2",
    "not-replace": "replaced-result1",
    "not-replace1": "not-replace2",
    "not-replace3": "replaced-result2",
    "not-replace4": "replaced-result3",
    "replace4-without-known-replacement": "replace4-without-known-replacement",
  };

  expect(replacedInput.datastoreWithReplacedIris).toEqual(expectedReplaceOutput);
});