# @dataspecer/generators

This is a code for legacy generators in Dataspecer.

- `./src/conceptual-model` - model and adapters for converting semantic model (including application profile) to simplified representation of conceptual model
- `./src/generator` - generator implementation
- `./src/structure-model` - model and adapters for converting structure model to simplified representation of structure model


## Controlled vocabularies

A class profile can have controlled vocabularies assigned. An assignment says which vocabulary it is and how it is used (the qualifier: *must*, *at least one*, *recommended* or *may*). The generator package prepares data modelled conceptually for generators of technical artefacts (JSON Schema, XML Schema and others). The generators get the controlled vocabulary assignments together with the rest of its structure model, and decide from them which rules to check. They go through these steps:

1. **Profile aggregation.** The [aggregator of class profiles](../core-v2/src/semantic-model/profile/aggregator/semantic-class-profile-aggregator.ts) collects the assignments of a class profile: its own and those of the profiled classes. An assignment of the profile that replaces an inherited one removes it.
2. **Conceptual model.** The controlled vocabulary assignments contain only a reference to the controlled vocabulary (saved in the project as a data model). The [conceptual model adapter](src/conceptual-model/adapter/conceptual-model-adapter.ts) resolves the assignments references to plain vocabulary data (title, pattern of the IRIs of its values, link). An assignment whose vocabulary is missing in the model or with an unknown qualifier is skipped.
3. **Structure model.** [`propagateControlledVocabularies`](src/structure-model/transformation/propagate-controlled-vocabularies.ts), a part of the default transformation, maps the assignments from the conceptual model type to the structural model.
4. **Defaults.** For *recommended*, the specification chooses whether a value from the vocabulary is required and whether other values are forbidden. [`structureModelAddDefaultValues`](src/structure-model/transformation/add-default-values.ts) fills the options of a class that does not set them from the configuration of the data specification. A generator calls it before it reads the rules.
5. **Classes without properties.** A class without properties is turned into a primitive type of an IRI. [`structureModelTransformPrimitiveTypes`](src/structure-model/transformation/transform-primitive-types.ts) keeps its assignments and options on that type, so the rules still apply to the value.
6. **Rules.** [`getControlledVocabularyRules`](src/structure-model/helper/controlled-vocabulary-rules.ts) turns the assignments of a class (or of such a primitive type) into patterns of two kinds: the ones that every value must match, and the ones that at least one value must match. *Must* gives the first, *at least one* the second, and *recommended* one of them according to the options. *May* and vocabularies without a pattern create no rules.

The rules are the same for all generators, each of them expresses them in its own language. See the [JSON Schema](../json) and [XML Schema](../xml/README.md#controlled-vocabularies-in-the-xml-schema) generators.
