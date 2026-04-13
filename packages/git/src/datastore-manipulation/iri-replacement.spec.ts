import { expect, test } from "vitest";
import { createDatastoreWithReplacedIris } from "./iri-replacement.ts";
import { psmResourceFromDcatInputForTesting, psmResourceFromDcatOutputForTesting } from "./iri-replacement-test-data.ts";

test("Basic test for iri replacement 1", () => {
  // The not-replaced should be kept, all the others should have the substrings replaced by replaced-result*
  const inputForIriReplacement: object = {
    "replace1": "replace1-replace2",          // TODO RadStr PR: This is iffy, we are not aware of any such case in Dataspecer. However, maybe we should replace both
    "not-replace-since-it-is-not-anywhere": "replace1",
    "ok-replace1": "ok-replace2",
    "ok-replace3": "replace2",
    "not-replace4": "replace3",
    "replace4-without-known-replacement": "replace4-without-known-replacement",
    "replace5-with-suffix": "prefix-for-replace5",
  };

  const irisToReplaceMap = {
    "replace1": "replaced-result1",
    "replace2": "replaced-result2",
    "replace3": "replaced-result3",
    "replace4-without-known-replacement": null,
    "replace5": "replaced-result5",
  };


  const replacedInput = createDatastoreWithReplacedIris(inputForIriReplacement, irisToReplaceMap);

  expect(replacedInput.missingIrisInNew).toEqual(["replace4-without-known-replacement"]);
  expect(replacedInput.containedIriToReplace).toBe(true);

  const expectedReplaceOutput = {
    "replaced-result1": "replaced-result1-replace2",
    "not-replace-since-it-is-not-anywhere": "replaced-result1",
    "ok-replaced-result1": "ok-replaced-result2",
    "ok-replaced-result3": "replaced-result2",
    "not-replace4": "replaced-result3",
    "replace4-without-known-replacement": "replace4-without-known-replacement",
    "replaced-result5-with-suffix": "prefix-for-replaced-result5",
  };

  expect(replacedInput.datastoreWithReplacedIris).toEqual(expectedReplaceOutput);
});


test("Basic test for iri replacement real example", () => {
  const irisToReplaceMap = {
    "48192f17-b300-4eb3-8c46-b3ed63bab12f": "replacement-iri",
  };
  const replacedInput = createDatastoreWithReplacedIris(psmResourceFromDcatInputForTesting, irisToReplaceMap);

  expect(replacedInput.missingIrisInNew).toEqual([]);
  expect(replacedInput.containedIriToReplace).toBe(true);
  expect(replacedInput.datastoreWithReplacedIris).toEqual(psmResourceFromDcatOutputForTesting);
});
