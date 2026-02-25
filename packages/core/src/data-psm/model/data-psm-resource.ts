import { LanguageString } from "../../core/index.ts";
import { ExtendableCoreResource } from "./extendable-core-resource.ts";

export class DataPsmBaseResource extends ExtendableCoreResource {
  /**
   * Structure entity may "profile" another structure entity. Another PSM entity
   * that this entity profiles (refines, customizes). The profiled entity must
   * have interpretation pointing to the conceptual entity that is profile or
   * self of semantic entity that interprets this entity.
   *
   * Empty array or undefined means that this does not profile any other entity.
   *
   * @todo There is intentional similarity with {@link Profile.profiling}. The
   * reason is that on the FUNCTIONALITY level it has similar behavior an many
   * algorithms may be reused. The only difference is the MEANING of what
   * profiling is here and on the conceptual level.
   */
  profiling?: string[];
}

export class DataPsmResource extends DataPsmBaseResource {
  /**
   * Label used in human readable documents as a name for this resource.
   */
  dataPsmHumanLabel: LanguageString | null = null;

  /**
   * Description, longer plain text, shown in human readable documents
   * as a description for this resource.
   */
  dataPsmHumanDescription: LanguageString | null = null;

  /**
   * Label used by file formats, may represent a name of a property
   * in JSON or tag name in XML.
   */
  dataPsmTechnicalLabel: string | null = null;

  /**
   * Points to semantic entity that this entity interprets or represents.
   *
   * If null, then this entity is not linked to any conceptual entity, which in
   * reality means that this is just some helper structure, for example to wrap
   * some attributes for better readability, or something like technical
   * property for specific system or database, etc. In practice, a good
   * structure should have all entities interpreted besides objects/element
   * wrappers.
   *
   * @todo This should be, in fact, an array. The reason is that there is no
   * data-integrity type issue why one structural entity, such as JSON object,
   * can not interpret multiple conceptual entities. In practice, we would like
   * to enforce that any complex juggling should be done on conceptual level,
   * but one exception may be a reference, where the reference may interpret its
   * own concept and also the concept of the referenced entity.
   */
  dataPsmInterpretation: string | null = null;

  protected constructor(iri: string | null) {
    super(iri);
  }
}
