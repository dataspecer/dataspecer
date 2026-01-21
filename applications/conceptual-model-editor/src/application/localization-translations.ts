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
  "collapse-all": "Collapse all vocabularies",
  "expand-all": "Expand all vocabularies",
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
export const english: Record<string, string | Function> = {
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
  "header.options": "Options",
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
  "create-visual-model-dialog.label-visual-label.iri": "Use entity's IRI.",
  "create-visual-model-dialog.label-visual-label.entity": "Use entity label.",
  "create-visual-model-dialog.label-visual-label.entity-vocabulary": "Use labels from profiled vocabularies or entity.",
  "create-visual-model-dialog.entity-color.entity": "Use entity model color.",
  "create-visual-model-dialog.entity-color.entity-vocabulary": "Use profiled vocabulary model color, or entity's model color.",
  "create-visual-model-dialog.profile.none": "Do not display profile of information.",
  "create-visual-model-dialog.profile.entity": "Use profile label.",
  "create-visual-model-dialog.profile.iri": "Use profile IRI.",
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

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const czech: Record<string, string | Function> = {
  ...prefix("dialog.association.", {
    "cancel": "❌ Zrušit",
    // Edit
    "label-edit": "Upravit vztah",
    "ok-edit": "✅ Uložit změny",
    // Create
    "label-create": "Vytvořit nový vztah",
    "ok-create": "✅ Vytvořit",
  }),
  ...prefix("dialog.association-profile.", {
    "cancel": "❌ Zrušit",
    // Edit
    "label-edit": "Upravit profil vztahu",
    "ok-edit": "✅ Uložit změny",
    // Create
    "label-create": "Vytvořit nový profil vztahu",
    "ok-create": "✅ Vytvořit",
  }),
  ...prefix("dialog.attribute.", {
    "cancel": "❌ Zrušit",
    // Edit
    "label-edit": "Upravit atribut",
    "ok-edit": "✅ Uložit změny",
    // Create
    "label-create": "Vytvořit nový atribut",
    "ok-create": "✅ Vytvořit",
  }),
  ...prefix("dialog.attribute-profile.", {
    "cancel": "❌ Zrušit",
    // Edit
    "label-edit": "Upravit profil atributu",
    "ok-edit": "✅ Uložit změny",
    // Create
    "label-create": "Vytvořit nový profil atributu",
    "ok-create": "✅ Vytvořit",
  }),
  ...prefix("dialog.class.", {
    "cancel": "❌ Zrušit",
    // Edit
    "label-edit": "Upravit třídu",
    "ok-edit": "✅ Uložit změny",
    // Create
    "label-create": "Vytvořit novou třídu",
    "ok-create": "✅ Vytvořit",
  }),
  ...prefix("dialog.class-profile.", {
    "cancel": "❌ Zrušit",
    // Edit
    "label-edit": "Upravit profil třídy",
    "ok-edit": "✅ Uložit změny",
    // Create
    "label-create": "Vytvořit profil třídy",
    "ok-create": "✅ Vytvořit",
  }),
  ...prefix("dialog.layout-visual-model.", {
    "cancel": "❌ Zrušit",
    // Perform layout
    "label-perform": "Konfigurace algoritmu automatického rozložení",
    "ok-perform": "✅ Provést rozložení",
  }),
  ...prefix("dialog.visual-diagram-node.", {
    "cancel": "❌ Zrušit",
    // Edit
    "label-edit": "Upravit uzel vizuálního diagramu",
    "label-info": "Zobrazit informace o uzlu vizuálního diagramu",
    "ok-edit": "✅ Uložit změny",
    // Create
    "label-create": "Vytvořit nový uzel vizuálního diagramu",
    "ok-create": "✅ Vytvořit",
  }),
  ...prefix("dialog.visual-model.", {
    "cancel": "❌ Zrušit",
    // Edit
    "label-edit": "Upravit vizuální model",
    "ok-edit": "✅ Uložit změny",
    // Create
    "label-create": "Vytvořit nový vizuální model",
    "ok-create": "✅ Vytvořit",
  }),
  ...prefix("edit-visual-node-dialog.", {
    "label": (nodeLabel: string) => `Upravit vizuální uzel ${nodeLabel}`,
    "btn-ok": "✅ Potvrdit",
    "btn-cancel": "❌ Zrušit",
    "content-visible": "Viditelný obsah:",
    "content-available": "Dostupný obsah:",
    "level-mandatory": "povinné",
    "level-optional": "volitelné",
    "level-recommended": "doporučené",
  }),
  ...prefix("edit-semantic-model-dialog.", {
    "title": "Upravit sémantický model",
    "base-iri": "Základní IRI",
    "label": "Popisek",
    "color": "Barva",
    "ok": "✅ Uložit změny",
    "cancel": "❌ Zrušit",
    "external-model-message": "Tento model je externí. Proto můžete změnit pouze barvu modelu.",
  }),
  ...prefix("search-external-semantic-model-dialog.", {
    "title": "Přidat entity z externího sémantického modelu",
    "search": "Hledat",
    "ok": "✅ Přidat entity",
    "cancel": "❌ Zrušit",
  }),
  ...prefix("profile-model-dialog.", {
    "label": "Profilovat entity v modelu",
    "ok": "Profilovat",
    "cancel": "Zavřít",
    "source-model": "Zdroj",
    "target-model": "Cíl",
  }),
  ...prefix("catalog.", {
    "model.show": "Zobrazit všechny entity v diagramu.",
    "model.hide": "Skrýt všechny entity v diagramu.",
    "model.edit": "Upravit sémantický model.",
    "model.profile": "Profilovat sémantický model.",
    "model.delete": "Odstranit sémantický model.",
    "model.add": "Přidat nový sémantický model.",
    "model.toggle": "Přepnout viditelnost diagramu.",
    "model.extend-external": "Hledat a přidat entity ze sémantického modelu.",
    "model.create-class": "Vytvořit novou třídu.",
    "model.create-association": "Vytvořit novou asociaci.",
    "model.create-attribute": "Vytvořit nový atribut.",
    "class.add-surroundings": "Načíst okolí třídy.",
    "class.release-surroundings": "Uvolnit okolí třídy.",
    "class.focus": "Zaměřit v diagramu.",
    "class.delete": "Odstranit třídu.",
    "class.edit": "Upravit třídu.",
    "class.detail": "Zobrazit detail třídy.",
    "class.toggle": "Přepnout viditelnost v diagramu.",
    "class.profile": "Vytvořit nový profil.",
    "class.neighborhood": "Přidat související entity do diagramu.",
    "class-profile.focus": "Zaměřit v diagramu.",
    "class-profile.delete": "Odstranit profil třídy.",
    "class-profile.edit": "Upravit profil třídy.",
    "class-profile.detail": "Zobrazit detail profilu třídy.",
    "class-profile.toggle": "Přepnout viditelnost v diagramu.",
    "class-profile.profile": "Vytvořit nový profil.",
    "class-profile.neighborhood": "Přidat související entity do diagramu.",
    "relationship.focus": "Zaměřit v diagramu.",
    "relationship.delete": "Odstranit vztah.",
    "relationship.edit": "Upravit vztah.",
    "relationship.detail": "Zobrazit detail vztahu.",
    "relationship.toggle": "Přepnout viditelnost v diagramu.",
    "relationship.profile": "Vytvořit nový profil.",
    "relationship.neighborhood": "Přidat doménu a rozsah do diagramu.",
    "relationship-profile.focus": "Zaměřit v diagramu.",
    "relationship-profile.delete": "Odstranit profil vztahu.",
    "relationship-profile.edit": "Upravit profil vztahu.",
    "relationship-profile.detail": "Zobrazit detail profilu vztahu.",
    "relationship-profile.toggle": "Přepnout viditelnost v diagramu.",
    "relationship-profile.profile": "Vytvořit nový profil.",
    "relationship-profile.neighborhood": "Přidat doménu a rozsah do diagramu.",
    "generalization.delete": "Odstranit generalizaci.",
    "generalization.detail": "Zobrazit detail generalizace.",
    "generalization.toggle": "Přepnout viditelnost v diagramu.",
    "clear": "Vymazat",
    "collapse-all": "Sbalit všechny slovníky",
    "expand-all": "Rozbalit všechny slovníky",
    "search-title": "Hledat položky podle popisku",
  }),
  ...prefix("dataspecer", {
    "package.state-is-null": "Není k dispozici žádný stav dataspecer, prosím obnovte aplikaci",
    "package.missing-model": "Chybějící model.",
    "package.can-not-save-in-detached-mode": "Nelze uložit v odpojeném režimu.",
    "ui-model.state-is-null": "Není k dispozici žádný stav ui-modelu, prosím obnovte aplikaci.",
  }),
  ...prefix("input-iri.", {
    "validate.space": "Neplatná syntaxe IRI.",
  }),
  //
  "notification.icon-error": "Ikona chyby",
  "notification.icon-success": "Ikona úspěchu",
  //
  "header.package.label": (name: string) => `Balíček: ${name}`,
  "header.package.missing": "Balíček neznámého názvu",
  "header.package.save": "💾 Uložit",
  "header.package.save.title": "Uložit balíček",
  "header.package.disable": "Abyste mohli uložit do backendu, ujistěte se, že jste v balíčku. Začněte návštěvou správce.",
  "header.package.save-and-leave": "💾👋 Uložit a odejít",
  "header.package.save-and-leave.title": "Uložit balíček a vrátit se do správce",
  //
  "header.logo-title": "Odejít do správce bez uložení",
  "header.options": "Možnosti",
  //
  "create-class-dialog.name": "Název",
  "create-class-dialog.iri": "IRI",
  "create-class-dialog.description": "Definice",
  "create-class-dialog.external-documentation-url": "URL externí dokumentace",
  "create-class-dialog.error-iri-not-set": "IRI není nastaveno",
  "create-class-dialog.btn-ok": "✅ vytvořit",
  "create-class-dialog.btn-cancel": "❌ zrušit",
  "create-class-dialog.add-specialization": "Přidat specializaci",
  "create-class-dialog.no-specialization-available": "Není nic ke specializaci",
  "create-class-dialog.class-role": "Role",
  "class-profile.role.undefined": "Nedefinováno",
  "class-profile.role.main": "Hlavní",
  "class-profile.role.supportive": "Podpůrná",
  "relationship-profile.mandatory-level": "Úroveň povinnosti",
  "relationship-profile.mandatory-level.undefined": "Nedefinováno",
  "relationship-profile.mandatory-level.mandatory": "Povinné",
  "relationship-profile.mandatory-level.recommended": "Doporučené",
  "relationship-profile.mandatory-level.optional": "Volitelné",
  //
  "create-profile-button.title": "Vytvořit profil",
  //
  "modify-entity-dialog.label-class": "Modifikace třídy",
  "modify-entity-dialog.label-class-profile": "Modifikace profilu třídy",
  "modify-entity-dialog.label-relationship": "Modifikace vztahu",
  "modify-entity-dialog.label-attribute": "Modifikace atributu",
  "modify-entity-dialog.label-relationship-profile": "Modifikace profilu vztahu",
  "modify-entity-dialog.label-attribute-profile": "Modifikace profilu atributu",
  "modify-entity-dialog.type": "Název",
  "modify-entity-dialog.id": "Identifikátor",
  "modify-entity-dialog.iri": "IRI",
  "modify-entity-dialog.specialization-of": "Specializace",
  "modify-entity-dialog.specialization-of-property": "Podvlastnost",
  "modify-entity-dialog.description": "Definice",
  "modify-entity-dialog.usage-note": "Poznámka k použití",
  "modify-entity-dialog.attributes": "Atributy",
  "modify-entity-dialog.attributes-profiles": "Profily atributů",
  "modify-entity-dialog.relationships": "Vztahy",
  "modify-entity-dialog.relationships-profiles": "Profily vztahů",
  //
  "attributes-component.name": "Název",
  "attributes-component.description": "Definice",
  "attributes-component.iri": "IRI",
  "attributes-component.cardinality": "Kardinalita",
  "attributes-component.datatype": "Datový typ",
  //
  "entity-detail-dialog.type": "Typ",
  "entity-detail-dialog.description": "Definice",
  "entity-detail-dialog.original-profile": "Původně profilovaná entita",
  "entity-detail-dialog.profiled-by": "Profilováno pomocí",
  "entity-detail-dialog.specialization-of": "Specializace",
  "entity-detail-dialog.specialization-of-property": "Podvlastnost",
  "entity-detail-dialog.generalization-of": "Generalizace",
  "entity-detail-dialog.attributes": "Atributy",
  "entity-detail-dialog.attributes-profiles": "Profily atributů",
  "entity-detail-dialog.usage-note": "Poznámka k použití",
  "entity-detail-dialog.domain": "Doména",
  "entity-detail-dialog.range": "Rozsah",
  "entity-detail-dialog.datatype": "Datový typ",
  "entity-detail-dialog.direct-profile": "Přímý profil",
  //
  "create-connection-dialog.iri": "IRI",
  "create-connection-dialog.type": "Typ",
  "create-connection-dialog.name": "Název",
  "create-connection-dialog.description": "Definice",
  "create-connection-dialog.cardinality": "Kardinality",
  "create-connection-dialog.source": "Zdroj",
  "create-connection-dialog.target": "Cíl",
  //
  "model-service.model-label-from-id": (id: string) => `Nepojmenovaný model s id '${id}'`,
  //
  "create-profile-dialog.label": (profile: string) => `Vytvořit profil ${profile ? "entity '" + profile + "'" : ""}`,
  "create-profile-dialog.profiled": "Profilovaná entita",
  "create-profile-dialog.profiled-type": "Typ profilované entity",
  "create-profile-dialog.name": "Název",
  "create-profile-dialog.iri": "IRI",
  "create-profile-dialog.description": "Definice",
  "create-profile-dialog.usage-note": "Poznámka k použití",
  "create-profile-dialog.warning": "Varování",
  "create-profile-dialog.btn-ok": "Vytvořit profil",
  "create-profile-dialog.btn-close": "Zrušit",
  //
  "model": "Model",
  "generalization-label": (child: string, parent: string) => `Generalizace '${child}' je '${parent}'`,
  "domain": "Doména",
  "domain-cardinality": "Kardinalita domény",
  "range": "Rozsah",
  "range-cardinality": "Kardinalita rozsahu",
  //
  "add-model-dialog.label": "Přidat slovník",
  "add-model-dialog.tab-from-url": "Slovník z URL",
  "add-model-dialog.tab-predefined": "Známé slovníky",
  "add-model-dialog.tab-create": "Vytvořit nový slovník",
  "add-model-dialog.btn-ok": "✅ Přidat slovník(y)",
  "add-model-dialog.btn-cancel": "❌ Zrušit",
  "add-model-dialog.url-label": "URL souboru Turtle slovníku (*.ttl):",
  "add-model-dialog.url-placeholder": "URL:",
  "add-model-dialog.alias-label": "Alias:",
  "add-model-dialog.alias-placeholder": "Alias pro váš slovník, můžete jej později změnit.",
  "add-model-dialog.url-size-warning": "Upozornění: import není optimalizován pro velké soubory.",
  "add-model-dialog.tab-predefined.introduction": "Vyberte slovník níže pro import. Můžete importovat více najednou.",
  "add-model-dialog.tab-create.introduction": "Vytvořit prázdný slovník.",
  //
  "create-visual-diagram-node-dialog.model-name": "Název odkazovaného vizuálního modelu",
  //
  "model.vocabularies": "Slovníky",
  "model.classes": "Třídy",
  "model.relationship": "Vztah",
  "model.attributes": "Atributy",
  "model.profiles": "Profily",
  "model.generalizations": "Generalizace",
  "model-catalog.add-vocabulary": "➕",
  //
  "detail-dialog.btn-close": "Zavřít",
  "detail-dialog.title.attribute": "Detail atributu",
  "detail-dialog.title.relationship": "Detail vztahu",
  "detail-dialog.title.attribute-profile": "Detail profilu atributu",
  "detail-dialog.title.class-profile": "Detail profilu třídy",
  "detail-dialog.title.relationship-profile": "Detail profilu vztahu",
  "detail-dialog.title.unknown": "Detail entity",
  "detail-dialog.title.class": "Detail třídy",
  //
  "modify-dialog.btn-ok": "✅ Upravit",
  "modify-dialog.btn-close": "❌ Zavřít",
  "modify-dialog.title.attribute": "Upravit atribut",
  "modify-dialog.title.relationship": "Upravit vztah",
  "modify-dialog.title.attribute-profile": "Upravit profil atributu",
  "modify-dialog.title.class": "Upravit třídu",
  "modify-dialog.title.class-profile": "Upravit profil třídy",
  "modify-dialog.title.relationship-profile": "Upravit profil vztahu",
  "modify-dialog.title.unknown": "Upravit entitu",
  //
  "create-connection-dialog.label": "Vytvořit spojení",
  "create-connection-dialog.btn-ok": "✅ Vytvořit",
  "create-connection-dialog.btn-close": "❌ Zrušit",
  //
  "create-class-profile-dialog.label": "Vytvořit profil",
  "modify-class-profile-dialog.profile-of": "Profil entity",
  //
  "undefined": "Nedefinováno",
  "change-in-profile": "Změna v profilu",
  //
  "warning": "Varování",
  "error": "Chyba",
  "warning-change-domain": "Změna domény může způsobit narušující změnu v profilu.",
  "warning-change-domain-cardinality": "Změna kardinality může způsobit narušující změnu v profilu.",
  "warning-change-range": "Změna rozsahu může způsobit narušující změnu v profilu.",
  "warning-change-range-cardinality": "Změna kardinality může způsobit narušující změnu v profilu.",
  //
  //
  "class-detail-button": "Detail třídy",
  "class-edit-button": "Upravit třídu",
  "class-hide-button": "Odstranit třídu z plátna",
  "class-profile-button": "Vytvořit profil třídy",
  "class-remove-button": "Odstranit třídu ze sémantického modelu",
  "edit-node-attributes-visiblity-button": "Upravit viditelnost atributů na uzlu",
  "duplicate-node-button": "Vytvořit novou kopii uzlu na plátně",
  //
  "add-neighborhood-button.title": "Přidat okolí entity. To znamená: \n" +
    "Pro atributy doménovou třídu \n" +
    "Pro vztahy vztah společně s konci (pokud nejsou přítomny) \n" +
    "Pro třídy a profily tříd všechny propojené třídy včetně hran",
  //
  "node-anchor-button": "(Od)kotvi uzel pro rozložení pomocí algoritmu síly",
  "node-connection-handle": "Táhněte z tohoto tlačítka pro vytvoření spojení (Tažení na plátno zobrazí menu)",
  "node-add-attribute": "Přidat nový atribut",
  "node-add-attribute-profile": "Přidat profil atributu",
  //
  "selection-action-button": "Zobrazit menu s akcemi, které lze provést na výběru",
  "selection-layout-button": "Zobrazit menu s akcemi rozložení, které lze provést na výběru",
  "selection-extend-button": "Zobrazit dialog pro rozšíření výběru",
  "selection-filter-button": "Zobrazit dialog pro filtrování výběru",
  "selection-group-button": "Vytvořit skupinu z výběru",
  "group-anchor-button": "Přepnout kotvy skupiny na opačnou hodnotu",
  //
  "selection-new-view-button": "Vytvoří nový vizuální model, který bude obsahovat vybrané uzly a hrany",
  "selection-profile-button": "Vytvoří profily z vybraných uzlů a hran",
  "selection-hide-button": "Odstraní vybrané uzly a hrany z plátna",
  "selection-remove-button": "Odstraní vybrané uzly a hrany ze sémantického modelu",
  "dissolve-group-button": "Rozpustit skupinu",
  //
  "iri-must-not-be-empty": "IRI nesmí být prázdný řetězec.",
  "domain-must-be-set": "Doména musí být nastavena.",
  "range-must-be-set": "Rozsah musí být nastaven.",
  //
  "filter-selection-dialog.label": "Omezit výběr na",
  "filter-selection-dialog.btn-ok": "✅ Omezit",
  "filter-selection-dialog.btn-cancel": "❌ Zrušit",
  "filter-selection-class-filter-text": "Třídy",
  "filter-selection-class-profile-filter-text": "Profily tříd",
  "filter-selection-association-filter-text": "Vztahy",
  "filter-selection-association-profile-filter-text": "Profily vztahů",
  "filter-selection-generalization-filter-text": "Generalizace",
  //
  "extend-selection-dialog.label": "Rozšířit výběr o",
  "extend-selection-dialog.btn-ok": "✅ Potvrdit",
  "extend-selection-dialog.btn-cancel": "❌ Zrušit",
  "extend-selection-association-name": "Asociace",
  "extend-selection-generalization-name": "Generalizace",
  "extend-selection-association-profile-name": "Profily asociací",
  "extend-selection-class-profile-name": "Profily tříd",
  "extend-by-incoming-header": "Příchozí",
  "extend-by-outgoing-header": "Odchozí",
  "extend-selection-dialog.extend-button": "Rozšířit",
  "extend-selection-dialog.only-edges-checkbox": "Pouze hrany",
  //
  "show-all-classes-from-semantic-model-to-visual-model-button.title": "Přidat všechny entity ze sémantického modelu do vizuálního modelu",
  "remove-all-classes-contained-semantic-model-from-visual-model-button.title": "Odstranit všechny entity ze sémantického modelu z vizuálního modelu",
  //
  "exploration-mode-button.title": "Přepnout zvýrazňovací režim průzkumu (zkuste najet myší na uzly na plátně nebo třídy v katalogu)",
  "exploration-mode-button.name": "Průzkum",
  //
  "drag-edge-to-canvas-create-association-target": "Vytvořit nový cíl asociace",
  "drag-edge-to-canvas-create-association-source": "Vytvořit nový zdroj asociace",
  "drag-edge-to-canvas-create-generalization-parent": "Vytvořit nového rodiče generalizace",
  "drag-edge-to-canvas-create-generalization-child": "Vytvořit nové dítě generalizace",
  //
  "visual-diagram-node-dissolve-button": "Rozpustit uzel reprezentující vizuální model. To znamená, že uzel diagramu je nahrazen jeho obsahem.",
  "visual-diagram-node-hide-button": "Odstranit uzel diagramu z plátna.",
  "visual-diagram-node-add-relationships-button": "Přidat všechny vztahy související s obsahem uzlu vizuálního diagramu do vizuálního modelu",
  "visual-diagram-node-move-to-source-visual-model-button": "Změnit vizuální model na vizuální model reprezentovaný tímto uzlem diagramu",
  "visual-diagram-node-edit-button": "Upravit vlastnosti uzlu diagramu",
  "visual-diagram-node-detail-button": "Zobrazit informace o uzlu vizuálního modelu",
  "visual-diagram-node-create-from-selection-button": "Vytvořit nový vizuální model s vybranými entitami a vložit uzel diagramu reprezentující nově vytvořený model do původního vizuálního modelu",
  //
  "visual-diagram-node-info-dialog.represented-visual-model-name": "Reprezentovaný vizuální model",
  //
  "create-visual-model-dialog.label": "Název vizuálního modelu",
  "create-visual-model-dialog.label-visual-label.iri": "Použít IRI entity.",
  "create-visual-model-dialog.label-visual-label.entity": "Použít popisek entity.",
  "create-visual-model-dialog.label-visual-label.entity-vocabulary": "Použít popisky z profilovaných slovníků nebo entity.",
  "create-visual-model-dialog.entity-color.entity": "Použít barvu modelu entity.",
  "create-visual-model-dialog.entity-color.entity-vocabulary": "Použít barvu modelu profilovaného slovníku nebo barvu modelu entity.",
  "create-visual-model-dialog.profile.none": "Nezobrazovat informace o profilu.",
  "create-visual-model-dialog.profile.entity": "Použít popisek profilu.",
  "create-visual-model-dialog.profile.iri": "Použít IRI profilu.",
  //
  "align-left.title": "Zarovnat vybrané uzly s nejlevějším a tak, aby byly zarovnány levé strany uzlů",
  "align-horizontal-mid.title": "Zarovnat vybrané uzly na střed horizontálně, tedy |",
  "align-right.title": "Zarovnat vybrané uzly s nejpravějším a tak, aby byly zarovnány pravé strany uzlů",
  "align-top.title": "Zarovnat vybrané uzly s nejhornějším a tak, aby byly zarovnány horní strany uzlů",
  "align-vertical-mid.title": "Zarovnat vybrané uzly na střed vertikálně, tedy -",
  "align-bot.title": "Zarovnat vybrané uzly s nejspodnějším a tak, aby byly zarovnány spodní strany uzlů",
  "align-left.text": "Zarovnat doleva",
  "align-horizontal-mid.text": "Zarovnat na střed",
  "align-right.text": "Zarovnat doprava",
  "align-top.text": "Zarovnat nahoru",
  "align-vertical-mid.text": "Zarovnat na střed",
  "align-bot.text": "Zarovnat dolů",
  "layout-dialog-open-button": "Rozložení",
  "layout-dialog-algorithm-configuration-label": "Konfigurace algoritmu",
  "layout-minimal-distance-between-nodes": "Minimální vzdálenost mezi uzly",
  "layout-number-of-runs-text": "Počet běhů (může trvat několik sekund pro vysoká čísla)",
  "layout-number-of-runs-tooltip": "Určuje počet běhů algoritmu. Vybere se ten s nejlepšími metrikami. Pro obrovské diagramy (stovky tříd) použijte nízké hodnoty jako 1-2, jinak 10-50 by měl být rozsah pro střední velikosti grafů, kde 10 obvykle najde ne-perfektní, ale dostatečně dobré rozložení.",
  "layout-stress-edge-length": "Ideální délka hrany",
  "layout-stress-class-profile-edge-length": "Ideální délka hrany mezi profilem třídy a profilovanou třídou",
  "layout-layered-in-layer-length": "Vzdálenost mezi vrstvami",
  "layout-layered-between-layers-length": "Vzdálenost uvnitř vrstvy",
  "layout-layered-edge-routing": "Směrování hran",
  "layout-layered-edge-routing-orthogonal-option": "Ortogonální",
  "layout-layered-edge-routing-splines-option": "Křivky",
  "layout-layered-edge-routing-polyline-option": "Lomenice",
  "layout-direction-string": "Směr",
  "layout-edge-direction": "Preferovaný směr hrany",
  "layout-edge-direction-up": "Nahoru",
  "layout-edge-direction-right": "Doprava",
  "layout-edge-direction-down": "Dolů",
  "layout-edge-direction-left": "Doleva",
  "layout-interactive-checkbox": "Vzít stávající rozložení v úvahu",
  "layout-layered-after-checkbox": "Spustit vrstvený algoritmus rozložení potom",
  "layout-node-overlap-removal-after-checkbox": "Spustit odstranění překrývání uzlů potom",
  "layout-dialog-chosen-algorithm-label": "Zvolený algoritmus rozložení",
  "layout-dialog-algorithm-elk-stress": "Síly-řízený",
  "layout-dialog-algorithm-elk-stress-class-profile": "Síly-řízený s profily tříd",
  "layout-dialog-algorithm-elk-layered": "Hierarchický algoritmus",
  "layout-dialog-algorithm-elk-stress-using-clusters": "Síly-řízený s klastry",
  "layout-dialog-algorithm-elk-overlap-removal": "Odstranění překrývání uzlů",
  "layout-dialog-algorithm-random": "Náhodný",
  "layout-dialog-algorithm-elk-radial": "Radiální algoritmus Elk",
  "layout-clusters-edge-layout": "Mělo by odstranit rozložení hran v klastru",
};

export const translations: { [language: string]: { [key: string]: string } } = {
  "cs": {
    ...prefix("diagram.", {
      "mandatory-level.mandatory": "<<povinné>>",
      "mandatory-level.optional": "<<volitelné>>",
      "mandatory-level.recommended": "<<doporučené>>",
      "profile-of": "profiluje",
      "profile-edge": "<<profiluje>>",
    }),
  },
  "en": {
    ...prefix("diagram.", {
      "mandatory-level.mandatory": "<<mandatory>>",
      "mandatory-level.optional": "<<optional>>",
      "mandatory-level.recommended": "<<recommended>>",
      "profile-of": "profile of",
      "profile-edge": "<<profile>>",
    }),
  },
}
