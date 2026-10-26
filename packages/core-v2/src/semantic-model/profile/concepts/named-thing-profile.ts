import { LanguageString } from "@dataspecer/core/core/core-resource";

/**
 * For each property we can have a value, or inherit it from a given profiled entity.
 */
export interface NamedThingProfile {

  name: LanguageString | null;

  /**
   * Profile from which {@link name} should be read.
   * When provided value in {@link name} should be ignored.
   */
  nameFromProfiled: string | null;

  description: LanguageString | null;

  /**
   * Profile from which {@link description} should be read.
   * When provided value in {@link description} should be ignored.
   */
  descriptionFromProfiled: string | null;

}
