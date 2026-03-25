import { v7 as uuidv7 } from 'uuid';

export type OperationIdentifier = string;

export function generateOperationId(): OperationIdentifier {
  return uuidv7();
}

/**
 * Any change to a model must be represented as an operation. By replaying the
 * operations, we must be able to get the same model. The operation is a JSON
 * serializable object that describes the change.
 *
 * Each operation is applied to a single model in isolation, meaning it does not
 * have access to other models. Consequently, you can create an operation that
 * breaks other models; for example, deleting an entity may break models that
 * reference it. This is an intentional design choice.
 *
 * To mitigate this, you can either create a set of operations that target all
 * dependent models or fix the broken models by inspecting the operations of
 * dependent models and acting accordingly. This allows individual applications
 * to work only with the models they understand without worrying about others.
 * Of course, if you depend on a specific model, you should be able to
 * understand its operations and fix your own model accordingly. We refer to
 * this process as "evolution."
 *
 * The effective order of operations may change due to synchronization between
 * the backend and frontend or through state merging. Therefore, an operation
 * cannot throw an error by itself. If an operation cannot be executed, it is
 * simply ignored. Examples include modifying data for an entity that has
 * already been deleted or attempting to delete an already deleted entity.
 *
 * Some cases can be resolved by redefining the operation. For instance, instead
 * of "delete entity," you can use an operation like "ensure entity is deleted."
 * Such an operation can then be applied multiple times without issue.
 */
export interface Operation {
  id: OperationIdentifier;

  // It is not necessary to have a type for the operation here as interpreting
  // the operation is up to the specific model, but most model will have some
  // type of the operation anyway.
  type: string;
}

export interface WrappedOperation<T extends Operation = Operation> {
  id: OperationIdentifier;
  operation: T;
}

export interface OperationInModel<T extends Operation = Operation> extends WrappedOperation<T> {
  modelId: string;
}