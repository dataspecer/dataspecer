
import { Checkbox, Input, Label, Tab, Tabs } from "../../components";
import { type DialogProps, type DialogWrapper } from "../../dialog-api";
import { t } from "../../../application";

import {
  type CreateModelState,
  type PredefinedModel,
  TabType,
  createCreateModelState,
  useCreateModelController,
} from "./create-semantic-model-dialog-controller";

export const createAddModelDialog = (
  onConfirm: (state: CreateModelState) => void | null,
): DialogWrapper<CreateModelState> => {
  return {
    label: "add-model-dialog.label",
    component: CreateModelDialog,
    state: createCreateModelState(),
    confirmLabel: "add-model-dialog.btn-ok",
    cancelLabel: "add-model-dialog.btn-cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };
};

const CreateModelDialog = (props: DialogProps<CreateModelState>) => {
  const state = props.state;
  const controller = useCreateModelController(props);

  return (
    <>
      <TabHeader activeTab={state.activeTab} setActiveTab={controller.setActiveTab} />
      <div className={getTabContentStyle(state.activeTab === TabType.AddFromUrl)}>
        {renderAddModelByUrl({
          url: state.modelUrl,
          setUrl: controller.setModelUrl,
          alias: state.modelAlias,
          setAlias: controller.setModelAlias,
        })}
      </div>
      <div className={getTabContentStyle(state.activeTab === TabType.AddPredefined)}>
        {renderAddModelFromPredefined({
          predefinedModels: state.predefinedModels,
          activeSelection: state.selectedModels,
          toggleSelection: controller.toggleSelection,
        })}
      </div>
      <div className={getTabContentStyle(state.activeTab === TabType.CreateLocal)}>
        {renderAddLocalModel({
          alias: state.modelAlias,
          setAlias: controller.setModelAlias,
        })}
      </div>
    </>
  );
};

function TabHeader(props: {
  activeTab: TabType,
  setActiveTab: (next: TabType) => void,
}) {
  return (
    <Tabs>
      <Tab
        active={props.activeTab === TabType.AddFromUrl}
        onClick={() => props.setActiveTab(TabType.AddFromUrl)}
      >
        {t("add-model-dialog.tab-from-url")}
      </Tab>
      <Tab
        active={props.activeTab === TabType.AddPredefined}
        onClick={() => props.setActiveTab(TabType.AddPredefined)}
      >
        {t("add-model-dialog.tab-predefined")}
      </Tab>
      <Tab
        active={props.activeTab === TabType.CreateLocal}
        onClick={() => props.setActiveTab(TabType.CreateLocal)}
      >
        {t("add-model-dialog.tab-create")}
      </Tab>
    </Tabs>
  );
}

function getTabContentStyle(active: boolean): string {
  const base = "p-4 ";
  return base + (active ? "" : "hidden");
}

function renderAddModelByUrl(props: {
  url: string,
  setUrl: (next: string) => void,
  alias: string,
  setAlias: (next: string) => void,
}) {
  return (
    <>
      <Label html-for="model-url">{t("add-model-dialog.url-label")}</Label>
      <Input
        id="model-url"
        type="url"
        pattern="https://.*"
        placeholder={t("add-model-dialog.url-placeholder")}
        value={props.url}
        onChange={(event) => props.setUrl(event.target.value.trim())}
        required
        autoFocus
      />
      <Label html-for="model-alias">{t("add-model-dialog.alias-label")}</Label>
      <Input
        id="model-alias"
        type="text"
        placeholder={t("add-model-dialog.alias-placeholder")}
        value={props.alias}
        onChange={(event) => props.setAlias(event.target.value)}
        required
      />
      <br />
      <p className="italic">
        {t("add-model-dialog.url-size-warning")}
      </p>
    </>
  );
}

function renderAddModelFromPredefined(props: {
  predefinedModels: PredefinedModel[],
  activeSelection: PredefinedModel[],
  toggleSelection: (value: PredefinedModel) => void,
}) {
  return (
    <>
      <p>
        {t("add-model-dialog.tab-predefined.introduction")}
      </p>
      <br />
      <ul>
        {props.predefinedModels.map((item) => (
          <li key={item.identifier} className="flex gap-1 items-center my-2" >
            <Checkbox
              id={item.identifier + "-checkbox"}
              checked={props.activeSelection.includes(item)}
              onChange={() => props.toggleSelection(item)}
            />
            <label
              htmlFor={item.identifier + "-checkbox"}
            >
              {item.label}
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

function renderAddLocalModel(props: {
  alias: string,
  setAlias: (next: string) => void,
}) {
  return (
    <>
      <p>
        {t("add-model-dialog.tab-create.introduction")}
      </p>
      <br />
      <Label html-for="local-alias">{t("add-model-dialog.alias-label")}</Label>
      <Input
        id="local-alias"
        type="text"
        placeholder={t("add-model-dialog.alias-placeholder")}
        value={props.alias}
        onChange={(event) => props.setAlias(event.target.value)}
        required
      />
    </>
  );
}
