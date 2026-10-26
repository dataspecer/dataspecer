import type { Operation } from "../../operation/index.ts";

/**
 * Base class for operation results as should be returned by CoreResourceWriter.
 * Operations may specialize this class to provide more detailed data, yet
 * it is highly recommended to also handle this base version.
 */
export class DataPsmOperationResult {
  /**
   * Types of the result, used by the specializations of this class.
   */
  types: string[] = [];

  /**
   * Operation as stored in the model.
   */
  operation: Operation | null = null;

  /**
   * IRIS of all resources created by the operation.
   */
  created: string[] = [];

  /**
   * IRIs of all resources changed by the operation.
   */
  changed: string[] = [];

  /**
   * IRIs of all resource deleted by the operation.
   */
  deleted: string[] = [];
}
