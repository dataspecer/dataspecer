import { generatorConfigurationToRdf } from "./generator-configuration-to-dsv.ts";
import { turtleStringToGeneratorConfiguration } from "./rdf-to-generator-configuration.ts";

describe("DSV Generator Configuration", () => {
  test("serialization roundtrip basic", async () => {
    const config: Record<string, Record<string, any>> = {
      "data-specification": {
        outputPath: "./output",
        pretty: true,
        indent: 2,
      },
      json: {
        outputPath: {
          complex: [1, 2, 3],
        },
      },
      "http://example.com/fullIri": {
        someOption: "value",
        enabled: false,
      },
    };

    const turtle = await generatorConfigurationToRdf("http://example.com/my-config#", config);
    const parsed = await turtleStringToGeneratorConfiguration("http://example.com/my-config#", turtle);

    expect(parsed).toEqual(config);
  });

  test("serialization roundtrip complex keys", async () => {
    const config: Record<string, Record<string, any>> = {
      "complex key / value": {
        hello: "world",
      },
      json: {
        'complex sub-key "/': 42,
      },
    };

    const turtle = await generatorConfigurationToRdf("http://example.com/my-config#", config);
    const parsed = await turtleStringToGeneratorConfiguration("http://example.com/my-config#", turtle);

    expect(parsed).toEqual(config);
  });
});
