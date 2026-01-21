# Model Color Generation

## Overview

This document describes the automatic color generation for semantic models in Dataspecer when colors are not explicitly set through the Conceptual Model Editor (CME).

## Problem

Previously, when creating data structures without using CME, all model badges displayed the same blue color (`#4998f9`), making it difficult to distinguish between different models in the data structure editor.

## Solution

The system now automatically generates unique, deterministic colors for each semantic model based on its identifier. This ensures that:

1. Each model gets a unique color
2. The same model always gets the same color (deterministic)
3. Colors are visually distinct and have good readability (brightness offset of 64)

## Implementation

### Color Generation Algorithm

The color generation uses a deterministic algorithm based on the model's unique identifier:

```typescript
function generateColor(identifier: string, brightness: number): string {
  let sum: number = 0;
  for (let i = 0; i < identifier.length; i++) {
    sum += identifier.charCodeAt(i);
  }

  const offset = brightness;
  const range = 255 - offset;
  
  // Generate RGB values using sinus transformation
  const r = Math.floor(sinusTransformation(sum + 1) * range) + offset;
  const g = Math.floor(sinusTransformation(sum + 2) * range) + offset;
  const b = Math.floor(sinusTransformation(sum + 3) * range) + offset;

  // Return hex color string (e.g., "#C5BB5C")
  return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`.toUpperCase();
}
```

### Where Colors Are Applied

Colors are automatically added to the `thisVocabularyChain` object in three aggregators:

1. **VocabularyAggregator** - For vocabulary models
2. **ApplicationProfileAggregator** - For application profile models
3. **ExternalModelWithCacheAggregator** - For external models with cache

### Usage in UI

The `ExternalEntityBadge` component displays these colors:

```tsx
<span style={{
  background: props.entity.vocabularyChain[0].color ?? "#4998f9",
  // ... other styles
}}>
  {props.entity.vocabularyChain[0].name}
</span>
```

## Example Colors

Based on testing, here are example colors for common models:

- **Main Application Profile**: `#C5BB5C` (yellowish)
- **SGOV cache**: `#6D8C97` (bluish-gray)
- **Test Model 1**: `#809BE9` (bluish)
- **Test Model 2**: `#9BE96D` (greenish)

## Backward Compatibility

- If a model already has a color set from CME, that color will be used
- The fallback blue color (`#4998f9`) is still used if no color is generated (edge case)
- No changes to the visual model storage or CME functionality

## Testing

The implementation includes:

1. **Unit tests** (`color-utils.spec.ts`) - Verify color generation algorithm
2. **Integration tests** (`vocabulary-aggregator.spec.ts`) - Verify aggregators include colors

All tests pass successfully, confirming that:
- Colors are consistent (same ID = same color)
- Colors are unique (different IDs = different colors)
- Colors are valid hex format (`#RRGGBB`)
