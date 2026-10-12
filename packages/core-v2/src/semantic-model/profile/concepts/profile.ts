import { LanguageString } from "@dataspecer/core/core";
import { isModelProfile } from "./is-model-profile.ts";

/**
 * Use this for `subType` of the main entity of the semantic model to explicitly
 * mark the model as an application profile.
 *
 * @see {@link isModelProfile}
 */
export const SEMANTIC_MODEL_APPLICATION_PROFILE_SUBTYPE = "https://w3id.org/dsv#ApplicationProfile";

/**
 * The idea of profile is to use an entity in a user defined context.
 * A single profile entity can profile multiple other entities.
 */
export interface Profile {

  /**
   * Public, usually globally-recognized, identifier of the entity.
   * Null indicates absence of the public IRI.
   */
  iri: string | null;

  /**
   * Identifiers of all profiled entities.
   */
  profiling: string[];

  /**
   * Information about the meaning of a profile.
   */
  usageNote: LanguageString | null;

  /**
   * Profile from which {@link usageNote} should be read.
   * When provided value in {@link usageNote} should be ignored.
   */
  usageNoteFromProfiled: string | null;

  /**
   * URL to external documentation.
   */
  externalDocumentationUrl: string | null;

}
