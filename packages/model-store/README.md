# @dataspecer/model-store

Currently there is only a single implementation targeted at the frontend. In the future, we may also provide an implementation for the backend and a read-only implementation (no subscribe, no write) for other use cases.

## Frontend implementation

When working with the Dataspecer project, you often need to read and manipulate multiple models simultaneously. This package provides an API to do so, primarily targeting frontend applications, which must handle backend synchronization, observability, undo/redo operations, and other concerns.

The goal of this API is to provide raw access to the models, specifically entity models:

- You can subscribe to all entity changes across relevant models and read raw entities from individual models.
- You can apply changes to multiple models simultaneously.
- The API provides (or will provide) undo/redo functionality that updates the entity list.
- It supports live synchronization with the backend and conflict resolution.

This API:

- **DOES NOT** understand the semantics of entities and models (entities are simply JSON-serializable objects with an ID).
- **DOES NOT** provide any high-level aggregation of entities (e.g., compute the effective title of a profile that profiles a vocabulary concept).

