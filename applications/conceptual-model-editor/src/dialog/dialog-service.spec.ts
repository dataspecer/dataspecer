import { describe, expect, test, vi } from "vitest";

import { DialogWrapper } from "./dialog-api";
import {
  createDialogApiContext,
  createDialogRendererContext,
  createInitialDialogContextStateType,
} from "./dialog-service";

describe("Dialog service", () => {

  test("Synchronous confirm closes the dialog.", () => {
    const dialogs = createDialogs();
    const onConfirm = vi.fn();
    dialogs.api.openDialog(createDialog("A", onConfirm));

    dialogs.renderer()?.confirm();

    expect(onConfirm).toHaveBeenCalledWith({ value: "A" });
    expect(dialogs.labels()).toEqual([]);
  });

  test("Asynchronous confirm closes the dialog once it resolves.", async () => {
    const dialogs = createDialogs();
    const confirm = deferred();
    dialogs.api.openDialog(createDialog("A", () => confirm.promise));

    dialogs.renderer()?.confirm();

    expect(dialogs.labels()).toEqual(["A"]);
    expect(dialogs.renderer()?.pending).toBe(true);
    confirm.resolve();
    await confirm.promise;
    await Promise.resolve();
    expect(dialogs.labels()).toEqual([]);
  });

  test("Confirm and close are ignored while confirm runs.", () => {
    const dialogs = createDialogs();
    const confirm = deferred();
    const onConfirm = vi.fn(() => confirm.promise);
    const onClose = vi.fn();
    dialogs.api.openDialog({ ...createDialog("A", onConfirm), onClose });
    // Both clicks use the same render, the pending flag is not visible yet.
    const renderer = dialogs.renderer();

    renderer?.confirm();
    renderer?.confirm();
    renderer?.close();
    dialogs.renderer()?.close();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(dialogs.labels()).toEqual(["A"]);
  });

  test("Rejected confirm closes the dialog.", async () => {
    const dialogs = createDialogs();
    const confirm = deferred();
    dialogs.api.openDialog(createDialog("A", () => confirm.promise));

    dialogs.renderer()?.confirm();
    confirm.reject(new Error("Failed"));
    await confirm.promise.catch(() => { });
    await Promise.resolve();
    await Promise.resolve();

    expect(dialogs.labels()).toEqual([]);
  });

  test("Synchronous failure keeps the dialog open and it can be closed.", () => {
    const dialogs = createDialogs();
    dialogs.api.openDialog(createDialog("A", () => {
      throw new Error("Failed");
    }));

    expect(() => dialogs.renderer()?.confirm()).toThrow("Failed");
    expect(dialogs.labels()).toEqual(["A"]);
    dialogs.renderer()?.close();
    expect(dialogs.labels()).toEqual([]);
  });

  test("Asynchronous confirm closes its own dialog, not the one on top.", async () => {
    const dialogs = createDialogs();
    const confirm = deferred();
    dialogs.api.openDialog(createDialog("A", () => confirm.promise));
    dialogs.renderer()?.confirm();

    dialogs.api.openDialog(createDialog("B", null));
    confirm.resolve();
    await confirm.promise;
    await Promise.resolve();

    expect(dialogs.labels()).toEqual(["B"]);
  });

  test("State change keeps the dialog below.", () => {
    const dialogs = createDialogs();
    dialogs.api.openDialog(createDialog("A", null));
    dialogs.api.openDialog(createDialog("B", null));
    const renderer = dialogs.renderer();

    renderer?.changeState({ value: "B1" });
    renderer?.changeState(previous => ({ value: previous.value + "2" }));

    expect(dialogs.labels()).toEqual(["A", "B"]);
    expect(dialogs.renderer()?.state).toEqual({ value: "B12" });
  });

});

interface TestState {
  value: string;
}

/**
 * Dialog service with React state replaced by a plain variable.
 * Every call of renderer() is like a new render.
 */
function createDialogs() {
  let state = createInitialDialogContextStateType();
  const setState = (next: typeof state | ((previous: typeof state) => typeof state)) => {
    state = typeof next === "function" ? next(state) : next;
  };
  return {
    api: createDialogApiContext(setState),
    renderer: () => createDialogRendererContext<TestState>(state, setState),
    labels: () => state.dialogs.map(item => item.label),
  };
}

function createDialog(
  label: string,
  onConfirm: DialogWrapper<TestState>["onConfirm"],
): DialogWrapper<TestState> {
  return {
    label,
    component: () => null,
    state: { value: label },
    confirmLabel: "confirm",
    cancelLabel: "cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };
}

function deferred() {
  let resolve: () => void = () => { };
  let reject: (error: Error) => void = () => { };
  const promise = new Promise<void>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}
