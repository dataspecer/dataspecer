import { useState } from "react";
import { ClassCatalog } from "./class-catalog";
import { ModelCatalog } from "./model-catalog";
import { AttributeCatalog } from "./attribute-catalog";
import { RelationshipCatalog } from "./relationship-catalog";
import { ProfileCatalog } from "./profile-catalog";
import { t } from "../application";

enum CatalogTabs {
    Models,
    Classes,
    Associations,
    Attributes,
    Profiles,
}

export const Catalog = () => {
  const [activeTab, setActiveTab] = useState(CatalogTabs.Models);

  const Content = selectTabConcent(activeTab);

  return (
    <div className="border-r-2 border-gray-300 flex flex-col h-full">
      <div className="flex flex-row [&>*]:mx-2 flex-wrap py-1 border-b-2 border-gray-300">
        <CatalogTabButton
          active={activeTab === CatalogTabs.Models}
          onClick={() => setActiveTab(CatalogTabs.Models)}
          label={t("model.vocabularies")}
        />
        <CatalogTabButton
          active={activeTab === CatalogTabs.Classes}
          onClick={() => setActiveTab(CatalogTabs.Classes)}
          label={t("model.classes")}
        />
        <CatalogTabButton
          active={activeTab === CatalogTabs.Associations}
          onClick={() => setActiveTab(CatalogTabs.Associations)}
          label={t("model.relationship")}
        />
        <CatalogTabButton
          active={activeTab === CatalogTabs.Attributes}
          onClick={() => setActiveTab(CatalogTabs.Attributes)}
          label={t("model.attributes")}
        />
        <CatalogTabButton
          active={activeTab === CatalogTabs.Profiles}
          onClick={() => setActiveTab(CatalogTabs.Profiles)}
          label={t("model.profiles")}
        />
      </div>
      <div className="m-1 overflow-y-scroll pb-2 h-full">
        <Content />
      </div>
    </div>
  );
};

const CatalogTabButton = (props: {
    label: string,
    active: boolean,
    onClick: () => void,
    hidden?: boolean,
}) => {
  if (props.hidden === true) {
    return null;
  }
  return (
    <button
      disabled={props.active}
      onClick={props.onClick}
      className={props.active ? "font-bold" : ""}
    >
      {props.label}
    </button>
  );
};

const selectTabConcent = (active: CatalogTabs) => {
  switch (active) {
  case CatalogTabs.Models:
    return ModelCatalog;
  case CatalogTabs.Associations:
    return RelationshipCatalog;
  case CatalogTabs.Attributes:
    return AttributeCatalog;
  case CatalogTabs.Classes:
    return ClassCatalog;
  case CatalogTabs.Profiles:
    return ProfileCatalog;
  }
};
