import { SelectEntitiesPresenter } from "./select-entities-presenter";
import { SelectEntitiesItem, SelectEntitiesState } from "./select-entities-state";
import { SelectEntity } from "../select-entity";

export function SelectEntities(props: {
  state: SelectEntitiesState,
  presenter: SelectEntitiesPresenter,
  /**
   * Placeholder to show when there is no selected item.
   */
  placeholder: string,
  /**
   * When true render in read only mode.
   */
  disabled?: boolean,
}) {
  return (
    <div className="w-full">
      <div className="flex">
        {props.state.value.map(item => (
          <RemovableItem
            key={item.id}
            value={item}
            onRemove={props.presenter.onRemove}
            disabled={props.disabled}
          />
        ))}
      </div>
      {props.state.selectEntity.items.length === 0 ? null : (
        props.state.isSelectOpen ? (
          <div className="py-1 flex w-full flex-row gap-3">
            <button onClick={props.presenter.onAdd}
              disabled={props.state.selectEntity.value === null}
            >
              Add
            </button>
            <button onClick={props.presenter.onCloseSelect}>
              Cancel
            </button>
            <SelectEntity
              state={props.state.selectEntity}
              placeholder={props.placeholder}
              presenter={props.presenter}
            />
          </div>
        ) : (
          <span>
            <button
              className="px-2 py-1 hover:shadow-sm"
              onClick={props.presenter.onOpenSelect}
              title="Add"
            >
              ➕
            </button>
            {props.state.value.length === 0 ? props.placeholder : ""}
          </span>
        )
      )}
    </div>
  )
}

function RemovableItem(props: {
  value: SelectEntitiesItem,
  onRemove: (value: SelectEntitiesItem) => void,
  disabled?: boolean,
}) {
  return (
    <div>
      {props.disabled ? null :
        <button onClick={() => props.onRemove(props.value)}>🗑</button>
      }
      &nbsp;
      {props.value.label}
    </div>
  )
}
