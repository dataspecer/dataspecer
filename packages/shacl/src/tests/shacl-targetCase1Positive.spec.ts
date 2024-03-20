import * as Support from "./support/testSupport";
import TargetCase1ModelCreator from "./support/TargetCase1ModelCreator";
import * as fs from "fs";

const testType = "targetCase1";
const modelCreator = new TargetCase1ModelCreator();

test('Test SHACL against data - target case #1 POSITIVE ', async () => {
  const validation = await Support.testFromData(testType, modelCreator);
  expect(validation.conforms).toBe(true);
  const shape = await fs.readFileSync("src/tests/shapes/" + testType + "Shape.ttl",
    { encoding: 'utf8', flag: 'r' });
  expect(shape).toContain("sh:targetClass <https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa>")
});

test('Shape conforms to SHACL standard - target case #1 ', async () => {
  const validation = await Support.testShape(testType, modelCreator);
  expect(validation.conforms).toBe(true);
});

