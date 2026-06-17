# @dataspecer/model-store

Currently there is only a single implementation targeted at the frontend. In the future, we may also provide an implementation for the backend and a read-only implementation (no subscribe, no write) for other use cases.

## Frontend implementation

When working with the Dataspecer project, you often need to read and manipulate multiple models simultaneously. This package provides an API to do so, primarily targeting frontend applications, which must handle backend synchronization, observability, undo/redo operations, and other concerns.

The goal of this API is to provide raw access to the models, specifically entity models:

- You can subscribe to all entity changes across relevant models and read raw entities from individual models.
- You can apply changes to multiple models simultaneously.
- The API provides undo/redo functionality that updates the entity list.
- It supports live synchronization with the backend and conflict resolution.

This API:

- **DOES NOT** understand the semantics of entities and models (entities are simply JSON-serializable objects with an ID).
- **DOES NOT** provide any high-level aggregation of entities (e.g., compute the effective title of a profile that profiles a vocabulary concept).

## Core Concepts

The underlying principle of this package is that most models can be interpreted as a set of entities. This abstraction simplifies synchronization and change tracking with the backend. While most tools only require a list of these entity-based models, frontend applications must maintain strict consistency across them.

This package provides a unified snapshot of all models and an event subscription mechanism that guarantees changes are delivered consistently across the entire model set.

In addition to standard models, the store utilizes a **project model**. This virtual model represents the overall structure of the project (i.e., which models exist and their locations) using the same entity-based approach. Callers are expected to read the project model first to understand the project structure before consuming individual models. Because the project model is virtual and does not physically exist on the backend, it is assigned an artificial ID.
