/**
 * Must be globally unique across the application.
 */
export type ModelIdentifier = string;

export interface Model {
  id: ModelIdentifier;
}
