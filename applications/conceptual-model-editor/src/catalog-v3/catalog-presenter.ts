import { JSX } from "react";

import { ModelIdentifier } from "@dataspecer/entity-model";

import { configuration } from "../application";
import { ActionsContextType } from "../action/actions-react-binding";
import { createLabelResolver, LabelResolver } from "../dependency-tracker";
import * as Actions from "./catalog-action";
import { CatalogTracker } from "./catalog-tracker";
import { Language } from "../configuration";

export function createCatalogPresenter(
  setState: (setter: (previous: CatalogState) => CatalogState) => void,
  actions: ActionsContextType,
): CatalogPresenter {

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
    onTrackerDidChanged(
      tracker: CatalogTracker, visualModel: string | null, language: Language,
    ) {
      // TODO This cause full reload instead of fine grained update.
      const labelResolver = createLabelResolver(
        configuration().prefixes,
        [language]);

      setState(previous => {
        const views = previous.views.map(view => {
          const nextView = view.createView(labelResolver, visualModel, tracker, view);
          // Collect folding information.
          const foldedByModel = new Map<string, boolean>();
          for (const item of view.allItems) {
            if (item.type === CatalogEntityType.ModelSection) {
              foldedByModel.set(item.model, (item as CatalogModelSectionItem).folded);
            }
          }
          // Apply folding information.
          const allItems = nextView.allItems.map(item => {
            if (item.type !== CatalogEntityType.ModelSection) return item;
            const folded = foldedByModel.get(item.model);
            return folded === undefined ? item : { ...item, folded };
          });
          return { ...nextView, allItems };
        }).map(view => updateVisibleItems(view, previous.searchText));

        return { ...previous, views };
      });

    },
  };
}

export interface CatalogState {

  activeViewIndex: number;

  views: CatalogView[];

  searchText: string;

}

export interface CatalogPresenter {

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

  onTrackerDidChanged: (
    tracker: CatalogTracker,
    visualModel: string | null,
    language: Language
  ) => void;

}

export interface CatalogView {

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
    labelResolver: LabelResolver,
    visualModel: string | null,
    tracker: CatalogTracker,
    previous: CatalogView,
  ) => CatalogView;

}

export interface CatalogItem {

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

export interface CatalogModelSectionItem extends CatalogItem {

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

export interface SectionAddAction {

  /**
   * Label for translation.
   */
  title: string;

  action: string;

}

export interface CatalogEntityItem extends CatalogItem {

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


