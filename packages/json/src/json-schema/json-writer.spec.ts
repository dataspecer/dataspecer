import { StringJsonWriter } from "./string-json-writer.ts";
import { MemoryOutputStream } from "@dataspecer/core/io/stream/memory-output-stream";

test("Write a simple object with arrays and strings.", async () => {
  const actual = new MemoryOutputStream();
  const writer = StringJsonWriter.createObject(actual);
  await writer.value("one", 1);
  await writer.value("two", true);
  await writer.valueIfNotNull("three", null);
  const array = writer.array("array");
  await array.object().closeObject();
  const object = array.object();
  await object.value("key", "value");
  await object.closeObject();
  await array.closeArray();
  await writer.closeObject();
  const expected = '{"one":1,"two":true,"array":[{},{"key":"value"}]}';
  expect(actual.getContent().replaceAll(" ", "").replaceAll("\n", "")).toEqual(expected);
});
