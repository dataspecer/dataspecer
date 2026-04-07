import React, { JSX, useCallback, useMemo, useState } from "react";
import { List, AutoSizer } from "react-virtualized";

import {
  isSemanticClass,
  isSemanticGeneralization,
  isSemanticRelationship,
} from "@dataspecer/semantic-model";
import {
  isProfileClass,
  isProfileRelationship,
} from "@dataspecer/profile-model";
import {
  isComplexType,
  isPrimitiveType,
} from "@dataspecer/core-v2/semantic-model/datatypes";
import {
  Entity,
  EntityIdentifier,
  ModelIdentifier,
} from "@dataspecer/entity-model";

import { t } from "../application";
import { useModelGraphContext } from "../context/model-context";
import { useOptions } from "../configuration";
import {
  CatalogEntity,
  CatalogTracker,
  getEntityLabel,
} from "./catalog-tracker";
import {
  useDependencyTrackers,
  SemanticModelEntry,
} from "../dependency-tracker/";
import { selectDomainAndRange } from "../dataspecer/semantic-model";
import { useActions } from "../action/actions-react-binding";
import * as Actions from "./catalog-action";

export const Catalog = () => {

  const actions = useActions();
  const { language } = useOptions();

  // Binding to global context.
  const modelGraphContext = useModelGraphContext();
  const visualModel = modelGraphContext.aggregatorView
    .getActiveVisualModel()?.getIdentifier() ?? null;

  // Catalog state.
  const [state, setState] = useState<CatalogState>(createCatalogState());
  const controller = useMemo(() => {
    return {
      onActivateView(view: CatalogView) {
        setState(previous => {
          const index = previous.views.indexOf(view);
          return {
            ...previous,
            activeViewIndex: index,
          };
        });
      },
      onChangeSearch(value) {
        setState(previous => ({
          ...previous,
          views: previous.views.map(view => updateVisibleItems(view, value)),
          searchText: value,
        }));
      },
      onHandleClick(
        action: string,
        model: string | null,
        identifier: string | null,
      ) {
        // Actions without model or identifier.
        switch (action) {
          case Actions.MODEL_CREATE:
            actions.openCreateModelDialog();
            return;
        }
        // Actions with model.
        if (model === null) {
          return;
        }
        switch (action) {
          case Actions.MODEL_SHOW:
            actions.addEntitiesFromSemanticModelToVisualModel(model);
            return;
          case Actions.MODEL_HIDE:
            actions.removeEntitiesInSemanticModelFromVisualModel(model);
            return;
          case Actions.MODEL_EDIT:
            actions.openEditSemanticModelDialog(model);
            return;
          case Actions.MODEL_DELETE:
            actions.deleteSemanticModel(model);
            return;
          case Actions.MODEL_FOLD:
            setState(previous => setModelFolded(previous, true, model));
            return;
          case Actions.MODEL_UNFOLD:
            setState(previous => setModelFolded(previous, false, model));
            return;
          case Actions.MODEL_EXPAND:
            actions.openSearchExternalSemanticModelDialog(model);
            return;
          case Actions.PROFILE_MODEL:
            actions.openProfileModelDialog(model);
            return;
          case Actions.MODEL_CREATE_CLASS:
            actions.openCreateClassDialog(model);
            return;
          case Actions.MODEL_CREATE_ASSOCIATION:
            actions.openCreateAssociationDialog(model);
            return;
          case Actions.MODEL_CREATE_ATTRIBUTE:
            actions.openCreateAttributeDialogForModel(model);
            return;
        }
        // Actions with model and identifier.
        if (identifier === null) {
          return;
        }
        switch (action) {
          //
          // CLASS
          case Actions.CLASS_DELETE:
            actions.deleteFromSemanticModels([{ identifier, sourceModel: model }]);
            return;
          case Actions.CLASS_DETAIL:
            actions.openDetailDialog(identifier);
            return;
          case Actions.CLASS_EDIT:
            actions.openModifyDialog(identifier);
            return;
          case Actions.CLASS_FOCUS:
            actions.centerViewportToVisualEntityByRepresented(model, identifier, 0);
            return;
          case Actions.CLASS_NEIGHBORHOOD:
            actions.addEntityNeighborhoodToVisualModel(identifier);
            return;
          case Actions.CLASS_PROFILE:
            actions.openCreateProfileDialog(identifier);
            return;
          case Actions.CLASS_SHOW:
            actions.addClassToVisualModel(model, identifier, null);
            return;
          case Actions.CLASS_HIDE:
            actions.removeFromVisualModelByRepresented([identifier]);
            return;
          // CLASS PROFILE
          case Actions.CLASS_ADD_SURROUNDINGS:
            actions.addSemanticClassSurroundings(model, identifier);
            return;
          case Actions.CLASS_RELEASE_SURROUNDINGS:
            actions.releaseSemanticClassSurroundings(model, identifier);
            return;
          case Actions.CLASS_PROFILE_DELETE:
            actions.deleteFromSemanticModels([{ identifier, sourceModel: model }]);
            return;
          case Actions.CLASS_PROFILE_DETAIL:
            actions.openDetailDialog(identifier);
            return;
          case Actions.CLASS_PROFILE_EDIT:
            actions.openModifyDialog(identifier);
            return;
          case Actions.CLASS_PROFILE_FOCUS:
            actions.centerViewportToVisualEntityByRepresented(model, identifier, 0);
            return;
          case Actions.CLASS_PROFILE_NEIGHBORHOOD:
            actions.addEntityNeighborhoodToVisualModel(identifier);
            return;
          case Actions.CLASS_PROFILE_PROFILE:
            actions.openCreateProfileDialog(identifier);
            return;
          case Actions.CLASS_PROFILE_HIDE:
            actions.removeFromVisualModelByRepresented([identifier]);
            return;
          case Actions.CLASS_PROFILE_SHOW:
            actions.addClassProfileToVisualModel(model, identifier, null);
            return;
          // RELATIONSHIP
          case Actions.RELATIONSHIP_DELETE:
            actions.deleteFromSemanticModels([{ identifier, sourceModel: model }]);
            return;
          case Actions.RELATIONSHIP_DETAIL:
            actions.openDetailDialog(identifier);
            return;
          case Actions.RELATIONSHIP_EDIT:
            actions.openModifyDialog(identifier);
            return;
          case Actions.RELATIONSHIP_FOCUS:
            actions.centerViewportToVisualEntityByRepresented(model, identifier, 0);
            return;
          case Actions.RELATIONSHIP_NEIGHBORHOOD:
            actions.addEntityNeighborhoodToVisualModel(identifier);
            return;
          case Actions.RELATIONSHIP_PROFILE:
            actions.openCreateProfileDialog(identifier);
            return;
          case Actions.RELATIONSHIP_HIDE:
            actions.addRelationToVisualModel(model, identifier);
            return;
          case Actions.RELATIONSHIP_SHOW:
            actions.removeFromVisualModelByRepresented([identifier]);
            return;
          // RELATIONSHIP PROFILE
          case Actions.RELATIONSHIP_PROFILE_DELETE:
            actions.deleteFromSemanticModels([{ identifier, sourceModel: model }]);
            return;
          case Actions.RELATIONSHIP_PROFILE_DETAIL:
            actions.openDetailDialog(identifier);
            return;
          case Actions.RELATIONSHIP_PROFILE_EDIT:
            actions.openModifyDialog(identifier);
            return;
          case Actions.RELATIONSHIP_PROFILE_FOCUS:
            actions.centerViewportToVisualEntityByRepresented(model, identifier, 0);
            return;
          case Actions.RELATIONSHIP_PROFILE_NEIGHBORHOOD:
            actions.addEntityNeighborhoodToVisualModel(identifier);
            return;
          case Actions.RELATIONSHIP_PROFILE_PROFILE:
            actions.openCreateProfileDialog(identifier);
            return;
          case Actions.RELATIONSHIP_PROFILE_HIDE:
            actions.addRelationProfileToVisualModel(model, identifier);
            return;
          case Actions.RELATIONSHIP_PROFILE_SHOW:
            actions.removeFromVisualModelByRepresented([identifier]);
            return;
          // GENERALIZATION
          case Actions.GENERALIZATION_DELETE:
            actions.deleteFromSemanticModels([{ identifier, sourceModel: model }]);
            return;
          case Actions.GENERALIZATION_DETAIL:
            actions.openDetailDialog(identifier);
            return;
          case Actions.GENERALIZATION_HIDE:
            actions.removeFromVisualModelByRepresented([identifier]);
            return;
          case Actions.GENERALIZATION_SHOW:
            actions.addGeneralizationToVisualModel(model, identifier);
            return;
        }
      },
      onFoldAll() {
        setState(previous => setModelFolded(previous, true));
      },
      onUnfoldAll() {
        setState(previous => setModelFolded(previous, false));
      },
      onClearSearch() {
        setState(previous => ({
          ...previous,
          views: previous.views.map(view => updateVisibleItems(view, "")),
          searchText: ""
        }));
      },
    } satisfies CatalogController;
  }, [setState, actions]);

  const onClick = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const element = event.target as any;
    const parent = (element as any).parentElement;
    if (parent === undefined) {
      return;
    }
    const action = element.dataset?.action;
    const model = parent.dataset?.model ?? null;
    const identifier = parent.dataset?.identifier ?? null;
    controller.onHandleClick(action, model, identifier);
  }, [controller]);

  // Computation of derived state.
  const trackers = useMemo(() => {
    const onTrackerDidChanged = (tracker: CatalogTracker) => {
      // TODO This cause full reload instead of fine grained update.
      setState(previous => ({
        ...previous,
        views: previous.views
          .map(view => view.createView([language], visualModel, tracker, view))
          .map(view => updateVisibleItems(view, previous.searchText)),
      }));
    };
    return [new CatalogTracker(onTrackerDidChanged)];
  }, [setState, language, visualModel]);

  useDependencyTrackers(trackers)

  // Catalog row item rendered.
  const rendered = useCallback(
    (props: any) => rowRenderer(
      props, state.views[state.activeViewIndex]),
    [state.views, state.activeViewIndex]);

  const itemsCount = state.views[state.activeViewIndex].visibleItems.length;
  return (
    <div className="flex flex-col h-full">
      <CatalogTabHeader state={state} controller={controller} />
      <CatalogSearchBar state={state} controller={controller} />
      <div className="h-full mx-2" onClick={onClick}>
        <AutoSizer>
          {({ width, height }) => (
            <List
              height={height}
              rowCount={itemsCount}
              rowHeight={24}
              rowRenderer={rendered}
              width={width}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

function setModelFolded(
  previous: CatalogState,
  folded: boolean,
  modelFilter?: ModelIdentifier,
): CatalogState {

  const foldModelSection = (item: CatalogItem): CatalogItem => {
    if (item.type !== CatalogEntityType.ModelSection) {
      return item;
    }
    if (modelFilter !== undefined && item.model !== modelFilter) {
      return item;
    }
    const typed = item as CatalogModelSectionItem;
    return {
      ...typed,
      folded,
    } as CatalogModelSectionItem;
  }

  return {
    ...previous,
    views: previous.views.map(view => ({
      ...view,
      allItems: view.allItems.map(foldModelSection)
    })).map(view => updateVisibleItems(view, previous.searchText)),
  };
}

function CatalogTabHeader({ state, controller }: {
  controller: CatalogController,
  state: CatalogState,
}) {
  return (
    <div className="flex flex-row flex-wrap py-1 border-b-2 border-gray-300">
      {state.views.map((item, index) => (
        <CatalogTabButton
          key={index}
          active={index === state.activeViewIndex}
          onClick={() => controller.onActivateView(item)}
          label={t(item.label)}
        />
      ))}
    </div>
  )
} []

function CatalogTabButton(props: {
  label: string,
  active: boolean,
  onClick: () => void,
}) {
  const className = "hover:bg-slate-200 px-2 catalog-view-button";
  return (
    <button
      disabled={props.active}
      onClick={props.onClick}
      className={className + (props.active ? " font-bold" : "")}
    >
      {props.label}
    </button>
  );
};

function CatalogSearchBar({ state, controller }: {
  controller: CatalogController,
  state: CatalogState,
}) {
  return (
    <div className="flex flex-wrap p-2 gap-2">
      <input
        className="grow min-w-10" type="text"
        value={state.searchText}
        onChange={event => {
          // isUserInputRef.current = true;
          controller.onChangeSearch(event.target.value);
        }}
        title={t("catalog.search-title")}
      />
      <button
        className="border px-2 hover:bg-slate-200"
        onClick={controller.onClearSearch}
      >
        {t("catalog.clear")}
      </button>
      <button
        className="border px-2 hover:bg-slate-200"
        title={t("catalog.collapse-all")}
        aria-label={t("catalog.collapse-all")}
        onClick={() => controller.onFoldAll()}
      >
        🔼
      </button>
      <button
        className="border px-2 hover:bg-slate-200"
        title={t("catalog.expand-all")}
        aria-label={t("catalog.expand-all")}
        onClick={() => controller.onUnfoldAll()}
      >
        🔽
      </button>
    </div>
  )
}

//
// STATE
//

interface CatalogController {

  onActivateView: (value: CatalogView) => void;

  onHandleClick: (
    action: string,
    model: string | null,
    identifier: string | null,
  ) => void;

  onFoldAll: () => void;

  onUnfoldAll: () => void;

  onChangeSearch: (value: string) => void;

  onClearSearch: () => void;

}

interface CatalogState {

  activeViewIndex: number;

  views: CatalogView[];

  searchText: string;

}

interface CatalogView {

  /**
   * View label.
   */
  label: string;

  /**
   * All items in the view.
   */
  allItems: CatalogItem[];

  /**
   * Visible items for filtering.
   */
  visibleItems: CatalogItem[];

  /**
   * Create new version of this view.
   */
  createView: (
    languages: string[],
    visualModel: string | null,
    tracker: CatalogTracker,
    previous: CatalogView,
  ) => CatalogView;

}

function createCatalogState(): CatalogState {
  return {
    activeViewIndex: 0,
    views: [{
      label: "model.vocabularies",
      allItems: [],
      visibleItems: [],
      createView: createModelView,
    }, {
      label: "model.classes",
      allItems: [],
      visibleItems: [],
      createView: createClassView,
    }, {
      label: "model.relationship",
      allItems: [],
      visibleItems: [],
      createView: createAssociationView,
    }, {
      label: "model.attributes",
      allItems: [],
      visibleItems: [],
      createView: createAttributeView,
    }, {
      label: "model.profiles",
      allItems: [],
      visibleItems: [],
      createView: createProfileView,
    }, {
      label: "model.generalizations",
      allItems: [],
      visibleItems: [],
      createView: createGeneralizationView,
    }],
    searchText: "",
  }
}

interface CatalogItem {

  type: CatalogEntityType;

  level: number;

  model: ModelIdentifier;

  label: string;

  /**
   * When null no color is set.
   */
  backgroundColor: string | null;

  sortText: string;

  /**
   * Use null when this item can not be filtered out.
   */
  filterText: string | undefined;

  /**
   * Function to render an element.
   */
  renderItem: (item: CatalogItem) => JSX.Element;

}

interface CatalogModelSectionItem extends CatalogItem {

  type: CatalogEntityType.ModelSection;

  /**
   * True when the section is folded.
   * When folded the content should not be rendered.
   */
  folded: boolean;

  /**
   * Define add-action for the section.
   * When null there is no such action.
   */
  addAction: SectionAddAction | null;

}

interface SectionAddAction {

  /**
   * Label for translation.
   */
  title: string;

  action: string;

}

interface CatalogEntityItem extends CatalogItem {

  /**
   * Entity identifier.
   */
  identifier: string;

  /**
   * True when the entity can be expanded.
   */
  isExpandable: boolean | undefined;

  /**
   * Is from read only model.
   */
  isReadOnly: boolean | undefined;

  /**
   * True when a visual entity can be added to visual model.
   * In other words, true when user can "show" this item.
   */
  canBeVisible: boolean;

  /**
   * True when there is an visual entity representing this item.
   */
  hasVisualEntity: boolean;

}

export enum CatalogEntityType {
  Model = "model",
  ModelSection = "model-section",
  CreateModel = "create-model",
  Class = "class",
  ClassProfile = "class-profile",
  Relationship = "relationship",
  RelationshipProfile = "relationship-profile",
  Generalization = "generalization",
}

function updateVisibleItems(
  view: CatalogView, searchText: string,
): CatalogView {
  const { allItems } = view;
  const normalizedSearch = searchText.trim().toLowerCase();

  // Pre-compute which items are hidden due to a folded ancestor section.
  const foldedHidden = new Set<number>();
  let foldedAtLevel: number | null = null;
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    // If we're inside a folded section, check if we've exited it.
    if (foldedAtLevel !== null) {
      if (item.level <= foldedAtLevel) {
        // Exited the folded section's children.
        foldedAtLevel = null;
      } else {
        foldedHidden.add(i);
        continue;
      }
    }
    // Check if this item is a folded section, hiding everything beneath it.
    if (item.type === CatalogEntityType.ModelSection) {
      const sectionItem = item as CatalogModelSectionItem;
      if (sectionItem.folded) {
        foldedAtLevel = item.level;
      }
    }
  }

  // If no search text, all items are visible.
  if (normalizedSearch === "") {
    const visibleItems = allItems.filter((_, index) => !foldedHidden.has(index));
    return { ...view, visibleItems };
  }

  // We collect indices of items to be visible.
  const visibleIndices = new Set<number>();
  for (let index = 0; index < allItems.length; index++) {
    // Skip items hidden by a folded section — they can never be visible.
    if (foldedHidden.has(index)) {
      continue;
    }
    //
    const item = allItems[index];
    const visible = item.filterText === undefined ||
      item.filterText.includes(normalizedSearch);
    if (visible === false) {
      continue;
    }
    visibleIndices.add(index);
    // Walk backwards to find and include all ancestors.
    let currentLevel = item.level;
    for (let j = index - 1; j >= 0 && currentLevel > 0; j--) {
      if (allItems[j].level < currentLevel) {
        visibleIndices.add(j);
        currentLevel = allItems[j].level;
      }
    }
  }

  // Select items based on index.
  const visibleItems = allItems.filter((_, index) => visibleIndices.has(index));
  return { ...view, visibleItems };
}

//
// VIEWS
//

const CLASS_TYPES = [{
  guard: isSemanticClass,
  factory: asSemanticClass,
}, {
  guard: isProfileClass,
  factory: asSemanticClassProfile,
}];

const RELATIONSHIP_TYPES = [{
  guard: isSemanticRelationship,
  factory: asSemanticRelationship,
}, {
  guard: isProfileRelationship,
  factory: asSemanticRelationshipProfile,
}];

function createModelView(
  _languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  previous: CatalogView,
): CatalogView {

  const items: CatalogItem[] = [];
  for (const model of tracker.semanticModels.values()) {
    items.push(asModel(visualModel, tracker, model));
  }
  return {
    ...previous,
    allItems: [
      ...sortCatalogItems(items),
      asCreateModel()
    ],
  }
}

function createClassView(
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  previous: CatalogView,
): CatalogView {
  const items: CatalogItem[] = [];
  const entities = [...tracker.entities.values()];
  for (const model of tracker.semanticModels.values()) {
    // The add-action depends on model type.
    if (model.isExternal) {
      items.push(asModelSection(visualModel, tracker, model, {
        action: Actions.MODEL_EXPAND,
        title: "catalog.model.extend-external",
      }));
    } else {
      items.push(asModelSection(visualModel, tracker, model, {
        action: Actions.MODEL_CREATE_CLASS,
        title: "catalog.model.create-class",
      }));
    }

    for (const entity of entities) {
      if (entity.model !== model.model) {
        continue;
      }
      if (!isSemanticClass(entity.entity)) {
        continue;
      }
      items.push(asSemanticClass(
        languages, visualModel, tracker, entity, 1));
      items.push(...createEntityTree(
        CLASS_TYPES, collectProfilesAndGeneralizations,
        languages, visualModel, tracker, entity, 2));
    }
  }
  return {
    ...previous,
    allItems: sortCatalogItems(items),
  };
}

function createAssociationView(
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  previous: CatalogView,
): CatalogView {
  const items: CatalogItem[] = [];
  const entities = [...tracker.entities.values()];
  for (const model of tracker.semanticModels.values()) {
    items.push(asModelSection(visualModel, tracker, model, {
      action: Actions.MODEL_CREATE_ASSOCIATION,
      title: "catalog.model.create-association",
    }));
    for (const entity of entities) {
      if (entity.model !== model.model) {
        continue;
      }
      if (!isSemanticRelationship(entity.entity)) {
        continue;
      }
      const [_, range] = selectDomainAndRange(entity.entity.ends);
      if (range.concept === null || !isComplexType(range.concept)) {
        continue;
      }
      items.push(asSemanticRelationship(
        languages, visualModel, tracker, entity, 1));
      items.push(...createEntityTree(
        RELATIONSHIP_TYPES, collectProfilesAndGeneralizations,
        languages, visualModel, tracker, entity, 2));
    }
  }
  return {
    ...previous,
    allItems: sortCatalogItems(items),
  };
}

function createAttributeView(
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  previous: CatalogView,
): CatalogView {
  const items: CatalogItem[] = [];
  const entities = [...tracker.entities.values()];
  for (const model of tracker.semanticModels.values()) {
    items.push(asModelSection(visualModel, tracker, model, {
      action: Actions.MODEL_CREATE_ATTRIBUTE,
      title: "catalog.model.create-attribute",
    }));

    for (const entity of entities) {
      if (entity.model !== model.model) {
        continue;
      }
      if (!isSemanticRelationship(entity.entity)) {
        continue;
      }
      const [_, range] = selectDomainAndRange(entity.entity.ends);
      if (range.concept === null || !isPrimitiveType(range.concept)) {
        continue;
      }
      items.push(asSemanticRelationship(
        languages, visualModel, tracker, entity, 1));
      items.push(...createEntityTree(
        RELATIONSHIP_TYPES, collectProfilesAndGeneralizations,
        languages, visualModel, tracker, entity, 2));
    }
  }
  return {
    ...previous,
    allItems: sortCatalogItems(items),
  };
}

function createProfileView(
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  previous: CatalogView,
): CatalogView {
  const items: CatalogItem[] = [];
  const entities = [...tracker.entities.values()];
  for (const model of tracker.semanticModels.values()) {
    items.push(asModelSection(visualModel, tracker, model, null));
    for (const entity of entities) {
      if (entity.model !== model.model) {
        continue;
      }
      if (isProfileClass(entity.entity)) {
        items.push(asSemanticClassProfile(
          languages, visualModel, tracker, entity, 1));
        items.push(...createEntityTree(
          CLASS_TYPES, collectProfiles,
          languages, visualModel, tracker, entity, 2));
      }
      if (isProfileRelationship(entity.entity)) {
        items.push(asSemanticRelationshipProfile(
          languages, visualModel, tracker, entity, 1));
        items.push(...createEntityTree(
          RELATIONSHIP_TYPES, collectProfiles,
          languages, visualModel, tracker, entity, 2));
      }
    }
  }
  return {
    ...previous,
    allItems: sortCatalogItems(items),
  };
}

function collectProfiles(entity: CatalogEntity) {
  return [
    ...entity.profiledBy,
  ];
}

function createGeneralizationView(
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  previous: CatalogView,
): CatalogView {
  const items: CatalogItem[] = [];
  const entities = [...tracker.entities.values()];
  for (const model of tracker.semanticModels.values()) {
    items.push(asModelSection(visualModel, tracker, model, null));
    for (const entity of entities) {
      if (entity.model !== model.model) {
        continue;
      }
      if (!isSemanticGeneralization(entity.entity)) {
        continue;
      }
      items.push(asSemanticGeneralization(
        languages, visualModel, tracker, entity, 1));
    }
  }
  return {
    ...previous,
    allItems: sortCatalogItems(items),
  };
}

//
// RENDER
//

function asModel(
  visualModel: string | null,
  tracker: CatalogTracker,
  entity: SemanticModelEntry,
): CatalogItem {
  const label = entity.label[""] ?? entity.model;
  return {
    level: 0,
    model: entity.model,
    type: CatalogEntityType.Model,
    label: label,
    sortText: label,
    backgroundColor: tracker.getModelColor(
      entity.model, visualModel),
    filterText: label.toLocaleLowerCase(),
    renderItem: renderModel,
  }
}

function renderModel(item: CatalogItem) {
  return (
    <div className="relative">
      <div className="whitespace-nowrap">
        Ⓜ
        {item.label}
      </div>
      <div
        className="absolute top-0 right-0"
        data-model={item.model}
      >
        <Button
          action={Actions.MODEL_SHOW}
          title="catalog.model.show"
        >
          👁
        </Button>
        <Button
          action={Actions.MODEL_HIDE}
          title="catalog.model.hide"
        >
          🕶️
        </Button>
        <Button
          action={Actions.MODEL_EDIT}
          title="catalog.model.edit"
        >
          ✏
        </Button>
        <Button
          action={Actions.PROFILE_MODEL}
          title="catalog.model.profile"
        >
          🧲
        </Button>
        <Button
          action={Actions.MODEL_DELETE}
          title="catalog.model.delete"
        >
          🗑️
        </Button>
      </div>
    </div>
  )
}

function asCreateModel(): CatalogItem {
  return {
    level: 0,
    model: "create-model",
    type: CatalogEntityType.CreateModel,
    backgroundColor: null,
    label: "",
    sortText: "",
    filterText: undefined,
    renderItem: renderCreateModel,
  }
}

function renderCreateModel() {
  return (
    <div className="flex flex-row justify-end">
      <button
        className="hover:bg-slate-200"
        data-action={Actions.MODEL_CREATE}
      >
        ➕
      </button>
    </div>
  )
}

function asModelSection(
  visualModel: string | null,
  tracker: CatalogTracker,
  entity: SemanticModelEntry,
  addAction: SectionAddAction | null,
): CatalogModelSectionItem {
  const label = entity.label[""] ?? entity.model;
  return {
    level: 0,
    model: entity.model,
    type: CatalogEntityType.ModelSection,
    label: label,
    sortText: label,
    backgroundColor: tracker.getModelColor(
      entity.model, visualModel),
    filterText: label.toLocaleLowerCase(),
    renderItem: renderModelSection,
    folded: false,
    addAction,
  }
}

function renderModelSection(item: CatalogItem) {
  const typed = item as CatalogModelSectionItem;
  return (
    <div className="relative">
      <div className="whitespace-nowrap">
        Ⓜ
        {item.label}
      </div>
      <div
        className="absolute top-0 right-0"
        data-model={item.model}
      >
        {typed.addAction === null ? null :
          <Button
            action={typed.addAction.action}
            title={typed.addAction.title}
          >
            ➕
          </Button>}
        <Button
          action={Actions.MODEL_EDIT}
          title="catalog.model.edit"
        >
          ✏
        </Button>
        <Button
          action={typed.folded ? Actions.MODEL_UNFOLD : Actions.MODEL_FOLD}
          title="catalog.model.toggle"
        >
          {typed.folded ? "🔽" : "🔼"}
        </Button>
      </div>
    </div>
  )
}

function collectProfilesAndGeneralizations(entity: CatalogEntity) {
  return [
    ...entity.profiledBy,
    ...entity.generalizationOf,
  ];
}

function asSemanticClass(
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  catalogEntity: CatalogEntity,
  level: number,
): CatalogEntityItem {
  const label = getEntityLabel(languages, catalogEntity);
  const model = tracker.semanticModels.get(catalogEntity.model);
  return {
    level,
    model: catalogEntity.model,
    type: CatalogEntityType.Class,
    label: label,
    sortText: label,
    backgroundColor: tracker.getModelColor(
      catalogEntity.model, visualModel),
    filterText: label.toLocaleLowerCase(),
    renderItem: renderSemanticClass,
    //
    identifier: catalogEntity.identifier,
    isExpandable: false,
    isReadOnly: model?.isReadOnly,
    canBeVisible: true,
    hasVisualEntity: tracker.hasVisualEntity(catalogEntity, visualModel),
  }
}

function renderSemanticClass(item: CatalogItem) {
  const level = item.level - 1;
  const typed = item as CatalogEntityItem;
  const visible = typed.hasVisualEntity;
  return (
    <div className="relative">
      <div className="whitespace-nowrap">
        📑
        {"\u00A0".repeat(level * 2)}
        {level > 0 ? "└ " : ""}
        {item.label}
      </div>
      <div
        className="absolute top-0 right-0"
        data-identifier={typed.identifier}
        data-model={item.model}
      >
        {typed.isExpandable ? (
          <Button
            action={Actions.CLASS_ADD_SURROUNDINGS}
            title="catalog.class.add-surroundings"
          >
            ➕
          </Button>
        ) : null}
        {typed.isExpandable ? (
          <Button
            action={Actions.CLASS_RELEASE_SURROUNDINGS}
            title="catalog.class.release-surroundings"
          >
            ❌
          </Button>
        ) : null}
        {visible ?
          <Button
            action={Actions.CLASS_FOCUS}
            title="catalog.class.focus"
          >
            🎯
          </Button> : null}
        <Button
          action={Actions.CLASS_DELETE}
          title="catalog.class.delete"
          hidden={typed.isReadOnly}
        >
          🗑️
        </Button>
        <Button
          action={Actions.CLASS_EDIT}
          title="catalog.class.edit"
          hidden={typed.isReadOnly}
        >
          ✏
        </Button>
        <Button
          action={Actions.CLASS_DETAIL}
          title="catalog.class.detail"
        >
          ℹ
        </Button>
        <Button
          action={visible ?
            Actions.CLASS_HIDE : Actions.CLASS_SHOW}
          title="catalog.class.toggle"
        >
          {visible ? "👁" : "🕶️"}
        </Button>
        <Button
          action={Actions.CLASS_PROFILE}
          title="catalog.class.profile"
        >
          🧲
        </Button>
        <Button
          action={Actions.CLASS_NEIGHBORHOOD}
          title="catalog.class.neighborhood"
        >
          🌎
        </Button>
      </div>
    </div>
  )
}

function asSemanticClassProfile(
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  catalogEntity: CatalogEntity,
  level: number,
): CatalogEntityItem {
  const label = getEntityLabel(languages, catalogEntity);
  const model = tracker.semanticModels.get(catalogEntity.model);
  return {
    level,
    model: catalogEntity.model,
    type: CatalogEntityType.ClassProfile,
    label: label,
    sortText: label,
    backgroundColor: tracker.getModelColor(
      catalogEntity.model, visualModel),
    filterText: label.toLocaleLowerCase(),
    renderItem: renderSemanticClassProfile,
    //
    identifier: catalogEntity.identifier,
    isExpandable: false,
    isReadOnly: model?.isReadOnly,
    canBeVisible: true, // TODO
    hasVisualEntity: tracker.hasVisualEntity(catalogEntity, visualModel),
  }
}

function renderSemanticClassProfile(item: CatalogItem) {
  const level = item.level - 1;
  const typed = item as CatalogEntityItem;
  const visible = typed.hasVisualEntity;
  return (
    <div className="relative">
      <div className="whitespace-nowrap">
        📑
        {"\u00A0".repeat(level * 2)}
        {level > 0 ? "└ " : ""}
        {item.label}
      </div>
      <div
        className="absolute top-0 right-0"
        data-identifier={typed.identifier}
        data-model={item.model}
      >
        {visible ?
          <Button
            action={Actions.CLASS_PROFILE_FOCUS}
            title="catalog.class-profile.focus"
          >
            🎯
          </Button> : null}
        <Button
          action={Actions.CLASS_PROFILE_DELETE}
          title="catalog.class-profile.delete"
          hidden={typed.isReadOnly}
        >
          🗑️
        </Button>
        <Button
          action={Actions.CLASS_PROFILE_EDIT}
          title="catalog.class-profile.edit"
          hidden={typed.isReadOnly}
        >
          ✏
        </Button>
        <Button
          action={Actions.CLASS_PROFILE_DETAIL}
          title="catalog.class-profile.detail"
        >
          ℹ
        </Button>
        <Button
          action={visible ?
            Actions.CLASS_PROFILE_HIDE : Actions.CLASS_PROFILE_SHOW}
          title="catalog.class-profile.toggle"
        >
          {visible ? "👁" : "🕶️"}
        </Button>
        <Button
          action={Actions.CLASS_PROFILE_PROFILE}
          title="catalog.class-profile.profile"
        >
          🧲
        </Button>
        <Button
          action={Actions.CLASS_PROFILE_NEIGHBORHOOD}
          title="catalog.class-profile.neighborhood"
        >
          🌎
        </Button>
      </div>
    </div>
  )
}

function asSemanticRelationship(
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  catalogEntity: CatalogEntity,
  level: number,
): CatalogEntityItem {
  const label = getEntityLabel(languages, catalogEntity);
  const model = tracker.semanticModels.get(catalogEntity.model);
  return {
    level,
    model: catalogEntity.model,
    type: CatalogEntityType.Relationship,
    label: label,
    sortText: label,
    backgroundColor: tracker.getModelColor(
      catalogEntity.model, visualModel),
    filterText: label.toLocaleLowerCase(),
    renderItem: renderSemanticRelationship,
    //
    identifier: catalogEntity.identifier,
    isExpandable: false,
    isReadOnly: model?.isReadOnly,
    canBeVisible: true, // TODO
    hasVisualEntity: tracker.hasVisualEntity(catalogEntity, visualModel),
  };
}

function renderSemanticRelationship(item: CatalogItem) {
  const level = item.level - 1;
  const typed = item as CatalogEntityItem;
  const visible = typed.hasVisualEntity;
  return (
    <div className="relative">
      <div className="whitespace-nowrap">
        📑
        {"\u00A0".repeat(level * 2)}
        {level > 0 ? "└ " : ""}
        {item.label}
      </div>
      <div
        className="absolute top-0 right-0"
        data-identifier={typed.identifier}
        data-model={item.model}
      >
        {visible ?
          <Button
            action={Actions.RELATIONSHIP_FOCUS}
            title="catalog.relationship.focus"
          >
            🎯
          </Button> : null}
        <Button
          action={Actions.RELATIONSHIP_DELETE}
          title="catalog.relationship.delete"
          hidden={typed.isReadOnly}
        >
          🗑️
        </Button>
        <Button
          action={Actions.RELATIONSHIP_EDIT}
          title="catalog.relationship.edit"
          hidden={typed.isReadOnly}
        >
          ✏
        </Button>
        <Button
          action={Actions.RELATIONSHIP_DETAIL}
          title="catalog.relationship.detail"
        >
          ℹ
        </Button>
        {typed.canBeVisible ?
          <Button
            action={visible ?
              Actions.RELATIONSHIP_HIDE : Actions.RELATIONSHIP_SHOW}
            title="catalog.relationship.toggle"
          >
            {visible ? "👁" : "🕶️"}
          </Button> : null}
        <Button
          action={Actions.RELATIONSHIP_PROFILE}
          title="catalog.relationship.profile"
        >
          🧲
        </Button>
        <Button
          action={Actions.RELATIONSHIP_NEIGHBORHOOD}
          title="catalog.relationship.neighborhood"
        >
          🌎
        </Button>
      </div>
    </div>
  )
}

function asSemanticRelationshipProfile(
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  catalogEntity: CatalogEntity,
  level: number,
): CatalogEntityItem {
  let label = "";
  let sortText = "";
  {
    let domainLabel = "";

    let associationLabel = getEntityLabel(languages, catalogEntity);
    const entity = tracker.entities.get(catalogEntity.identifier);

    if (entity !== undefined && isProfileRelationship(entity.entity)) {
      const [domain, _] = selectDomainAndRange(entity.entity.ends);
      const domainEntity = tracker.entities.get(domain.concept ?? "");
      if (domainEntity !== undefined) {
        domainLabel = getEntityLabel(languages, domainEntity);;
      }
    }

    label = `[${domainLabel}] -> ${associationLabel}`;
    sortText = `${domainLabel} ${associationLabel}`;
  }
  const model = tracker.semanticModels.get(catalogEntity.model);
  return {
    level,
    model: catalogEntity.model,
    type: CatalogEntityType.RelationshipProfile,
    label,
    sortText,
    backgroundColor: tracker.getModelColor(
      catalogEntity.model, visualModel),
    filterText: label.toLocaleLowerCase(),
    renderItem: renderSemanticRelationshipProfile,
    //
    identifier: catalogEntity.identifier,
    isExpandable: false,
    isReadOnly: model?.isReadOnly,
    canBeVisible: true, // TODO
    hasVisualEntity: tracker.hasVisualEntity(catalogEntity, visualModel),
  };
}

function renderSemanticRelationshipProfile(item: CatalogItem) {
  const level = item.level - 1;
  const typed = item as CatalogEntityItem;
  const visible = typed.hasVisualEntity;
  return (
    <div className="relative">
      <div className="whitespace-nowrap">
        📑
        {"\u00A0".repeat(level * 2)}
        {level > 0 ? "└ " : ""}
        {item.label}
      </div>
      <div
        className="absolute top-0 right-0"
        data-identifier={typed.identifier}
        data-model={item.model}
      >
        {visible ?
          <Button
            action={Actions.RELATIONSHIP_PROFILE_FOCUS}
            title="catalog.relationship-profile.focus"
          >
            🎯
          </Button> : null}
        <Button
          action={Actions.RELATIONSHIP_PROFILE_DELETE}
          title="catalog.relationship-profile.delete"
          hidden={typed.isReadOnly}
        >
          🗑️
        </Button>
        <Button
          action={Actions.RELATIONSHIP_PROFILE_EDIT}
          title="catalog.relationship-profile.edit"
          hidden={typed.isReadOnly}
        >
          ✏
        </Button>
        <Button
          action={Actions.RELATIONSHIP_PROFILE_DETAIL}
          title="catalog.relationship-profile.detail"
        >
          ℹ
        </Button>
        {typed.canBeVisible ?
          <Button
            action={visible ?
              Actions.RELATIONSHIP_PROFILE_HIDE :
              Actions.RELATIONSHIP_PROFILE_SHOW}
            title="catalog.relationship-profile.toggle"
          >
            {visible ? "👁" : "🕶️"}
          </Button> : null}
        <Button
          action={Actions.RELATIONSHIP_PROFILE_PROFILE}
          title="catalog.relationship-profile.profile"
        >
          🧲
        </Button>
        <Button
          action={Actions.RELATIONSHIP_PROFILE_NEIGHBORHOOD}
          title="catalog.relationship-profile.neighborhood"
        >
          🌎
        </Button>
      </div>
    </div>
  )
}

function asSemanticGeneralization(
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  catalogEntity: CatalogEntity,
  level: number,
): CatalogEntityItem {
  let label = "";
  {
    let childName = "";
    let parentName = "";

    const entity = tracker.entities.get(catalogEntity.identifier);
    if (entity !== undefined && isSemanticGeneralization(entity.entity)) {
      childName = tracker.getEntityLabel(languages, entity.entity.child) ?? "";
      parentName = tracker.getEntityLabel(languages, entity.entity.parent) ?? "";
    }
    label = `${parentName} -> ${childName}`;
  }
  const model = tracker.semanticModels.get(catalogEntity.model);
  return {
    level,
    model: catalogEntity.model,
    type: CatalogEntityType.Generalization,
    label: label,
    sortText: label,
    backgroundColor: tracker.getModelColor(
      catalogEntity.model, visualModel),
    filterText: label.toLocaleLowerCase(),
    renderItem: renderGeneralization,
    //
    identifier: catalogEntity.identifier,
    isExpandable: model?.isExternal,
    isReadOnly: model?.isReadOnly,
    canBeVisible: true, // TODO
    hasVisualEntity: tracker.hasVisualEntity(catalogEntity, visualModel),
  };
}

function renderGeneralization(item: CatalogItem) {
  const level = item.level - 1;
  const typed = item as CatalogEntityItem;
  const visible = typed.hasVisualEntity;
  return (
    <div className="relative">
      <div className="whitespace-nowrap">
        📑
        {"\u00A0".repeat(level * 2)}
        {level > 0 ? "└ " : ""}
        {item.label}
      </div>
      <div
        className="absolute top-0 right-0"
        data-identifier={typed.identifier}
        data-model={item.model}
      >
        <Button
          action={Actions.GENERALIZATION_DELETE}
          title="catalog.generalization.delete"
          hidden={typed.isReadOnly}
        >
          🗑️
        </Button>
        <Button
          action={Actions.GENERALIZATION_DETAIL}
          title="catalog.generalization.detail"
        >
          ℹ
        </Button>
        {typed.canBeVisible ?
          <Button
            action={visible ?
              Actions.GENERALIZATION_HIDE : Actions.GENERALIZATION_SHOW}
            title="catalog.generalization.toggle"
          >
            {visible ? "👁" : "🕶️"}
          </Button> : null}
      </div>
    </div>
  )
}

function createEntityTree(
  types: {
    guard: (what: Entity) => boolean,
    factory: (
      languages: string[],
      visualModel: string | null,
      tracker: CatalogTracker,
      catalogEntity: CatalogEntity,
      level: number,
    ) => CatalogItem,
  }[],
  childrenSelector: (entity: CatalogEntity) => EntityIdentifier[],
  languages: string[],
  visualModel: string | null,
  tracker: CatalogTracker,
  catalogEntity: CatalogEntity,
  level: number,
  visited: CatalogEntity[] = [],
): CatalogItem[] {
  const items: CatalogItem[] = [];
  // We iterate all children of current entity.
  for (const identifier of childrenSelector(catalogEntity)) {
    const entity = tracker.entities.get(identifier);
    if (entity === undefined || entity.entity === null) {
      continue;
    }
    // We check for supported types and use the first one that match.
    for (const { guard, factory } of types) {
      // Check if we can use the factory to render the content.
      // If so, render the content.
      if (!guard(entity.entity)) {
        continue;
      }
      items.push(factory(languages, visualModel, tracker, entity, level));
      // If we have already visited this item, we stop here to not
      // end up in a loop.
      if (visited.includes(entity)) {
        continue
      }
      items.push(...createEntityTree(
        types, childrenSelector,
        languages, visualModel, tracker, entity, level + 1,
        [...visited, entity]));
      break;
    }
  }
  return items;
}

function sortCatalogItems(items: CatalogItem[]): CatalogItem[] {
  const count = items.length;
  const subtreeEnd = new Array<number>(count);
  const stack: number[] = [];

  // Precompute subtree boundaries.
  for (let i = 0; i < count; i++) {
    while (
      stack.length &&
      items[i].level <= items[stack[stack.length - 1]].level
    ) {
      subtreeEnd[stack.pop()!] = i;
    }
    stack.push(i);
  }

  while (stack.length) {
    subtreeEnd[stack.pop()!] = count;
  }

  // Recursive function to perform the sorting.
  const result: CatalogItem[] = []
  function process(start: number, end: number, level: number) {
    const siblings: number[] = []
    let index = start
    while (index < end) {
      if (items[index].level === level) siblings.push(index)
      index = subtreeEnd[index]
    }
    siblings.sort((left, right) =>
      items[left].sortText.localeCompare(items[right].sortText)
    )
    for (const idx of siblings) {
      result.push(items[idx])
      process(idx + 1, subtreeEnd[idx], level + 1)
    }
  }

  // Start the recursion.
  process(0, count, 0);
  return result;
}

//
// RENDER : COMPONENTS
//

function rowRenderer(
  props: {
    /**
     * Unique key within array of rows.
     */
    key: string,
    /**
     * Index of row within collection.
     */
    index: number,
    /**
     * The List is currently being scrolled.
     */
    isScrolling: boolean,
    /**
     * This row is visible within the List, e.g. it is not an over-scanned row.
     */
    isVisible: boolean,
    /**
     * Style object to be applied to row  to position it.
     */
    style: React.CSSProperties;
  },
  view: CatalogView,
) {
  const item = view.visibleItems[props.index];
  const style: Record<string, any> = {
    ...props.style,
  };
  if (item.backgroundColor !== null) {
    style.backgroundColor = item.backgroundColor;
  }

  return (
    <div
      key={props.key}
      style={style}
    >
      {item.renderItem(item)}
    </div >
  );
}

function Button({ action, children, title, hidden, ...props }: {
  action: string,
  title: string,
  hidden?: boolean,
  children: React.ReactNode,
}) {
  let className = "hover:bg-slate-200";
  if (hidden) {
    className += " invisible";
  }
  return (
    <button
      className={className}
      data-action={action}
      title={t(title)}
      {...props}
    >
      {children}
    </button>
  )
}
