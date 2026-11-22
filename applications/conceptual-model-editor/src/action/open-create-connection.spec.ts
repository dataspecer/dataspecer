import { describe, expect, test, vi } from "vitest";
import { SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { openCreateConnectionDialogAction } from "./open-create-connection";
import { ConnectionType, CreateConnectionState } from "../dialog/obsolete/create-connection-dialog";
import { DialogApiContextType } from "../dialog/dialog-service";
import { DialogWrapper } from "../dialog/dialog-api";
import { UseModelGraphContextType } from "../context/model-context";
import { ClassesContext } from "../context/classes-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { Options } from "../configuration/options";
import {
  addNode,
  createClass,
  createClassProfile,
  createOperationTestContext,
  OperationTestContext,
  visualProfileRelationships,
  visualRelationships,
} from "../operation/implementation/operation-test-utilities";

describe("openCreateConnectionDialogAction", () => {

  test("Association is shown only between the connected nodes.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const source = addNode(context, a);
    addNode(context, a);
    const target = addNode(context, b);
    const { action, confirm } = prepare(context);

    action(a, b, source, target);
    await confirm(ConnectionType.Association);

    const edges = visualRelationships(context.visualModel);
    expect(edges).toMatchObject([{ visualSource: source, visualTarget: target }]);
  });

  test("Generalization is shown only between the connected nodes.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const source = addNode(context, a);
    const target = addNode(context, b);
    addNode(context, b);
    const { action, confirm } = prepare(context);

    action(a, b, source, target);
    await confirm(ConnectionType.Generalization);

    const edges = visualRelationships(context.visualModel);
    expect(edges).toMatchObject([{ visualSource: source, visualTarget: target }]);
  });

  test("Class profile connected to a class profiles it and shows the edge.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const profile = await createClassProfile(context, a);
    const source = addNode(context, profile);
    const target = addNode(context, b);
    const { action } = prepare(context);

    action(profile, b, source, target);

    await vi.waitFor(() => expect(visualProfileRelationships(context.visualModel))
      .toMatchObject([{ entity: profile, visualSource: source, visualTarget: target }]));
    const entity = context.semanticModel.getEntities()[profile] as SemanticModelClassProfile;
    expect(entity.profiling).toEqual([a, b]);
  });

  test("Class profile connected to a class it already profiles changes nothing.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const profile = await createClassProfile(context, a);
    const source = addNode(context, profile);
    const target = addNode(context, a);
    const { action, notifications } = prepare(context);

    action(profile, a, source, target);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(visualProfileRelationships(context.visualModel)).toEqual([]);
    expect(notifications.error).not.toHaveBeenCalled();
  });

});

/**
 * Wires the action to the test context, the dialog is captured instead of shown.
 */
function prepare(context: OperationTestContext) {
  const model = context.semanticModel;
  let dialog: DialogWrapper<CreateConnectionState> | null = null;
  const dialogs = {
    openDialog: (value: DialogWrapper<CreateConnectionState>) => { dialog = value; },
  } as unknown as DialogApiContextType;
  const notifications = {
    error: vi.fn(), success: vi.fn(),
  } as unknown as UseNotificationServiceWriterType;
  const graph = {
    executor: () => context.executor,
    getAggregatedEntities: () => Object.fromEntries(Object.values(model.getEntities())
      .map(entity => [entity.id, { aggregatedEntity: entity }])),
  } as unknown as UseModelGraphContextType;
  const classes = {
    sourceModelOfEntityMap: new Map(Object.keys(model.getEntities()).map(id => [id, model.getId()])),
    semanticModels: new Map([[model.getId(), model]]),
    semanticModelsList: [model],
  } as unknown as ClassesContext;
  const options = { language: "en" } as Options;

  const action = (
    semanticSource: string, semanticTarget: string, visualSource: string, visualTarget: string,
  ) => openCreateConnectionDialogAction(
    context.executor, options, dialogs, notifications, graph, classes, context.visualModel,
    semanticSource, semanticTarget, visualSource, visualTarget);

  const confirm = async (type: ConnectionType) => {
    const opened = dialog as DialogWrapper<CreateConnectionState> | null;
    if (opened === null || opened.onConfirm === null) {
      throw new Error("The dialog was not opened.");
    }
    await opened.onConfirm({ ...opened.state, type });
  };

  return { action, confirm, notifications };
}
