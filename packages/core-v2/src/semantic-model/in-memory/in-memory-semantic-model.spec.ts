import { InMemorySemanticModel } from "./in-memory-semantic-model.ts";

describe("InMemorySemanticModel generator configuration", () => {
  test("Should set and get generator configuration", () => {
    const model = new InMemorySemanticModel();
    
    const config = {
      "data-specification": {
        publicBaseUrl: "https://example.com",
        useGenerators: {
          "shacl": true,
          "json-schema": false
        }
      }
    };
    
    model.setGeneratorConfiguration(config);
    
    const retrievedConfig = model.getGeneratorConfiguration();
    expect(retrievedConfig).toEqual(config);
  });

  test("Should return null when no configuration is set", () => {
    const model = new InMemorySemanticModel();
    
    const config = model.getGeneratorConfiguration();
    expect(config).toBeNull();
  });

  test("Should serialize generator configuration in model metadata", () => {
    const model = new InMemorySemanticModel();
    model.setBaseIri("https://example.com/model");
    
    const config = {
      "data-specification": {
        useGenerators: {
          "shacl": true
        }
      }
    };
    
    model.setGeneratorConfiguration(config);
    
    const serialized = model.serializeModel();
    expect(serialized.generatorConfiguration).toEqual(config);
  });

  test("Should deserialize generator configuration from model metadata", () => {
    const model = new InMemorySemanticModel();
    
    const data = {
      type: "http://dataspecer.com/resources/local/semantic-model",
      modelId: "test-model-id",
      modelAlias: "test-alias",
      baseIri: "https://example.com/model",
      entities: {},
      generatorConfiguration: {
        "data-specification": {
          useGenerators: {
            "shacl": true
          }
        }
      }
    };
    
    model.deserializeModel(data);
    
    const config = model.getGeneratorConfiguration();
    expect(config).toEqual(data.generatorConfiguration);
  });

  test("Should preserve existing model metadata when setting generator configuration", () => {
    const model = new InMemorySemanticModel();
    
    // Set some metadata
    model.modelMetadata = {
      customField: "customValue",
      anotherField: 123
    };
    
    const config = {
      "data-specification": {
        useGenerators: {
          "shacl": true
        }
      }
    };
    
    model.setGeneratorConfiguration(config);
    
    expect((model.modelMetadata as any).customField).toBe("customValue");
    expect((model.modelMetadata as any).anotherField).toBe(123);
    expect((model.modelMetadata as any).generatorConfiguration).toEqual(config);
  });

  test("Should update generator configuration", () => {
    const model = new InMemorySemanticModel();
    
    const config1 = {
      "data-specification": {
        useGenerators: {
          "shacl": true
        }
      }
    };
    
    model.setGeneratorConfiguration(config1);
    
    const config2 = {
      "data-specification": {
        useGenerators: {
          "shacl": false,
          "json-schema": true
        }
      }
    };
    
    model.setGeneratorConfiguration(config2);
    
    const retrievedConfig = model.getGeneratorConfiguration();
    expect(retrievedConfig).toEqual(config2);
  });
});
