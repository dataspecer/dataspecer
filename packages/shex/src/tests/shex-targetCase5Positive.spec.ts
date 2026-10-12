import * as Support from "./support/testSupport.ts";
import TargetCase5ModelCreator from "./support/TargetCase5ModelCreator.ts";

const testType = "targetCase5";
const modelCreator = new TargetCase5ModelCreator();

test('Shape conforms to SxEx standard - simpleObject', async () => {

  //const validationReportStatus = Support.testShexShape(testType, modelCreator);
  const shexTester = new Support.TestResults();
  await expect(async () => await shexTester.testShexShape(testType, modelCreator)).rejects.toThrow('Unable to create ShEx shape due to possible SHACL incompatibility. Either define at least one unique type of class with instance typing mandatory or define at least one unique attribute going from the root or its associations with cardinality bigger than 0.');

});

