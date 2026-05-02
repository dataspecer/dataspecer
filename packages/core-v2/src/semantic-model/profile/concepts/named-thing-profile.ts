import { LanguageString, type NamedThing } from "../../concepts/index.ts";

/**
 * For each property we can have a value, or inherit it from a given profiled entity.
 */
export interface NamedThingProfile {

  name: LanguageString | null;

  /**
   * If set, the value of respective property must be load from the profile.
   */
  nameFromProfiled: string | null;

  /**
   * If {@link nameFromProfiled} is set, then this property indicates
   * dsv:reusedAsProperty of name. Otherwise it has the same meaning as
   * {@link NamedThing.nameProperty}.
   *
   * @see
   * https://mff-uk.github.io/data-specification-vocabulary/dsv/#reusedAsProperty
   *
   * If not set, then the value is unknown.
   */
  nameProperty?: string | null;

  description: LanguageString | null;

  /**
   * If set, the value of respective property must be load from the profile.
   */
  descriptionFromProfiled: string | null;

  /**
   * If {@link descriptionFromProfiled} is set, then this property indicates
   * dsv:reusedAsProperty of description. Otherwise it has the same meaning as
   * {@link NamedThing.descriptionProperty}.
   *
   * @see https://mff-uk.github.io/data-specification-vocabulary/dsv/#reusedAsProperty
   *
   * If not set, then the value is unknown.
   */
  descriptionProperty?: string | null;
}
