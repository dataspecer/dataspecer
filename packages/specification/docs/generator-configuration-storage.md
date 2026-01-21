# Generator Configuration Storage

This document describes where and how generator configurations (e.g., SHACL, JSON Schema, XML) are stored in the Dataspecer system.

## Overview

Generator configurations control how artifacts are generated from data specifications. These configurations can be stored at two levels:

1. **Data Specification Level** (Current primary storage)
2. **Semantic Model Level** (New feature for model-wide defaults)

## Storage Levels

### 1. Data Specification Level Configuration

**Location**: Stored as a sub-resource within a Data Specification Package with type `V1.GENERATOR_CONFIGURATION`.

**Structure**:
```typescript
// Resource metadata
{
  iri: string;                           // Unique identifier
  types: ["http://dataspecer.com/resources/v1/generator-configuration"];
  userMetadata: {
    label: LanguageString;
    description?: LanguageString;
  };
}

// Configuration blob (JSON)
{
  "data-specification": {
    publicBaseUrl: string | null;
    useGenerators: Record<string, boolean>;
    instancesHaveIdentity: "ALWAYS" | "NEVER" | "OPTIONAL";
    instancesSpecifyTypes: "ALWAYS" | "NEVER" | "OPTIONAL";
    dataPsmIsClosed: "OPEN" | "CLOSED";
    generatorsEnabledByDefault: boolean;
    skipStructureNameIfOnlyOne: boolean;
    renameArtifacts: Record<string, string>;
  }
}
```

**Usage**: This configuration is specific to a single data specification and controls how its artifacts are generated.

**Access**:
- Retrieved via `DataSpecification.artifactConfigurations[0].id`
- Loaded as JSON blob in `/packages/specification/src/specification/adapter.ts`
- Merged with global and default configurations before passing to generators

### 2. Semantic Model Level Configuration

**Location**: Stored in `InMemorySemanticModel.modelMetadata` field.

**Structure**:
```typescript
// Within semantic model serialization
{
  type: "http://dataspecer.com/resources/local/semantic-model",
  modelId: string;
  modelAlias: string;
  baseIri: string;
  entities: {...},
  
  // Generator configuration stored here
  generatorConfiguration?: {
    "data-specification": {
      // Same structure as data specification level
      publicBaseUrl?: string;
      useGenerators?: Record<string, boolean>;
      // ... other settings
    }
  }
}
```

**Usage**: This configuration provides defaults for all data specifications that use this semantic model.

**Access**:
- Stored in `modelMetadata` when semantic model is serialized
- Retrieved when semantic model is loaded
- Used as a base configuration layer before applying data-spec-specific overrides

## Configuration Merging

Configurations are merged in the following order (later values override earlier):

```
1. Default Configuration (hardcoded defaults)
   ↓ merged with
2. Semantic Model Configuration (from modelMetadata)
   ↓ merged with
3. Global Configuration (system-wide settings)
   ↓ merged with
4. Data Specification Configuration (specification-specific)
   ↓ result
5. Final Configuration (passed to generators)
```

This cascading approach allows:
- System-wide defaults
- Semantic model conventions (e.g., "all models from this vocabulary prefer RDF Turtle")
- Data specification overrides (e.g., "this specific spec needs JSON-LD")

## Implementation Details

### Creating Generator Configuration Resources

**At Data Specification Level**:
```typescript
// File: applications/manager/src/known-models.tsx
[V1.GENERATOR_CONFIGURATION]: {
  needsNaming: false,
  createHook: getHookForStandardModel(V1.GENERATOR_CONFIGURATION, () => ({})),
}
```

**At Semantic Model Level**:
```typescript
// File: packages/core-v2/src/semantic-model/in-memory/in-memory-semantic-model.ts
class InMemorySemanticModel {
  public modelMetadata: object = {};
  
  setGeneratorConfiguration(config: object) {
    this.modelMetadata = {
      ...this.modelMetadata,
      generatorConfiguration: config
    };
  }
  
  getGeneratorConfiguration(): object | null {
    return (this.modelMetadata as any).generatorConfiguration ?? null;
  }
}
```

### Loading and Merging

**File**: `/packages/specification/src/specification/adapter.ts`

```typescript
// Load semantic model configuration
const semanticModel = await getSemanticModel(specification);
const semanticConfig = semanticModel.getGeneratorConfiguration() ?? {};

// Load data spec configuration
const configStore = specification.artifactConfigurations?.[0]?.id;
const configModel = await modelRepository.getModelById(configStore);
const dataSpecConfig = await configModel?.getJsonBlob() ?? {};

// Merge all layers
const finalConfig = mergeConfigurations(
  configurators,
  defaultConfig,
  semanticConfig,        // NEW: semantic model layer
  globalConfig,
  dataSpecConfig
);
```

## Use Cases

### Use Case 1: Vocabulary-Wide Preferences

A vocabulary maintainer wants all data specifications using their semantic model to prefer SHACL validation and RDF Turtle format by default.

**Solution**: Store these preferences in the semantic model's `modelMetadata.generatorConfiguration`:
```json
{
  "data-specification": {
    "useGenerators": {
      "shacl": true,
      "json-schema": false
    }
  }
}
```

### Use Case 2: Specification-Specific Override

A data specification based on the above semantic model needs JSON Schema for a specific use case.

**Solution**: Override in the data specification's generator configuration:
```json
{
  "data-specification": {
    "useGenerators": {
      "json-schema": true
    }
  }
}
```

The final merged configuration will enable both SHACL (from semantic model) and JSON Schema (from data spec override).

## API Reference

### Semantic Model Methods

**`setGeneratorConfiguration(config: object): void`**
- Sets the generator configuration for this semantic model
- Configuration will be used as defaults for all data specs using this model

**`getGeneratorConfiguration(): object | null`**
- Retrieves the generator configuration from this semantic model
- Returns null if no configuration is set

**`serializeModel(): object`**
- Includes generator configuration in the serialized model metadata

### Data Specification Methods

**Existing**: `DataSpecification.artifactConfigurations`
- Array of configuration resource descriptors
- Each has `id` pointing to the configuration blob

## Migration Guide

Existing data specifications will continue to work without changes. To add semantic-level configuration:

1. Load the semantic model
2. Set generator configuration: `model.setGeneratorConfiguration({...})`
3. Save the semantic model
4. All data specs using this model will inherit the configuration

No breaking changes are introduced.

## References

- [Generator Configuration README](/packages/core/src/configuration/README.md) - Original design principles
- [DataSpecification Model](/packages/specification/src/specification/model.ts) - Data spec structure
- [InMemorySemanticModel](/packages/core-v2/src/semantic-model/in-memory/in-memory-semantic-model.ts) - Semantic model implementation
- [Configuration Merging](/packages/specification/src/v1/default-artifact-configurator.ts) - How configs are merged

## Related Issues

- [#1299](https://github.com/dataspecer/dataspecer/issues/1299) - Where to store configuration of generators from semantic level?
