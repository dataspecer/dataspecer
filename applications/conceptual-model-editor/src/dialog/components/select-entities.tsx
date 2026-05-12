import { useState } from "react";

import { EntityRepresentative } from "../utilities/dialog-utilities";
import { t } from "../../application";
import { SelectEntity } from "./select-entity";

export function SelectEntities<
  ItemType extends EntityRepresentative,
  ValueType extends { identifier: string },
>(props: {
  language: string,
  items: ItemType[],
  value: ValueType[],
  onAdd: (identifier: string) => void,
  onRemove: (value: ValueType) => void,
  disableRemove?: boolean
}) {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<EntityRepresentative>(props.items[0]);

  const candidatesToAdd: EntityRepresentative[] = [];
  const active: [EntityRepresentative, ValueType][] = [];
  for (const item of props.items) {
    const value = props.value.find(value => value.identifier === item.identifier);
    if (value === undefined) {
      candidatesToAdd.push(item);
    } else {
      active.push([item, value]);
    }
  }

  const onAdd = () => {
    props.onAdd(selected.identifier);
    setAdding(!adding);
  };

  const openAdd = () => {
    // Select default value.
    setSelected(candidatesToAdd[0]);
    setAdding(true);
  };

  return (
    <div className="w-full">
      <div className="flex">
        {active.map(([item, value]) => (
          <RemovableItem
            key={item.identifier}
            language={props.language}
            item={item}
            value={value}
            onRemove={props.onRemove}
            disabled={props.disableRemove ?? false}
          />
        ))}
      </div>
      {/* If there is nothing to add we do not offer that to the user. */}
      {candidatesToAdd.length === 0 ? null : (adding
        ? (
          <div className="flex w-full flex-row gap-1">
            <button onClick={onAdd}>
              Add
            </button>
            <button onClick={() => setAdding(!adding)}>
              Cancel
            </button>
            <SelectEntity
              language={props.language}
              items={candidatesToAdd}
              value={selected}
              onChange={setSelected}
            />
          </div>
        ) : (
          <button
            className="px-2 py-1 hover:shadow-sm"
            onClick={openAdd}
            title={t("create-class-dialog.add-specialization")}
          >
            ➕
          </button>
        ))}
    </div>
  );
};

function RemovableItem<ValueType>(props: {
  language: string,
  item: EntityRepresentative,
  value: ValueType,
  onRemove: (value: ValueType) => void,
  disabled: boolean,
}) {
  return (
    <div>
      {props.disabled ? null :
        <button onClick={() => props.onRemove(props.value)}>
          🗑
        </button>
      }
      &nbsp;
      {props.item.displayLabel}
    </div>
  )
}
