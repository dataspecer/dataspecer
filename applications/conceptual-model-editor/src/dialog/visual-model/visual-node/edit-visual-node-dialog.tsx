import { DragDropContext, Draggable, Droppable, DroppableStateSnapshot, DropResult } from "@hello-pangea/dnd";
import { t } from "../../../application";
import { DialogProps, DialogWrapper } from "../../dialog-api";
import { useEditVisualNodeController } from "./edit-visual-node-dialog-controller";
import { ContentItem, EditVisualNodeDialogState } from "./edit-visual-node-dialog-state";
import { useMemo } from "react";
import {
  isUiRelationshipProfile,
  UiRelationshipProfile,
} from "../../../catalog-v2/ui-model";
import {
  CmeRelationshipProfileMandatoryLevel,
} from "../../../dataspecer/cme-model";

const LEFT_ID = "left";

const RIGHT_ID = "right";

const EditVisualNode = (props: DialogProps<EditVisualNodeDialogState>) => {
  const controller = useEditVisualNodeController(props);
  const state = props.state;

  const onDragEnd = useMemo(() => (event: DropResult<string>) => {
    const { source, destination } = event;
    if (destination === null) {
      return
    };
    if (source.droppableId === LEFT_ID) {
      if (destination.droppableId === LEFT_ID) {
        controller.orderActive(source.index, destination.index);
      } else {
        controller.deactivate(source.index, destination.index);
      }
    } else {
      if (destination.droppableId === LEFT_ID) {
        controller.activate(source.index, destination.index);
      } else {
        controller.orderInactive(source.index, destination.index);
      }
    }
  }, [controller]);

  return (
    <>
      <div className="min-w-md flex flex-row">
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ flex: 1 }}>
            {t("edit-visual-node-dialog.content-visible")}<br />
            <DroppableArea
              language={state.language}
              identifier={LEFT_ID}
              items={state.activeContent} />
          </div>
          <div style={{ flex: 1 }}>
            {t("edit-visual-node-dialog.content-available")}<br />
            <DroppableArea
              language={state.language}
              identifier={RIGHT_ID}
              items={state.inactiveContent}
            />
          </div>
        </DragDropContext>
      </div>
    </>
  );
};

const DroppableArea = (props: {
  language: string,
  items: ContentItem[],
  identifier: string,
}) => {
  return (
    <Droppable droppableId={props.identifier}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          className={droppableAreaClassName(snapshot)}
          {...provided.droppableProps}
        >
          {props.items.map((item, index) =>
            <DroppableAreaItem
              key={item.identifier}
              language={props.language}
              index={index}
              value={item}
            />)}
          {/* To keep the space. */}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  )
};

const droppableAreaClassName = (snapshot: DroppableStateSnapshot) => {
  return "p-2 h-full"
    + (snapshot.isDraggingOver ? " bg-sky-200" : "");
}

const DroppableAreaItem = (props: {
  language: string,
  index: number,
  value: ContentItem,
}) => {
  return (
    <Draggable
      draggableId={props.value.identifier}
      index={props.index}
    >
      {(provided) => (
        <div
          ref={provided.innerRef}
          className="my-2 p-2 border border-gray-300 bg-white"
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {props.value.label}
          {isUiRelationshipProfile(props.value)
            ? mandatoryLabelToLabel(props.value)
            : null}
        </div>
      )}
    </Draggable>
  )
};

const mandatoryLabelToLabel = (entity: UiRelationshipProfile) => {
  if (entity.mandatoryLevel === null) {
    return null;
  }
  let label;
  switch (entity.mandatoryLevel) {
  case CmeRelationshipProfileMandatoryLevel.Mandatory:
    label = t("edit-visual-node-dialog.level-mandatory");
    break;
  case CmeRelationshipProfileMandatoryLevel.Optional:
    label = t("edit-visual-node-dialog.level-optional");
    break;
  case CmeRelationshipProfileMandatoryLevel.Recommended:
    label = t("edit-visual-node-dialog.level-recommended");
    break;
  }
  return (
    <>
      <br />
      &lt;&lt;{label}&gt;&gt;
    </>
  )
}

export const createEditVisualNodeDialog = (
  state: EditVisualNodeDialogState,
  nodeName: string,
  onConfirm: ((state: EditVisualNodeDialogState) => void) | null,
): DialogWrapper<EditVisualNodeDialogState> => {
  return {
    label: t("edit-visual-node-dialog.label", nodeName),
    component: EditVisualNode,
    state,
    confirmLabel: "edit-visual-node-dialog.btn-ok",
    cancelLabel: "edit-visual-node-dialog.btn-cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };
};
