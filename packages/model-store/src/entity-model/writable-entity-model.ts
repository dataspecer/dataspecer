export interface Operation {
  id: string;
  type: string;
}

export interface WritableEntityModel {
  /**
   * Throws error if the operation is not recognized. Otherwise, the operation
   * is applied to the model regardless of the success of the operation.
   */
  dispatch(operations: Operation[]): void;
}