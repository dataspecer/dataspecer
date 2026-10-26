import { SelectEntityPresenter } from "../select-entity";
import { ProfileValueItem, ProfileValueState } from "./profile-value-state";

export function createProfileValuePresenter<WrappedState, PresenterType>(
  setState: (next: (state: ProfileValueState<WrappedState>)
    => ProfileValueState<WrappedState>) => void,
  createWrappedPresenter: (setState: (next: (state: WrappedState) => WrappedState) => void) => PresenterType,
): ProfileValuePresenter<PresenterType> {
  return {
    wrapped: createWrappedPresenter((next) => {
      setState(state => ({ ...state, wrapped: next(state.wrapped) }))
    }),
    selectEntity: {
      onChange(value) {
        setState(state => {
          return {
            ...state
          }
        });
      },
    },
    onToggleOverride() {
      setState(state => {
        if (state.override) {

        } else {

        }
        return {
          ...state,
        }
      });
    },
  }
}

export interface ProfileValuePresenter<PresenterType> {

  /**
   * Presenter for wrapped component.
   */
  wrapped: PresenterType;

  /**
   * Presenter for profile selector.
   */
  selectEntity: SelectEntityPresenter;

  /**
   * Toggle override option.
   */
  onToggleOverride: () => void;

}
