import { SelectEntityItem } from "../select-entity";

export interface ProfileValueState<StateType> {

  /**
   * State to pass the wrapped component.
   */
  wrapped: StateType;

  /**
   * Control disable state of wrapped component.
   */
  wrappedDisabled: boolean;

  /**
   * User modified valued.
   */
  value: StateType;

  /**
   * When true the value from a profile should be used.
   */
  override: boolean;

  /**
   * When false the override option is disabled.
   */
  overrideEnabled: boolean;

  /**
   * State for profile selector.
   */
  selectEntity: {

    /**
     * Selected profile.
     */
    value: ProfileValueItem<StateType> | null;

    /**
     * All available profiles.
     */
    items: ProfileValueItem<StateType>[];

  };

}

export interface ProfileValueItem<Type> extends SelectEntityItem {

  /**
   * Value to use from this profile.
   */
  value: Type;

}
