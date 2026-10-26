import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

/**
 * Moves property (association, attribute or include) to another container.
 *
 * De facto can be used instead of DataPsmSetOrder, although this has different semantics.
 *
 * todo: Is PSM tree really a tree?
 */
export class DataPsmMoveProperty implements Operation {
  static readonly TYPE = PSM.MOVE_PROPERTY;

  id: string;

  type: string;

  /**
   * The container we are moving the property from.
   */
  dataPsmSourceContainer: string | null = null;

  /**
   * DataPsmAttribute or DataPsmAssociation
   */
  dataPsmProperty: string | null = null;

  /**
   * DataPsmClass or container to move the property to.
   */
  dataPsmTargetContainer: string | null = null;

  /**
   * Set null to move to the first position.
   */
  dataPsmMoveAfter: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmMoveProperty.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmMoveProperty {
    return operation?.type === DataPsmMoveProperty.TYPE;
  }
}
