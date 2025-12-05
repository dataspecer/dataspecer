/* eslint @stylistic/js/max-len: off */

function prefix<T>(prefix: string, items: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(items)) {
    result[prefix + key] = value;
  }
  return result;
}

const dialogAssociation = prefix(
  "dialog.association.", {
    "cancel": "❌ Cancel",
    // Edit
    "label-edit": "Edit a relationship",
    "ok-edit": "✅ Save changes",
    // Create
    "label-create": "Create a new relationship",
    "ok-create": "✅ Create",
  });

const dialogAssociationProfile = prefix(
  "dialog.association-profile.", {
    "cancel": "❌ Cancel",
    // Edit
    "label-edit": "Edit a relationship profile",
    "ok-edit": "✅ Save changes",
    // Create
    "label-create": "Create a new relationship profile",
    "ok-create": "✅ Create",
  });

const dialogAttribute = prefix(
  "dialog.attribute.", {
    "cancel": "❌ Cancel",
    // Edit
    "label-edit": "Edit an attribute",
    "ok-edit": "✅ Save changes",
    // Create
    "label-create": "Create a new attribute",
    "ok-create": "✅ Create",
  });

const dialogAttributeProfile = prefix(
  "dialog.attribute-profile.", {
    "cancel": "❌ Cancel",
    // Edit
    "label-edit": "Edit an attribute profile",
    "ok-edit": "✅ Save changes",
    // Create
    "label-create": "Create a new attribute profile",
    "ok-create": "✅ Create",
  });

const dialogClass = prefix(
  "dialog.class.", {
    "cancel": "❌ Cancel",
    // Edit
    "label-edit": "Edit a class",
    "ok-edit": "✅ Save changes",
    // Create
    "label-create": "Create a new class",
    "ok-create": "✅ Create",
  });

const dialogClassProfile = prefix(
  "dialog.class-profile.", {
    "cancel": "❌ Cancel",
    // Edit
    "label-edit": "Edit a class profile",
    "ok-edit": "✅ Save changes",
    // Create
    "label-create": "Create a class profile",
    "ok-create": "✅ Create",
  });

const dialogLayoutVisualModel = prefix(
  "dialog.layout-visual-model.", {
    "cancel": "❌ Cancel",
    // Perform layout
    "label-perform": "Autolayout algorithm configuration",
    "ok-perform": "✅ Perform layout",
  });

const dialogVisualDiagramNode = prefix(
  "dialog.visual-diagram-node.", {
    "cancel": "❌ Cancel",
    // Edit
    "label-edit": "Edit a visual diagram node",
    "label-info": "Show info about visual diagram node",
    "ok-edit": "✅ Save changes",
    // Create
    "label-create": "Create a new visual diagram node",
    "ok-create": "✅ Create",
  });

const dialogVisualModel = prefix(
  "dialog.visual-model.", {
    "cancel": "❌ Cancel",
    // Edit
    "label-edit": "Edit visual model",
    "ok-edit": "✅ Save changes",
    // Create
    "label-create": "Create new visual model",
    "ok-create": "✅ Create",
  });

const dialogVisualNode = prefix(
  "edit-visual-node-dialog.", {
    "label": (nodeLabel: string) => `Edit visual node ${nodeLabel}`,
    "btn-ok": "✅ Accept",
    "btn-cancel": "❌ Cancel",
    "content-visible": "Visible content:",
    "content-available": "Available content:",
    "level-mandatory": "mandatory",
    "level-optional": "optional",
    "level-recommended": "recommended",
  });

const editSemanticModelDialog = prefix(
  "edit-semantic-model-dialog.", {
    "title": "Edit semantic model",
    "base-iri": "Base IRI",
    "label": "Label",
    "color": "Color",
    "ok": "✅ Save changes",
    "cancel": "❌ Cancel",
    "external-model-message": "This model is external. As a result you can only change the model's color."
  },
);

const searchExternalSemanticModelDialog = prefix(
  "search-external-semantic-model-dialog.", {
    "title": "Add entities from an external semantic model",
    "search": "Search",
    "ok": "✅ Add entities changes",
    "cancel": "❌ Cancel",
  },
);

const profileModelDialog = prefix(
  "profile-model-dialog.", {
    "label": "Profile entities in a model",
    "ok": "Profile",
    "cancel": "Close",
    "source-model": "Source",
    "target-model": "Target",
  },
);

const catalog = prefix(
  "catalog.", {
    "model.show": "Show all entities in the diagram.",
    "model.hide": "Hide all entities in the diagram.",
    "model.edit": "Edit semantic model.",
    "model.profile": "Profile semantic model.",
    "model.delete": "Delete the semantic model.",
    "model.add": "Add a new semantic model.",
    "model.toggle": "Toggle diagram visibility.",
    "model.extend-external": "Search and add entities from semantic model.",
    "model.create-class": "Create a new class.",
    "model.create-association": "Create a new association.",
    "model.create-attribute": "Create a new attribute.",
    "class.add-surroundings": "Load class's surrounding.",
    "class.release-surroundings": "Release class's surrounding.",
    "class.focus": "Focus in the diagram.",
    "class.delete": "Delete the class.",
    "class.edit": "Edit the class.",
    "class.detail": "Show class detail.",
    "class.toggle": "Toggle visibility in the diagram.",
    "class.profile": "Create a new profile.",
    "class.neighborhood": "Add related entities to the diagram.",
    "class-profile.focus": "Focus in the diagram.",
    "class-profile.delete": "Delete the class profile.",
    "class-profile.edit": "Edit the class profile.",
    "class-profile.detail": "Show profile class detail.",
    "class-profile.toggle": "Toggle visibility in the diagram.",
    "class-profile.profile": "Create a new profile.",
    "class-profile.neighborhood": "Add related entities to the diagram.",
    "relationship.focus": "Focus in the diagram.",
    "relationship.delete": "Delete the relationship.",
    "relationship.edit": "Edit the relationship.",
    "relationship.detail": "Show relationship detail.",
    "relationship.toggle": "Toggle visibility in the diagram.",
    "relationship.profile": "Create a new profile.",
    "relationship.neighborhood": "Add domain and range to the diagram.",
    "relationship-profile.focus": "Focus in the diagram.",
    "relationship-profile.delete": "Delete the relationship profile.",
    "relationship-profile.edit": "Edit the relationship profile.",
    "relationship-profile.detail": "Show relationship profile detail.",
    "relationship-profile.toggle": "Toggle visibility in the diagram.",
    "relationship-profile.profile": "Create a new profile.",
    "relationship-profile.neighborhood": "Add domain and range to the diagram.",
    "generalization.delete": "Delete the generalization.",
    "generalization.detail": "Show generalization detail.",
    "generalization.toggle": "Toggle visibility in the diagram.",
    "clear": "Clear",
    "search-title": "Search items by label",
  });

const dataspecer = prefix(
  "dataspecer", {
    "package.state-is-null": "There is no dataspecer state information, please reload the application",
    "package.missing-model": "Missing model.",
    "package.can-not-save-in-detached-mode": "Can not save in detached mode.",
    "ui-model.state-is-null": "There is no ui-model state information, please reload the application.",
  },
);

const inputIri = prefix(
  "input-iri.", {
    "validate.space": "Invalid IRI syntax.",
  },
);

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const translations: Record<string, string | Function> = {
  ...dialogAssociation,
  ...dialogAssociationProfile,
  ...dialogAttribute,
  ...dialogAttributeProfile,
  ...dialogClass,
  ...dialogClassProfile,
  ...dialogVisualDiagramNode,
  ...dialogVisualModel,
  ...dialogLayoutVisualModel,
  ...dataspecer,
  ...dialogVisualNode,
  ...editSemanticModelDialog,
  ...searchExternalSemanticModelDialog,
  ...profileModelDialog,
  ...catalog,
  ...inputIri,
  //
  "notification.icon-error": "Error icon",
  "notification.icon-success": "Check icon",
  //
  "header.package.label": (name: string) => `Package: ${name}`,
  "header.package.missing": "Package of unknown name",
  "header.package.save": "💾 Save",
  "header.package.save.title": "Save package",
  "header.package.disable": "To be able to save to backend, make sure you are in a package. Start with visiting the manager.",
  "header.package.save-and-leave": "💾👋 Save and leave",
  "header.package.save-and-leave.title": "Save package and go back to manager",
  //
  "header.logo-title": "Leave to manager without saving",
  //
  "create-class-dialog.name": "Name",
  "create-class-dialog.iri": "IRI",
  "create-class-dialog.description": "Definition",
  "create-class-dialog.external-documentation-url": "External documentation URL",
  "create-class-dialog.error-iri-not-set": "iri not set",
  "create-class-dialog.btn-ok": "✅ create",
  "create-class-dialog.btn-cancel": "❌ cancel",
  "create-class-dialog.add-specialization": "Add specialization",
  "create-class-dialog.no-specialization-available": "There is nothing to specialize",
  "create-class-dialog.class-role": "Role",
  "class-profile.role.undefined": "Undefined",
  "class-profile.role.main": "Main",
  "class-profile.role.supportive": "Supportive",
  "relationship-profile.mandatory-level": "Mandatory level",
  "relationship-profile.mandatory-level.undefined": "Undefined",
  "relationship-profile.mandatory-level.mandatory": "Mandatory",
  "relationship-profile.mandatory-level.recommended": "Recommended",
  "relationship-profile.mandatory-level.optional": "Optional",
  //
  "create-profile-button.title": "Create profile",
  //
  "modify-entity-dialog.label-class": "Class modification",
  "modify-entity-dialog.label-class-profile": "Class profile modification",
  "modify-entity-dialog.label-relationship": "Relationship modification",
  "modify-entity-dialog.label-attribute": "Attribute modification",
  "modify-entity-dialog.label-relationship-profile": "Relationship profile modification",
  "modify-entity-dialog.label-attribute-profile": "Attribute profile modification",
  "modify-entity-dialog.type": "Name",
  "modify-entity-dialog.id": "Identifier",
  "modify-entity-dialog.iri": "IRI",
  "modify-entity-dialog.specialization-of": "Specializations of",
  "modify-entity-dialog.specialization-of-property": "Subproperty of",
  "modify-entity-dialog.description": "Definition",
  "modify-entity-dialog.usage-note": "Usage note",
  "modify-entity-dialog.attributes": "Attributes",
  "modify-entity-dialog.attributes-profiles": "Attribute profiles",
  "modify-entity-dialog.relationships": "Relationships",
  "modify-entity-dialog.relationships-profiles": "Relationships profiles",
  //
  "attributes-component.name": "Name",
  "attributes-component.description": "Definition",
  "attributes-component.iri": "IRI",
  "attributes-component.cardinality": "Cardinality",
  "attributes-component.datatype": "Datatype",
  //
  "entity-detail-dialog.type": "Type",
  "entity-detail-dialog.description": "Definition",
  "entity-detail-dialog.original-profile": "The original profiled entity",
  "entity-detail-dialog.profiled-by": "Profiled by",
  "entity-detail-dialog.specialization-of": "Specialization of",
  "entity-detail-dialog.specialization-of-property": "Subproperty of",
  "entity-detail-dialog.generalization-of": "Generalization of",
  "entity-detail-dialog.attributes": "Attributes",
  "entity-detail-dialog.attributes-profiles": "Attribute profiles",
  "entity-detail-dialog.usage-note": "Usage note",
  "entity-detail-dialog.domain": "Domain",
  "entity-detail-dialog.range": "Range",
  "entity-detail-dialog.datatype": "Datatype",
  "entity-detail-dialog.direct-profile": "Direct profile of",
  //
  "create-connection-dialog.iri": "IRI",
  "create-connection-dialog.type": "Type",
  "create-connection-dialog.name": "Name",
  "create-connection-dialog.description": "Definition",
  "create-connection-dialog.cardinality": "Cardinalities",
  "create-connection-dialog.source": "Source",
  "create-connection-dialog.target": "Target",
  //
  "model-service.model-label-from-id": (id: string) => `Unnamed model with id '${id}'`,
  //
  "create-profile-dialog.label": (profile: string) => `Create a profile ${profile ? "of '" + profile + "'" : ""}`,
  "create-profile-dialog.profiled": "Profiled entity",
  "create-profile-dialog.profiled-type": "Profiled entity type",
  "create-profile-dialog.name": "Name",
  "create-profile-dialog.iri": "IRI",
  "create-profile-dialog.description": "Definition",
  "create-profile-dialog.usage-note": "Usage note",
  "create-profile-dialog.warning": "Warning",
  "create-profile-dialog.btn-ok": "Create profile",
  "create-profile-dialog.btn-close": "Cancel",
  //
  "model": "Model",
  "generalization-label": (child: string, parent: string) => `Generalization of '${child}' is '${parent}'`,
  "domain": "Domain",
  "domain-cardinality": "Domain cardinality",
  "range": "Range",
  "range-cardinality": "Range cardinality",
  //
  "add-model-dialog.label": "Add vocabulary",
  "add-model-dialog.tab-from-url": "Vocabulary from URL",
  "add-model-dialog.tab-predefined": "Well-known vocabularies",
  "add-model-dialog.tab-create": "Create new vocabulary",
  "add-model-dialog.btn-ok": "✅ Add vocabulary(s)",
  "add-model-dialog.btn-cancel": "❌ Cancel",
  "add-model-dialog.url-label": "Vocabulary Turtle file (*.ttl) URL:",
  "add-model-dialog.url-placeholder": "URL:",
  "add-model-dialog.alias-label": "Alias:",
  "add-model-dialog.alias-placeholder": "Alias for your vocabulary, you can change this later.",
  "add-model-dialog.url-size-warning": "Be warned, that the import is not optimized for large files.",
  "add-model-dialog.tab-predefined.introduction": "Select vocabulary from bellow to import. You can import multiple at once.",
  "add-model-dialog.tab-create.introduction": "Create an empty vocabulary.",
  //
  "create-visual-diagram-node-dialog.model-name": "Name of the referenced visual model",
  //
  "model.vocabularies": "Vocabularies",
  "model.classes": "Classes",
  "model.relationship": "Relationship",
  "model.attributes": "Attributes",
  "model.profiles": "Profiles",
  "model.generalizations": "Generalizations",
  "model-catalog.add-vocabulary": "➕",
  //
  "detail-dialog.btn-close": "Close",
  "detail-dialog.title.attribute": "Attribute detail",
  "detail-dialog.title.relationship": "Relationship detail",
  "detail-dialog.title.attribute-profile": "Attribute profile detail",
  "detail-dialog.title.class-profile": "Class profile detail",
  "detail-dialog.title.relationship-profile": "Relationship profile detail",
  "detail-dialog.title.unknown": "Entity detail",
  "detail-dialog.title.class": "Class detail",
  //
  "modify-dialog.btn-ok": "✅ Modify",
  "modify-dialog.btn-close": "❌ Close",
  "modify-dialog.title.attribute": "Edit attribute",
  "modify-dialog.title.relationship": "Edit relationship",
  "modify-dialog.title.attribute-profile": "Edit attribute profile",
  "modify-dialog.title.class": "Edit class",
  "modify-dialog.title.class-profile": "Edit class profile",
  "modify-dialog.title.relationship-profile": "Edit relationship profile",
  "modify-dialog.title.unknown": "Edit entity",
  //
  "create-connection-dialog.label": "Create connection",
  "create-connection-dialog.btn-ok": "✅ Create",
  "create-connection-dialog.btn-close": "❌ Discard",
  //
  "create-class-profile-dialog.label": "Create a profile",
  "modify-class-profile-dialog.profile-of": "Profile of",
  //
  "undefined": "Undefined",
  "change-in-profile": "Change in profile",
  //
  "warning": "Warning",
  "error": "Error",
  "warning-change-domain": "Change of the domain may introduce a breaking change in the profile.",
  "warning-change-domain-cardinality": "Change of cardinality may introduce a breaking change in the profile.",
  "warning-change-range": "Change of the range may introduce a breaking change in the profile.",
  "warning-change-range-cardinality": "Change of cardinality may introduce a breaking change in the profile.",
  //
  //
  "class-detail-button": "Class detail",
  "class-edit-button": "Edit class",
  "class-hide-button": "Remove class from canvas",
  "class-profile-button": "Create class profile",
  "class-remove-button": "Remove class from semantic model",
  "edit-node-attributes-visiblity-button": "Edit visibility of attributes on node",
  "duplicate-node-button": "Create new copy of the node on canvas",
  //
  "add-neighborhood-button.title": "Add entity's neighborhood. That is: \n" +
    "For attributes the domain class \n" +
    "For relationships the relationship together with ends (if not present) \n" +
    "For classes and class profiles all the connected classes together with edges",
  //
  "node-anchor-button": "(Un)anchor node for layouting using force-directed layouting algorithm",
  "node-connection-handle": "Drag from this button to create connection (Dragging to canvas shows menu)",
  "node-add-attribute": "Add a new attribute",
  "node-add-attribute-profile": "Add an attribute profile",
  //
  "selection-action-button": "Show menu with actions, which can be performed on a selection",
  "selection-layout-button": "Show menu with layout actions, which can be performed on a selection",
  "selection-extend-button": "Show dialog to extend selection",
  "selection-filter-button": "Show dialog to filter selection",
  "selection-group-button": "Create group from selection",
  "group-anchor-button": "Toggle anchors of group to opposite value",
  //
  "selection-new-view-button": "Creates new visual model, which will contain selected nodes and edges",
  "selection-profile-button": "Creates profiles from selected nodes and edges",
  "selection-hide-button": "Removes selected nodes and edges from canvas",
  "selection-remove-button": "Delete selected nodes and edges from semantic model",
  "dissolve-group-button": "Dissolve group",
  //
  "iri-must-not-be-empty": "IRI must not be an empty string.",
  "domain-must-be-set": "Domain must be set.",
  "range-must-be-set": "Range must be set.",
  //
  "filter-selection-dialog.label": "Restrict selection to",
  "filter-selection-dialog.btn-ok": "✅ Restrict",
  "filter-selection-dialog.btn-cancel": "❌ Cancel",
  "filter-selection-class-filter-text": "Classes",
  "filter-selection-class-profile-filter-text": "Class profiles",
  "filter-selection-association-filter-text": "Relationships",
  "filter-selection-association-profile-filter-text": "Relationship profiles ",
  "filter-selection-generalization-filter-text": "Generalizations",
  //
  "extend-selection-dialog.label": "Extend selection by",
  "extend-selection-dialog.btn-ok": "✅ Accept",
  "extend-selection-dialog.btn-cancel": "❌ Cancel",
  "extend-selection-association-name": "Associations",
  "extend-selection-generalization-name": "Generalizations",
  "extend-selection-association-profile-name": "Association profiles",
  "extend-selection-class-profile-name": "Class profiles",
  "extend-by-incoming-header": "Incoming",
  "extend-by-outgoing-header": "Outgoing",
  "extend-selection-dialog.extend-button": "Extend",
  "extend-selection-dialog.only-edges-checkbox": "Only edges",
  //
  "show-all-classes-from-semantic-model-to-visual-model-button.title": "Add all entities from semantic model to visual model",
  "remove-all-classes-contained-semantic-model-from-visual-model-button.title": "Remove all entities from semantic model from the visual model",
  //
  "exploration-mode-button.title": "Toggle highlighting exploration mode (try hovering with mouse cursor on top of nodes on canvas or classes in catalog)",
  "exploration-mode-button.name": "Exploration",
  //
  "drag-edge-to-canvas-create-association-target": "Create new association target",
  "drag-edge-to-canvas-create-association-source": "Create new association source",
  "drag-edge-to-canvas-create-generalization-parent": "Create new generalization parent",
  "drag-edge-to-canvas-create-generalization-child": "Create new generalization child",
  //
  "visual-diagram-node-dissolve-button": "Dissolve node representing visual model. That is the diagram node is replaced by its content.",
  "visual-diagram-node-hide-button": "Remove the diagram node from canvas.",
  "visual-diagram-node-add-relationships-button": "Add all the relationships related to the content of the visual diagram node to visual model",
  "visual-diagram-node-move-to-source-visual-model-button": "Change visual model to the visual model represented by this diagram node",
  "visual-diagram-node-edit-button": "Edit diagram node's properties",
  "visual-diagram-node-detail-button": "Show info about visual model diagram node",
  "visual-diagram-node-create-from-selection-button": "Create new visual model with selected entities and put diagram node representing the newly created model to the original visual model",
  //
  "visual-diagram-node-info-dialog.represented-visual-model-name": "Represented visual model",
  //
  "create-visual-model-dialog.label": "Visual model name",
  //
  "align-left.title": "Align selected nodes with the most left one and in such a way that the lefts of nodes are aligned",
  "align-horizontal-mid.title": "Align selected nodes to the middle horizontally, that is |",
  "align-right.title": "Align selected nodes with the most right one and in such a way that the rights of nodes are aligned",
  "align-top.title": "Align selected nodes with the most top one and in such a way that the tops of nodes are aligned",
  "align-vertical-mid.title": "Align selected nodes to the middle vertically, that is -",
  "align-bot.title": "Align selected nodes with the most bottom one and in such a way that the bottoms of nodes are aligned",
  "align-left.text": "Align to left",
  "align-horizontal-mid.text": "Align to middle",
  "align-right.text": "Align to right",
  "align-top.text": "Align to top",
  "align-vertical-mid.text": "Align to middle",
  "align-bot.text": "Align to bottom",
  "layout-dialog-open-button": "Layout",
  "layout-dialog-algorithm-configuration-label": "Algorithm configuration",
  "layout-minimal-distance-between-nodes": "Minimal distance between nodes",
  "layout-number-of-runs-text": "Number of runs (may take several seconds for high numbers)",
  "layout-number-of-runs-tooltip": "Specifies the number of times the algorithm should run. The one with best metrics is chosen. For huge diagrams (hundreds of classes) use low values like 1-2, otherwise 10-50 should be the range for mid-size graphs, where 10 seems to find not-perfect but good enough layouts.",
  "layout-stress-edge-length": "Ideal edge length",
  "layout-stress-class-profile-edge-length": "Ideal edge length between the class profile and profiled class",
  "layout-layered-in-layer-length": "Distance between layers",
  "layout-layered-between-layers-length": "Distance within layer",
  "layout-layered-edge-routing": "Edge routing",
  "layout-layered-edge-routing-orthogonal-option": "Orthogonal",
  "layout-layered-edge-routing-splines-option": "Splines",
  "layout-layered-edge-routing-polyline-option": "Polyline",
  "layout-direction-string": "Direction",
  "layout-edge-direction": "Preferred edge direction",
  "layout-edge-direction-up": "Up",
  "layout-edge-direction-right": "Right",
  "layout-edge-direction-down": "Down",
  "layout-edge-direction-left": "Left",
  "layout-interactive-checkbox": "Take existing layout into consideration",
  "layout-layered-after-checkbox": "Run layered layouting algorithm after",
  "layout-node-overlap-removal-after-checkbox": "Run node overlap removal after",
  "layout-dialog-chosen-algorithm-label": "Chosen layouting algorithm",
  "layout-dialog-algorithm-elk-stress": "Force-directed",
  "layout-dialog-algorithm-elk-stress-class-profile": "Force-directed with class profiles",
  "layout-dialog-algorithm-elk-layered": "Hierarchical algorithm",
  "layout-dialog-algorithm-elk-stress-using-clusters": "Force-directed with clusters",
  "layout-dialog-algorithm-elk-overlap-removal": "Node overlap removal",
  "layout-dialog-algorithm-random": "Random",
  "layout-dialog-algorithm-elk-radial": "Elk radial algorithm",
  "layout-clusters-edge-layout": "Should remove layout of edges in cluster",
};
