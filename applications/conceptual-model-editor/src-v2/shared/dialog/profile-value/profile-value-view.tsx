import { SelectEntity } from "../select-entity";
import { ProfileValuePresenter } from "./profile-value-presenter";
import { ProfileValueState } from "./profile-value-state";

/**
 * Wraps input element with option to select value from a profile.
 */
export function ProfileValue<StateType, PresenterType>(props: {
  state: ProfileValueState<StateType>,
  presenter: ProfileValuePresenter<PresenterType>,
  children: React.ReactNode,
  disabled?: boolean,
}) {
  return (
    <div className="flex">
      {props.children}
      <SelectEntity
        state={props.state.selectEntity}
        placeholder="Select source of profiled value"
        presenter={props.presenter.selectEntity}
      />
    </div>
  )
}
