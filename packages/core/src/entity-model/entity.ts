import { v7 as uuidv7 } from 'uuid';

/**
 * Must be unique withing the project.
 *
 * @todo Consider uniqueness only withing the model and use a combination of
 *  model id and entity id to identify an entity globally.
 */
export type EntityIdentifier = string;

/**
 * Generates random entity identifier.
 */
export function generateEntityId(): EntityIdentifier {
  return uuidv7();
}

/**
 * Entity is JSON serializable immutable object that represents a thing in the
 * model.
 *
 * Examples are: semantic model class, property, structure model object,
 * configuration for the generator.
 */
export interface Entity {
  id: EntityIdentifier;

  // Type of the entity is not necessary for the high level interface here, but
  // almost all models will use it, so we can put it here for convenience.
  type: string[];
}

/**
 * Can be used to represent a serialized entity model. As this interface is
 * simplest, it should be used in places where we want to pass the whole entity
 * model for reading.
 *
 * Depending on the typing, it may contain the main entity that describes the
 * model itself. You should filter it out.
 *
 * If a consumer gets an entity with an unknown type, it should ignore it with a
 * warning.
 *
 * @todo maybe consider separating the main entity
 */
export type EntityArray<T extends Entity = Entity> = T[];

export type EntityRecord<T extends Entity = Entity> = Record<string, T>;

export type EntityMap<T extends Entity = Entity> = Map<string, T>;
