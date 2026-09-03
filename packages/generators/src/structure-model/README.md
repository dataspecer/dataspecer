# Structure model

See [model-driven architecture in data modeling](../../../../documentation/2022-04-21-model-driven-architecture.md) for more details.

This model does not load nor interpret any values from the PIM level. For that, you must use transformations.

This directory is divided into several subdirectories:
- [adapter](adapter) - functionality to load the structure model from Data PSM
- [model](model) - classes representing the model
- [transformation](transformation) - functions that can enrich the model with additional data, such as CIM IRI, labels, etc.
