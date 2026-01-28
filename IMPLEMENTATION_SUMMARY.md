# Implementation Summary: Generator Configuration Storage at Semantic Level

## Issue #1299: Where to store configuration of generators from semantic level?

### Problem Statement

The issue asked where to store generator configurations (e.g., SHACL generator configuration) from the semantic level. Previously, configurations were only stored at the Data Specification level, with no mechanism for semantic models to provide default configurations.

### Solution Overview

Implemented **two-level configuration storage**:

1. **Semantic Model Level** - Provides default configurations inherited by all data specifications
2. **Data Specification Level** - Overrides semantic model defaults with specification-specific settings

### Architecture

```
┌─────────────────────────────┐
│   Semantic Model            │
│   (InMemorySemanticModel)   │
│                             │
│   modelMetadata: {          │
│     generatorConfiguration  │ ◄─── Defaults for all data specs
│   }                         │
└─────────────────────────────┘
           │
           │ inherited by
           ▼
┌─────────────────────────────┐
│   Data Specification        │
│   (Package)                 │
│                             │
│   artifactConfigurations: [ │
│     {                       │
│       id: "config-resource" │ ◄─── Overrides for this spec
│     }                       │
│   ]                         │
└─────────────────────────────┘
           │
           │ deep merge
           ▼
┌─────────────────────────────┐
│   Final Configuration       │
│   (passed to generators)    │
└─────────────────────────────┘
```

### Implementation Files

| File | Changes | Purpose |
|------|---------|---------|
| `packages/core-v2/src/semantic-model/in-memory/in-memory-semantic-model.ts` | Added `setGeneratorConfiguration()` and `getGeneratorConfiguration()` methods | Stores and retrieves configuration from model metadata |
| `packages/specification/src/specification/adapter.ts` | Modified `getDataSpecificationWithModels()`, added `deepMergeConfigurations()` | Loads and merges configurations from semantic model and data spec |
| `packages/core-v2/src/semantic-model/in-memory/in-memory-semantic-model.spec.ts` | Created 6 test cases | Validates configuration storage, retrieval, serialization |
| `packages/specification/docs/generator-configuration-storage.md` | Comprehensive documentation | Developer guide with use cases and API reference |
| `packages/specification/docs/README.md` | Documentation index | Entry point for specification package docs |

### API Reference

#### InMemorySemanticModel

```typescript
class InMemorySemanticModel {
  /**
   * Sets the generator configuration for this semantic model.
   * Configuration will be used as defaults for all data specifications using this model.
   */
  setGeneratorConfiguration(config: object): void;

  /**
   * Retrieves the generator configuration from this semantic model.
   * @returns The generator configuration object or null if not set
   */
  getGeneratorConfiguration(): object | null;
}
```

### Configuration Merging

Configurations are merged using deep merge (nested objects properly handled):

```typescript
function deepMergeConfigurations(semanticConfig, dataSpecConfig)
```

**Merge Order:**
1. Semantic Model Configuration (base defaults)
2. Data Specification Configuration (overrides)

**Result:** Data spec values override semantic model values, but both are preserved.

### Example Usage

```typescript
// Semantic model provides defaults
const model = new InMemorySemanticModel();
model.setGeneratorConfiguration({
  "data-specification": {
    "useGenerators": {
      "shacl": true,
      "json-schema": false
    },
    "instancesHaveIdentity": "ALWAYS"
  }
});

// Data spec overrides specific settings
// (stored in generator configuration resource)
{
  "data-specification": {
    "useGenerators": {
      "json-schema": true  // Enable for this spec
    }
  }
}

// Final merged configuration:
{
  "data-specification": {
    "useGenerators": {
      "shacl": true,         // From semantic model
      "json-schema": true    // Overridden
    },
    "instancesHaveIdentity": "ALWAYS"  // From semantic model
  }
}
```

### Testing

**Test Suite:** `packages/core-v2/src/semantic-model/in-memory/in-memory-semantic-model.spec.ts`

- ✅ Set and get generator configuration
- ✅ Return null when no configuration set
- ✅ Serialize configuration in model metadata
- ✅ Deserialize configuration from model metadata
- ✅ Preserve existing model metadata
- ✅ Update generator configuration

**Results:** All 22 tests pass (6 new + 16 existing)

### Security

CodeQL security scan: **0 vulnerabilities found**

### Backward Compatibility

✅ **No breaking changes**
- Existing data specifications work without modification
- Semantic model configuration is optional
- Default behavior unchanged when no semantic config is set

### Documentation

**Main Guide:** `/packages/specification/docs/generator-configuration-storage.md`
- Architecture explanation
- Storage levels (semantic vs data spec)
- Configuration merging rules
- Use case examples
- API reference
- Migration guide

**Documentation Index:** `/packages/specification/docs/README.md`

### Benefits

1. **Vocabulary-wide defaults** - Maintainers can set generator preferences for all specs using their semantic model
2. **Flexibility** - Individual specs can override defaults as needed
3. **Maintainability** - Centralized defaults reduce duplication
4. **Inheritance** - Configurations cascade properly from semantic model to spec
5. **Backward compatible** - Existing systems unaffected

### Future Enhancements

Potential improvements (not in this PR):
- UI for editing semantic model generator configuration
- Configuration validation
- Support for multiple semantic models (merge strategies)
- Configuration documentation in semantic model metadata

### Related Resources

- Issue: [#1299](https://github.com/dataspecer/dataspecer/issues/1299)
- Documentation: `/packages/specification/docs/generator-configuration-storage.md`
- Tests: `/packages/core-v2/src/semantic-model/in-memory/in-memory-semantic-model.spec.ts`

---

**Status:** ✅ Complete
**Tests:** ✅ 22/22 passing
**Security:** ✅ No vulnerabilities
**Documentation:** ✅ Complete
