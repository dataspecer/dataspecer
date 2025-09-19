
/**
 * This interface captures requirements on an object based on the BackendPackageService.
 * @deprecated
 */
export interface LegacyModel {

  /**
   * @deprecated Use getIdentifier instead.
   * @returns Model identifier.
   */
  getId(): string;

  /**
   * @deprecated Use SerializableModel instead.
   * @returns JSON representation of model content to be send to backend.
   */
  serializeModel() : object;

  /**
   * Replace model content with value loaded from given JSON representation of the model.
   * @deprecated Use factory instead.
   * @returns This model.
   */
  deserializeModel(value: object): this;

}
