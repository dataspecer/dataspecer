import * as Support from "./support/testSupport.ts";
import TargetCase5ModelCreator from "./support/TargetCase5ModelCreator.ts";
import { readFileSync } from 'fs';
import { join } from 'path';

const testType = "targetCase5";
const modelCreator = new TargetCase5ModelCreator();

test('Shex map creation test - targetCase5', async () => {
  await expect(async () => await Support.shexMapTest(modelCreator)).rejects.toThrow('Unable to target the Data structure defined with ShEx query map due to possible SHACL incompatibility. Either define at least one unique type of class with instance typing mandatory or define at least one unique attribute going from the root or its associations with cardinality bigger than 0.');
});