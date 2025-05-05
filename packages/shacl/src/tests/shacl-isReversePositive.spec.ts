import * as Support from "./support/testSupport.ts";
import  IsReverseModelCreator from "./support/IsReverseModelCreator.ts";

const testType = "isReverse";
const modelCreator = new IsReverseModelCreator();

test('Test SHACL against data - isReverse Positive ', async () => {
  const validation = await Support.testFromData(testType, modelCreator);
  expect(validation.conforms).toBe(true);
});

test('Shape conforms to SHACL standard - isReverse shape', async () => {
  const validation = await Support.testShape(testType, modelCreator);
  expect(validation.conforms).toBe(true);
});