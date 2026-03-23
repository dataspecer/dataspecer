import { v7 as uuidv7 } from 'uuid';

export type OperationIdentifier = string;

export function generateOperationId(): OperationIdentifier {
  return uuidv7();
}

/**
 * Any change to a model must be represented as an operation. By replaying the
 * operations, we must be able to get the same model. The operation is a JSON
 * serializable object that describes the change. Each operation is applied to a
 * single model in isolation, meaning that it does not have access to other
 * models.
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