import { useState } from "react";

import { EntityRepresentative } from "../utilities/dialog-utilities";
import { t } from "../../application";
import { SelectEntity } from "./select-entity";
import { CmeReference, CmeSpecialization, NewCmeSpecialization } from "../../dataspecer/cme-model/model";

type Specialization = NewCmeSpecialization | CmeSpecialization;

export const SpecializationSelect = (props: {
  language: string,
  items: EntityRepresentative[],
  specializations: (Specialization)[],
  addSpecialization: (specialized: CmeReference) => void,
  removeSpecialization: (value: Specialization) => void,
}) => {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<EntityRepresentative>(props.items[0]);

  if (props.items.length === 0 && props.specializations.length === 0) {
    return (
      <div className="flex w-full flex-col">
        {t("create-class-dialog.no-specialization-available")}
      </div>
    );
  }

  // We create list of active specializations and
  // list of what we can add.
  const candidatesToAdd: EntityRepresentative[] = [];
  const active: [EntityRepresentative, Specialization][] = [];
  for (const item of props.items) {
    const specialization = props.specializations.find(
      ({ specializationOf }) => specializationOf.identifier === item.identifier);
    if (specialization === undefined) {
      candidatesToAdd.push(item);
    } else {
      active.push([item, specialization]);
    }
  }

  const addSpecialization = () => {
    props.addSpecialization({
      identifier: selected.identifier,
      model: selected.model,
    });
    setAdding(!adding);
  };

  const openAdd = () => {
    // Select default value.
    setSelected(candidatesToAdd[0]);
    setAdding(true);
  };

  return (
    <div className="flex w-full flex-col">
      <div>
        {active.map(([item, specialization]) => (
          <RemovableSpecialization
            key={item.identifier}
            language={props.language}
            item={item}
            specialization={specialization}
            removeSpecialization={props.removeSpecialization}
          />
        ))}
        {/* If there is nothing to add we do not offer that to the user. */}
        {candidatesToAdd.length === 0 ? null : (adding
          ? (
            <div className="flex w-full flex-row gap-1">
              <button onClick={addSpecialization}>
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
    </div>
  );
};

const RemovableSpecialization = (props: {
  language: string,
  item: EntityRepresentative,
  specialization: Specialization,
  removeSpecialization: (value: Specialization) => void,
}) => {
  return (
    <div>
      <button onClick={() => props.removeSpecialization(props.specialization)}>
        🗑
      </button>
      &nbsp;
      {props.item.displayLabel}
    </div>
  )
}
