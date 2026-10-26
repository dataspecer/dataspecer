# Data PSM level

See [model-driven architecture in data modeling](../../../../documentation/2022-04-21-model-driven-architecture.md) for more details.

Schema is represented by `DataPsmSchema`, which is a root of the PSM tree. Then, the schema may contain classes or references to class, attributes, and association ends.

This directory is divided into several subdirectories:
- [adapter](adapter) - contains functionality to recreate or save the model, such as RDF representation
- [model](model) - classes representing PSM entities - class, attribute, class reference, etc.
- [operation](operation) - `Operation` to manipulate the model, such as create class, remove the attribute, etc.
- [executor](executor) - methods that can execute the operations above and modify the model
