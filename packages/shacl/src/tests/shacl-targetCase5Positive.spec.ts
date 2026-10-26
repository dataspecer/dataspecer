import * as Support from "./support/testSupport.ts";
import TargetCase5ModelCreator from "./support/TargetCase5ModelCreator.ts";

const testType = "targetCase5";
const modelCreator = new TargetCase5ModelCreator();

test('Test SHACL against data - target case #5 POSITIVE ', async () => {
  function testFromData() {
    Support.testFromData(testType, modelCreator);
  }

  await expect(async () => await Support.testFromData(testType, modelCreator)).rejects.toThrow('Unable to target the Data structure defined with SHACL shape. Either define at least one unique type of class with instance typing mandatory or define at least one unique attribute going from the root or its associations with cardinality bigger than 0.');
  //expect(Support.testFromData(testType, modelCreator)).toThrow(Error);
});

test('Shape conforms to SHACL standard - target case #5 ', async () => {
  await expect(async () => await Support.testShape(testType, modelCreator)).rejects.toThrow('Unable to target the Data structure defined with SHACL shape. Either define at least one unique type of class with instance typing mandatory or define at least one unique attribute going from the root or its associations with cardinality bigger than 0.');
});

