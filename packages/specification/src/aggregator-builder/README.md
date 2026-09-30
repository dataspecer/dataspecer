# @dataspecer/specification/aggregator-builder

Builds a semantic model aggregator from `@dataspecer/model-hierarchy` and raw model entities.

```ts
const aggregator = build(specificationId, hierarchy, models, onChange, executeOperation, {
  forcePassThrough: false, // optional; defaults to false
  canAddEntities: true, // optional; defaults to true
  canModify: true, // optional; defaults to true
});
```

The root specification exposes only its application profile, or its local vocabularies if there is no profile. With `forcePassThrough`, it also exposes its local vocabularies and external dependencies. Referenced specifications always use pass-through, recursively including their profiles, local vocabularies, and external dependencies.

Only the application profile referenced by the root specification receives `canAddEntities` and `canModify`. All other profiles are read-only. Operations on source vocabularies and external-model caches are still forwarded, allowing external entities to be loaded for profiling.

Each semantic model is wrapped and subscribed to once per build, even when shared by several dependencies. Entity changes update the aggregation; hierarchy changes require a new build. Cyclic aggregation dependencies are rejected. Empty outputs are supported.
