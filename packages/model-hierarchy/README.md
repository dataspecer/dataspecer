# @dataspecer/model-hierarchy

Interprets the packages and models in `@dataspecer/core/project-model` as a graph of specifications and semantic models.

Load the project model and its semantic models, then pass them to `buildModelHierarchy`. Each specification records:

- `applicationProfile`: its application profile ID, or `null`.
- `vocabularies`: its locally defined vocabulary IDs.
- `usedExternalSpecifications`: direct child specification IDs and directly imported external vocabulary IDs.

An application profile's `profiles` contains its specification's local vocabularies followed by its external dependencies. Child specifications remain specification references; their dependencies are not expanded. Vocabulary entities have no dependency list.

The hierarchy records dependencies without deciding which entities pass through to an aggregated output. That policy belongs to the aggregator builder.

Projects injected through `reusedProjects` appear as child packages in the project model and are handled like other specification dependencies.

`ModelHierarchyModel` observes relevant model-store changes and rebuilds the hierarchy. Consumers can subscribe to its entity changes. The hierarchy is read-only; changes to package membership still go through the project model.
