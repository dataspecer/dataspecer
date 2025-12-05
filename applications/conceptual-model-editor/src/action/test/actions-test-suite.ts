import { Entity, EntityModel } from "@dataspecer/core-v2";
import {
  DiagramActions,
  DiagramCallbacks,
  Group,
  GroupWithContent,
  Node,
  Edge,
  Position,
  ViewportDimensions,
  NodeType,
  EdgeType,
  VisualModelDiagramNode
} from "../../diagram";
import { UseDiagramType } from "../../diagram/diagram-hook";
import { UseNotificationServiceWriterType } from "../../notification/notification-service-context";
import { ClassesContextType } from "@/context/classes-context";
import {
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
  SEMANTIC_MODEL_GENERALIZATION,
  SemanticModelClass,
  SemanticModelGeneralization,
  SemanticModelRelationship
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  createClass,
  CreatedEntityOperationResult,
  createGeneralization,
  createRelationship
} from "@dataspecer/core-v2/semantic-model/operations";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { SetStateAction } from "react";
import {
  createDefaultVisualModelFactory,
  isVisualNode,
  VisualDiagramNode,
  WritableVisualModel
} from "@dataspecer/visual-model";
import {
  SemanticModelAggregator,
  SemanticModelAggregatorView
} from "@dataspecer/core-v2/semantic-model/aggregator";
import { XY } from "@dataspecer/layout";
import { ModelGraphContextType, UseModelGraphContextType } from "@/context/model-context";
import { CmeSpecialization } from "@/dataspecer/cme-model/model";
import { addVisualDiagramNode } from "@/dataspecer/visual-model/operation/add-visual-diagram-node";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { addSemanticGeneralizationToVisualModelAction } from "../add-generalization-to-visual-model";
import { addSemanticRelationshipToVisualModelAction } from "../add-relationship-to-visual-model";
import { addSemanticRelationshipProfileToVisualModelAction } from "../add-relationship-profile-to-visual-model";
import { createCmeClassProfile } from "@/dataspecer/cme-model/operation/create-cme-class-profile";
import { createCmeRelationshipProfile } from "@/dataspecer/cme-model/operation/create-cme-relationship-profile";
import {
  addVisualRelationshipsWithSpecifiedVisualEnds
} from "@/dataspecer/visual-model/operation/add-visual-relationships";
import { createCmeModelOperationExecutor } from "@/dataspecer/cme-model";
import { representRdfsLiteral } from "@/dialog/utilities/dialog-utilities";

export enum TestedSemanticConnectionType {
  Association,
  Generalization,
  AssociationProfile
};

type CreatedSemanticEntityData = {
  identifier: string,
  model: InMemorySemanticModel
};

/**
 * This class contains most of the relevant methods needed for testing of actions.
 * That is handling of creation of elements and models.
 * However it is very basic and can be extended
 */
export class ActionsTestSuite {
  /**
   *
   * @param diagramActionsSpecifiedByUser specify some actions as user needs for the tested code
   * @returns Returns diagram with most actions throwing error.
   * But some methods do have legitimate implementation.
   */
  static createTestDiagram(diagramActionsSpecifiedByUser?: Partial<DiagramActions>) {
    const diagram: UseDiagramType = {
      areActionsReady: false,
      actions: function (): DiagramActions {
        const diagramActions: DiagramActions = {
          getGroups: function (): Group[] {
            throw new Error("Function not implemented.");
          },
          addGroups: function (_groups: GroupWithContent[], _hideAddedTopLevelGroups: boolean): void {
            throw new Error("Function not implemented.");
          },
          removeGroups: function (_groups: string[]): void {
            throw new Error("Function not implemented.");
          },
          setGroup: function (_group: Group, _content: string[]): void {
            throw new Error("Function not implemented.");
          },
          getGroupContent: function (_group: Group): string[] {
            throw new Error("Function not implemented.");
          },
          getNodes: function (): Node[] {
            throw new Error("Function not implemented.");
          },
          addNodes: function (_nodes: Node[]): void {
            throw new Error("Function not implemented.");
          },
          updateNodes: function (_nodes: Node[]): void {
            throw new Error("Function not implemented.");
          },
          updateNodesPosition: function (_nodes: { [identifier: string]: Position; }): void {
            throw new Error("Function not implemented.");
          },
          removeNodes: function (_identifiers: string[]): void {
            throw new Error("Function not implemented.");
          },
          getNodeWidth: function (_identifier: string): number | null {
            return 200;
          },
          getNodeHeight: function (_identifier: string): number | null {
            return 100;
          },
          getEdges: function (): Edge[] {
            throw new Error("Function not implemented.");
          },
          addEdges: function (_edges: Edge[]): void {
            throw new Error("Function not implemented.");
          },
          updateEdges: function (_edges: Edge[]): void {
            throw new Error("Function not implemented.");
          },
          setEdgesWaypointPosition: function (_positions: { [identifier: string]: Position[]; }): void {
            throw new Error("Function not implemented.");
          },
          removeEdges: function (_identifiers: string[]): void {
            throw new Error("Function not implemented.");
          },
          getSelectedNodes: function (): Node[] {
            throw new Error("Function not implemented.");
          },
          setSelectedNodes: function (_selectedNodes: string[]): void {
            throw new Error("Function not implemented.");
          },
          getSelectedEdges: function (): Edge[] {
            throw new Error("Function not implemented.");
          },
          setSelectedEdges: function (_edges: string[]): void {
            throw new Error("Function not implemented.");
          },
          setContent: function (_nodes: Node[], _edges: Edge[], _groups: GroupWithContent[]): Promise<void> {
            throw new Error("Function not implemented.");
          },
          getViewport: function (): ViewportDimensions {
            return {
              position: { x: 0, y: 0 },
              width: 100,
              height: 100,
            };
          },
          setViewportToPosition: function (_x: number, _y: number): void {
            throw new Error("Function not implemented.");
          },
          centerViewportToNode: function (_identifier: string): void {
            throw new Error("Function not implemented.");
          },
          fitToView: function (_identifiers: string[]): void {
            throw new Error("Function not implemented.");
          },
          renderToSvgString: function (): Promise<string | null> {
            throw new Error("Function not implemented.");
          },
          openDragEdgeToCanvasMenu: function (_sourceNode: Node, _canvasPosition: Position): void {
            throw new Error("Function not implemented.");
          },
          openSelectionActionsMenu: function (_sourceNode: Node, _canvasPosition: Position): void {
            throw new Error("Function not implemented.");
          },
          openGroupMenu: function (_groupIdentifier: string, _canvasPosition: Position): void {
            throw new Error("Function not implemented.");
          },
          highlightNodesInExplorationModeFromCatalog: function (
            _nodeIdentifiers: string[],
            _modelOfClassWhichStartedHighlighting: string
          ): void {
            throw new Error("Function not implemented.");
          },
          openAlignmentMenu: function (_sourceNode: Node, _canvasPosition: Position): void {
            throw new Error("Function not implemented.");
          }
        }

        if(diagramActionsSpecifiedByUser !== undefined) {
          return {
            ...diagramActions,
            ...diagramActionsSpecifiedByUser
          };
        }
        return {
          ...diagramActions,
        };
      },
      setActions: function (_nextActions: DiagramActions): void {
        throw new Error("Function not implemented.");
      },
      callbacks: function (): DiagramCallbacks {
        throw new Error("Function not implemented.");
      },
      setCallbacks: function (_nextCallbacks: DiagramCallbacks): void {
        throw new Error("Function not implemented.");
      }
    };

    return diagram;
  }

  static createTestDiagramNode = (id: string) => {
    const node: Node = {
      type: NodeType.Class,
      identifier: id,
      externalIdentifier: `e${id}`,
      label: "",
      description: null,
      iri: null,
      color: "",
      group: null,
      position: { x: 0, y: 0, anchored: true },
      profileOf: [],
      vocabulary: [],
      options: {} as any,
      items: []
    };
    return node;
  };

  static createTestDiagramEdge = (id: string) => {
    const edge: Edge = {
      type: EdgeType.Association,
      identifier: id,
      externalIdentifier: `e${id}`,
      label: null,
      source: "",
      cardinalitySource: null,
      target: "",
      cardinalityTarget: null,
      color: "",
      waypoints: [],
      profileOf: [],
      iri: null,
      vocabulary: [],
      options: {} as any,
      mandatoryLevelLabel: null,
    }
    return edge;
  };

  /**
   *
   * @param models
   * @param givenClasses
   * @param givenRelationships
   * @returns Creates classes context based on given data, but just the object is returned, the logic for handling
   *  updates needs to be handled separately in test if necessary (but usually we don't want to update it for the test,
   *  we just need to have it as input for the action)
   */
  static createClassesContextTypeForTests(
    givenClasses: CreatedSemanticEntityData[],
    givenRelationships: CreatedSemanticEntityData[],
    givenGeneralizations: CreatedSemanticEntityData[],
    givenRelationshipProfiles: CreatedSemanticEntityData[],
  ): ClassesContextType {
    const classesAsSemanticEntities: SemanticModelClass[] = [];
    givenClasses.forEach(cclass => {
      classesAsSemanticEntities.push(cclass.model.getEntities()[cclass.identifier] as SemanticModelClass);
    });

    const relationshipsAsSemanticEntities: SemanticModelRelationship[] = [];
    givenRelationships.forEach(relationship => {
      relationshipsAsSemanticEntities.push(
        relationship.model.getEntities()[relationship.identifier] as SemanticModelRelationship);
    });

    const generalizationsAsSemanticEntities: SemanticModelGeneralization[] = [];
    givenGeneralizations.forEach(generalization => {
      generalizationsAsSemanticEntities.push(
        generalization.model.getEntities()[generalization.identifier] as SemanticModelGeneralization);
    });

    const relationshipProfilesAsSemanticEntities: SemanticModelRelationshipProfile[] = [];
    givenRelationshipProfiles.forEach(relationshipProfile => {
      relationshipProfilesAsSemanticEntities.push(
        relationshipProfile.model.getEntities()[relationshipProfile.identifier] as SemanticModelRelationshipProfile);
    });

    const rawEntities = (classesAsSemanticEntities as Entity[])
      .concat(relationshipsAsSemanticEntities)
      .concat(generalizationsAsSemanticEntities)
      .concat(relationshipProfilesAsSemanticEntities);

    const classes: ClassesContextType = {
      classes: classesAsSemanticEntities,
      allowedClasses: [],
      setAllowedClasses: function (_) { },
      relationships: relationshipsAsSemanticEntities,
      generalizations: generalizationsAsSemanticEntities,
      sourceModelOfEntityMap: new Map(),
      rawEntities,
      classProfiles: [],
      relationshipProfiles: relationshipProfilesAsSemanticEntities
    };

    return classes;
  };

  static generateIriForName = (name: string) => {
    return name + "-iri.cz";
  }

  static createSemanticClassTestVariant(
    models: Map<string, EntityModel>,
    givenName: string,
    dsIdentifier: string,
    specializations: CmeSpecialization[],
    identifier?: string
  ): CreatedSemanticEntityData | null {

    const name = { "en": givenName };

    const operation = createClass({
      iri: ActionsTestSuite.generateIriForName(givenName),
      name,
      description: {},
      id: identifier
    });

    const model: InMemorySemanticModel = models.get(dsIdentifier) as InMemorySemanticModel;
    const newClass = model.executeOperation(operation) as CreatedEntityOperationResult;
    if (newClass.success === false || newClass.id === undefined) {
      return null;
    }

    // Perform additional modifications for which we need to have the class identifier.
    const operations = [];
    for (const specialization of specializations) {
      operations.push(createGeneralization({
        parent: specialization.specializationOf.identifier,
        child: newClass.id,
        iri: specialization.iri,
      }));
    }
    model.executeOperations(operations);

    return {
      identifier: newClass.id,
      model,
    };
  }

  /**
   * Creates 3 models, each containing 4 classes.
   * 1st one has no relationships,
   * 2nd forms square
   * 3rd fully connected graph.
   * The identifiers of the classes are "0"-"11" and the identifiers of the relationships are sourceID-rangeID
   *
   * Also creates visual model with 0-4 nodes based on given {@link visualModelSize} from the first semantic model.
   *
   * The {@link classesContext} on output contain the relevant data, but they are not updated based on changes.
   */
  static prepareModelsWithSemanticData = (
    visualModelSize: number,
    connectionToTestType: TestedSemanticConnectionType,
  ) => {
    const visualModel: WritableVisualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
    const modelAlias = "TEST MODEL";
    const models : Map<string, EntityModel> = new Map();
    const modelsAsArray: EntityModel[] = [];
    const modelCount = 3;
    const createdClasses: CreatedSemanticEntityData[][] = [];
    const createdRelationships: CreatedSemanticEntityData[][] = [];
    let firstModel: InMemorySemanticModel | null = null;
    const visualNodeIdentifiers: string[] = [];

    const aggregator = new SemanticModelAggregator();
    aggregator.addModel(visualModel);
    const aggregatorView = aggregator.getView();
    aggregatorView.changeActiveVisualModel(visualModel.getIdentifier());
    const visualModels: Map<string, WritableVisualModel> = new Map(Object.entries({
      [visualModel.getIdentifier()]: visualModel
    }));

    const graph: ModelGraphContextType = {
      aggregator,
      aggregatorView,
      setAggregatorView: function (_value: SetStateAction<SemanticModelAggregatorView>): void {
        // Do nothing
      },
      models: models,
      setModels: function (_value: SetStateAction<Map<string, EntityModel>>): void {
        throw new Error("Function not implemented.");
      },
      visualModels,
      setVisualModels: function (_value: SetStateAction<Map<string, WritableVisualModel>>): void {
        throw new Error("Function not implemented.");
      }
    };
    for(let i = 0; i < modelCount; i++) {
      const model = new InMemorySemanticModel();
      if (i === 0) {
        firstModel = model;
      }
      model.setAlias(modelAlias);
      models.set(model.getId(), model);
      modelsAsArray.push(model);
      aggregator.addModel(model);
      createdClasses.push([]);
      createdRelationships.push([]);
    }

    const useGraph: UseModelGraphContextType = {
      aggregator,
      aggregatorView,
      setAggregatorView: function (_value: SetStateAction<SemanticModelAggregatorView>): void {
        throw new Error("Function not implemented.");
      },
      models,
      visualModels,
      setVisualModels: function (_value: SetStateAction<Map<string, WritableVisualModel>>): void {
        throw new Error("Function not implemented.");
      },
      addModel: function (..._models: EntityModel[]): void {
        throw new Error("Function not implemented.");
      },
      addVisualModel: function (...visualModels: WritableVisualModel[]): void {
        for(const visualModel of visualModels) {
          graph.aggregator.addModel(visualModel);
        }
      },
      setModelAlias: function (_alias: string | null, _model: EntityModel): void {
        throw new Error("Function not implemented.");
      },
      setModelIri: function (_iri: string, _model: InMemorySemanticModel): void {
        throw new Error("Function not implemented.");
      },
      replaceModels: function (_entityModels: EntityModel[], _visualModels: WritableVisualModel[]): void {
        throw new Error("Function not implemented.");
      },
      removeModel: function (_modelId: string): void {
        throw new Error("Function not implemented.");
      },
      removeVisualModel: function (_modelId: string): void {
        throw new Error("Function not implemented.");
      }
    }

    // Fill with data

    for(let i = 0; i < visualModelSize; i++) {
      const visualIdentifier = ActionsTestSuite.createNewVisualNodeForTesting(
        visualModel, firstModel!.getId(), `${i}`);
      visualNodeIdentifiers.push(visualIdentifier);
    }

    const modelIdentifiers = [...models.keys()]
    for(let i = 0; i < modelCount; i++) {
      for(let j = 0; j < 4; j++) {
        const createdClass = ActionsTestSuite.createSemanticClassTestVariant(
          models, `${i}-${j}`, modelIdentifiers[i], [], (j + (4*i)).toString());
        if(createdClass === null) {
          throw new Error("Failed on setup");
        }
        createdClasses[i].push(createdClass);
      }

      let squareRelationships;
      let createdDiagonalRelationship;
      switch(i) {
      case 0:
        break;
      case 1:
        squareRelationships = ActionsTestSuite.createConnectionSquare(
          models, modelIdentifiers[i], createdClasses, i, connectionToTestType, null);
        createdRelationships[i].push(...squareRelationships);
        break;
      case 2:
        squareRelationships = ActionsTestSuite.createConnectionSquare(
          models, modelIdentifiers[i], createdClasses, i, connectionToTestType, null);
        createdRelationships[i].push(...squareRelationships);
        createdDiagonalRelationship = ActionsTestSuite.createSemanticConnectionToTest(
          models, modelIdentifiers[i], connectionToTestType,
          createdClasses[i][0].identifier, createdClasses[i][2].identifier, null);
        createdRelationships[i].push(createdDiagonalRelationship);
        createdDiagonalRelationship = ActionsTestSuite.createSemanticConnectionToTest(
          models, modelIdentifiers[i], connectionToTestType,
          createdClasses[i][1].identifier, createdClasses[i][3].identifier, null);
        createdRelationships[i].push(createdDiagonalRelationship);
        break;
      default:
        throw new Error("Failed on setup");
      }
    }

    const classesContext = ActionsTestSuite.createClassesContextTypeForTests(
      createdClasses.flat(),
      connectionToTestType === TestedSemanticConnectionType.Association ? createdRelationships.flat() : [],
      connectionToTestType === TestedSemanticConnectionType.Generalization ? createdRelationships.flat() : [],
      connectionToTestType === TestedSemanticConnectionType.AssociationProfile ? createdRelationships.flat() : [],
    );

    return {
      visualModel,
      visualNodeIdentifiers,
      modelAlias,
      firstModel: firstModel as InMemorySemanticModel,
      models,
      modelsAsArray,
      graph,
      useGraph,
      classesContext
    };
  }

  static createConnectionSquare = (
    models: Map<string, EntityModel>,
    modelDsIdentifier: string,
    createdClasses: CreatedSemanticEntityData[][],
    currentModel: number,
    connectionToTestType: TestedSemanticConnectionType,
    profileOf: string[] | null,
  ): CreatedSemanticEntityData[] => {
    const createdRelationships = [];
    for(let i = 0; i < 4; i++) {
      const created = ActionsTestSuite.createSemanticConnectionToTest(
        models, modelDsIdentifier, connectionToTestType,
        createdClasses[currentModel][i].identifier,
        createdClasses[currentModel][(i+1)%4].identifier,
        profileOf);
      createdRelationships.push(created);
    }

    return createdRelationships;
  }

  static createNewVisualNodeForTesting(
    visualModel: WritableVisualModel,
    model: string,
    representedEntity: string,
    position?: XY
  ) {
    const visualId = visualModel.addVisualNode({
      representedEntity: representedEntity,
      model,
      content: [],
      visualModels: [],
      position: position !== undefined ? { ...position, anchored: null } : { x: 0, y: 0, anchored: null },
    });

    return visualId;
  }

  /**
   * @returns The identifier of the created visual entity representing diagram node.
   */
  static createNewVisualDiagramNodeForTesting(
    visualModel: WritableVisualModel,
    representedVisualModel: string,
    position?: XY
  ): string {
    const nodePosition = position !== undefined ? { ...position, anchored: null } : { x: 0, y: 0, anchored: null };
    const visualId = addVisualDiagramNode(visualModel, nodePosition, representedVisualModel);
    return visualId;
  }

  static createNewVisualModelDiagramNodeForTesting(
    identifier: string,
    representedVisualModel: string,
    position?: XY
  ): VisualModelDiagramNode {
    const nodePosition = position !== undefined ? { ...position, anchored: null } : { x: 0, y: 0, anchored: null };

    const result: VisualModelDiagramNode = {
      identifier,
      externalIdentifier: representedVisualModel,
      label: "",
      representedModelAlias: "",
      group: null,
      position: nodePosition,
    };
    return result;
  }

  static createNewVisualModelDiagramNodeFromVisualDiagramNodeForTesting(
    visualDiagramNode: VisualDiagramNode,
  ): VisualModelDiagramNode {
    const result: VisualModelDiagramNode = {
      identifier: visualDiagramNode.identifier,
      externalIdentifier: visualDiagramNode.representedVisualModel,
      label: "",
      representedModelAlias: "",
      group: null,
      position: visualDiagramNode.position,
    };
    return result;
  }

  static mapTestedSemanticConnectionToSemanticCheck = {
    [TestedSemanticConnectionType.Association]: isSemanticModelRelationship,
    [TestedSemanticConnectionType.Generalization]: isSemanticModelGeneralization,
    [TestedSemanticConnectionType.AssociationProfile]: isSemanticModelRelationshipProfile,
  } as const;

  static createSemanticConnectionToTest(
    models: Map<string, EntityModel>,
    modelDsIdentifier: string,
    relationshipToTestType: TestedSemanticConnectionType,
    domain: string,
    range: string,
    profileOf: string[] | null,
  ): CreatedSemanticEntityData {
    let result: CreatedSemanticEntityData ;
    if(relationshipToTestType === TestedSemanticConnectionType.Generalization) {
      result = ActionsTestSuite.createSemanticGeneralizationTestVariant(
        range, domain, null, models, modelDsIdentifier);
    }
    else if(relationshipToTestType === TestedSemanticConnectionType.Association) {
      result = ActionsTestSuite.createSemanticRelationshipTestVariant(
        models, domain, range, modelDsIdentifier);
    }
    else if(relationshipToTestType === TestedSemanticConnectionType.AssociationProfile) {
      result = ActionsTestSuite.createRelationshipProfileTestVariant(
        models, modelDsIdentifier, profileOf ?? [], domain, range);
    }
    else {
      throw new Error("Failed in setup when creating relationship");
    }

    return result;
  }

  /**
   * @param identifier if null, then unique identifier is created in the executeOperation
   */
  static createSemanticGeneralizationTestVariant(
    parent: string,
    child: string,
    identifier: string | null,
    models: Map<string, EntityModel>,
    modelDsIdentifier: string,
  ): CreatedSemanticEntityData {
    const generalization: SemanticModelGeneralization | Omit<SemanticModelGeneralization, "id"> = {
      id: identifier ?? undefined,
      iri: ActionsTestSuite.generateIriForName(""),
      type: [SEMANTIC_MODEL_GENERALIZATION],
      parent,
      child,
    };

    const model: InMemorySemanticModel = models.get(modelDsIdentifier) as InMemorySemanticModel;
    const createGeneralizationOperation = createGeneralization(generalization);
    const newGeneralization = model.executeOperation(createGeneralizationOperation) as CreatedEntityOperationResult;

    return {
      identifier: newGeneralization.id,
      model,
    };
  }

  private static createRelationshipProfileTestVariant(
    models: Map<string, EntityModel>,
    modelDsIdentifier: string,
    profileOf: string[],
    domain: string,
    range: string,
  ): CreatedSemanticEntityData {
    const model: InMemorySemanticModel = models.get(modelDsIdentifier) as InMemorySemanticModel;

    const result = createCmeRelationshipProfile(model, {
      model: modelDsIdentifier,
      profileOf,
      iri: null,
      name: null,
      nameSource: null,
      description: null,
      descriptionSource: null,
      usageNote: null,
      usageNoteSource: null,
      externalDocumentationUrl: null,
      mandatoryLevel: null,
      //
      domain: domain,
      domainCardinality: null,
      range: range,
      rangeCardinality: null,
    });
    return {
      identifier: result.identifier,
      model,
    };
  }

  static createRelationshipProfileOfEveryRelationshipTestVariant(
    models: Map<string, EntityModel>,
    modelDsIdentifier: string,
    classesContext: ClassesContextType,
  ) {
    const createdIdentifiers = [];
    const model = models.get(modelDsIdentifier) as InMemorySemanticModel;
    for(const entity of Object.values(model.getEntities())) {
      if(!isSemanticModelRelationship(entity) && !isSemanticModelRelationshipProfile(entity)) {
        continue;
      }

      if(entity.ends[0].concept === null || entity.ends[1].concept === null) {
        throw new Error("Failed on relationship profile setup")
      }
      const result = ActionsTestSuite.createRelationshipProfileTestVariant(
        models, modelDsIdentifier, [entity.id],
        entity.ends[0].concept, entity.ends[1].concept);
      createdIdentifiers.push(result?.identifier);
    }

    const newRelationshipProfiles = createdIdentifiers.map(identifier =>
                                     model.getEntities()[identifier] as SemanticModelRelationshipProfile);
    classesContext.relationshipProfiles = classesContext.relationshipProfiles.concat(newRelationshipProfiles);
    return {
      createdIdentifiers,
      model,
    };
  }

  private static createClassProfileTestVariant(
    models: Map<string, EntityModel>,
    modelDsIdentifier: string,
    profileOf: string[],
  ) {
    const model = models.get(modelDsIdentifier) as InMemorySemanticModel;

    const result = createCmeClassProfile(model, {
      model: modelDsIdentifier,
      profileOf,
      iri: null,
      name: null,
      nameSource: null,
      description: null,
      descriptionSource: null,
      usageNote: null,
      usageNoteSource: null,
      externalDocumentationUrl: null,
      role: null
    });
    return {
      identifier: result.identifier,
      model,
    };
  }

  static createClassProfileOfEveryClassTestVariant(
    models: Map<string, EntityModel>,
    modelDsIdentifier: string,
    classesContext: ClassesContextType,
  ) {
    const createdIdentifiers: {
      profiledClass: string,
      classProfile: string
    }[] = [];
    const model = models.get(modelDsIdentifier) as InMemorySemanticModel;
    for(const entity of Object.values(model.getEntities())) {
      if(!isSemanticModelClass(entity) && !isSemanticModelClassProfile(entity)) {
        continue;
      }

      const result = ActionsTestSuite.createClassProfileTestVariant(models, modelDsIdentifier, [entity.id]);
      createdIdentifiers.push({
        classProfile: result?.identifier,
        profiledClass: entity.id
      });
    }

    const newClassProfiles = createdIdentifiers
      .map(created => model.getEntities()[created.classProfile] as SemanticModelClassProfile);
    classesContext.classProfiles = classesContext.classProfiles.concat(newClassProfiles);
    return {
      createdIdentifiers,
      model,
    };
  }

  /**
   * Creates semantic attribute, adds it to the model and extends the classes context
   */
  static createSemanticAttributeTestVariant(
    classesContext: ClassesContextType,
    models: Map<string, EntityModel>,
    domainConceptIdentifier: string,
    ModelDsIdentifier: string,
    attributeName: string,
  ) {

    const range = representRdfsLiteral();
    const name = { "en": attributeName };
    const operation = createRelationship({
      ends: [{
        iri: null,
        name: {},
        description: {},
        concept: domainConceptIdentifier,
        cardinality: [0, 1],
      }, {
        name,
        description: {},
        concept: range.identifier,
        cardinality: [0, 1],
        iri: ActionsTestSuite.generateIriForName(name["en"]),
      }]
    });

    const model: InMemorySemanticModel = models.get(ModelDsIdentifier) as InMemorySemanticModel;
    const newAttribute = model.executeOperation(operation) as CreatedEntityOperationResult;
    if (newAttribute.success === false || newAttribute.id === undefined) {
      throw new Error("Failed in attribute creation");
    }

    const attributeObject = model.getEntities()[newAttribute.id];
    if (!isSemanticModelAttribute(attributeObject)) {
      throw new Error("Failed when creating attribute");
    }
    classesContext.relationships.push(attributeObject);
    classesContext.rawEntities.push(attributeObject);

    return {
      identifier: newAttribute.id,
      model,
    };
  }

  static createSemanticAttributeProfileTestVariant(
    classesContext: ClassesContextType,
    models: Map<string, EntityModel>,
    domainAttribute: string,
    domainConceptIdentifier: string,
    modelDsIdentifier: string,
  ) {
    const range = representRdfsLiteral();

    const model: InMemorySemanticModel = models.get(modelDsIdentifier) as InMemorySemanticModel;
    const executor = createCmeModelOperationExecutor(models);
    const result = executor.createRelationshipProfile({
      model: modelDsIdentifier,
      profileOf: [domainAttribute],
      iri: ActionsTestSuite.generateIriForName(domainAttribute),
      name: null,
      nameSource: null,
      description: null,
      descriptionSource: null,
      usageNote: null,
      usageNoteSource: null,
      //
      domain: domainConceptIdentifier,
      domainCardinality: null,
      range: range.identifier,
      rangeCardinality: null,
      externalDocumentationUrl: null,
      mandatoryLevel: null,
    });

    const createdAttributeProfile = model.getEntities()[result.identifier];
    if(!isSemanticModelRelationshipProfile(createdAttributeProfile)) {
      throw new Error("Failed on set-up when creating semantic attribute profile")
    }
    classesContext.relationshipProfiles.push(createdAttributeProfile);

    return {
      identifier: result.identifier,
      model,
    };
  }

  static createSemanticRelationshipTestVariant(
    models: Map<string, EntityModel>,
    domainConceptIdentifier: string,
    rangeConceptIdentifier: string,
    modelDsIdentifier: string,
  ): CreatedSemanticEntityData {
    const name = { "en": "" };

    const operation = createRelationship({
      id: `${domainConceptIdentifier}-${rangeConceptIdentifier}`,
      ends: [{
        iri: null,
        name: {},
        description: {},
        concept: domainConceptIdentifier,
        cardinality: [0, 1],
      }, {
        name,
        description: {},
        concept: rangeConceptIdentifier,
        cardinality: [0, 1],
        iri: ActionsTestSuite.generateIriForName(name["en"]),
      }]
    });

    const model: InMemorySemanticModel = models.get(modelDsIdentifier) as InMemorySemanticModel;
    const newAssociation = model.executeOperation(operation) as CreatedEntityOperationResult;

    // Perform additional modifications for which we need to have the class identifier.
    const operations = [];
    const specializations: CmeSpecialization[] = [];
    for (const specialization of specializations) {
      operations.push(createGeneralization({
        parent: specialization.specializationOf.identifier,
        child: newAssociation.id,
        iri: specialization.iri,
      }));
    }
    model.executeOperations(operations);

    return {
      identifier: newAssociation.id,
      model,
    };
  }

  static createNewVisualNodeOfClassProfileForTesting(
    visualModel: WritableVisualModel,
    model: string,
    representedEntity: string,
    profiledClassVisualId: string,
    position?: XY
  ) {
    const profileVisualId = visualModel.addVisualNode({
      representedEntity: representedEntity,
      model,
      content: [],
      visualModels: [],
      position: position !== undefined ? { ...position, anchored: null } : { x: 0, y: 0, anchored: null },
    });

    visualModel.addVisualProfileRelationship({
      model: "",
      waypoints: [],
      visualSource: profileVisualId,
      visualTarget: profiledClassVisualId,
      entity: ""
    })

    return profileVisualId;
  }

  private static currentRepresentedRelationshipIdentifier = 0;
  static createNewVisualRelationshipsForTestingFromSemanticEnds(
    visualModel: WritableVisualModel,
    model: string,
    semanticSourceIdentifier: string,
    semanticTargetIdentifier: string,
    representedRelationshipIdentifier?: string,
  ) {
    const visualSource = visualModel.getVisualEntitiesForRepresented(semanticSourceIdentifier)[0];
    const visualTarget = visualModel.getVisualEntitiesForRepresented(semanticTargetIdentifier)[0];
    if(visualSource === undefined ||
      visualTarget === undefined ||
      !isVisualNode(visualSource) ||
      !isVisualNode(visualTarget)) {
      throw new Error("Failed when creating visual relationship for testing - programmer error");
    }
    const visualId = visualModel.addVisualRelationship({
      model: model,
      representedRelationship: representedRelationshipIdentifier ??
        `r-${ActionsTestSuite.currentRepresentedRelationshipIdentifier++}`,
      waypoints: [{
        x: 0, y: 2,
        anchored: null
      }],
      visualSource: visualSource.identifier,
      visualTarget: visualTarget.identifier,
    });

    return visualId;
  }

  static addTestRelationshipToVisualModel(
    graph: ModelGraphContextType,
    visualModel: WritableVisualModel,
    modelDsIdentifier: string,
    relationshipToTestType: TestedSemanticConnectionType,
    relationshipIdentifier: string,
    visualSources: string[] | null,
    visualTargets: string[] | null,
  ) {
    if (visualSources === null || visualTargets === null) {
      if(relationshipToTestType === TestedSemanticConnectionType.Generalization) {
        addSemanticGeneralizationToVisualModelAction(
          notificationMockup, graph, visualModel,
          relationshipIdentifier, modelDsIdentifier);
      }
      else if(relationshipToTestType === TestedSemanticConnectionType.Association) {
        addSemanticRelationshipToVisualModelAction(
          notificationMockup, graph, visualModel,
          relationshipIdentifier, modelDsIdentifier);
      }
      else if(relationshipToTestType === TestedSemanticConnectionType.AssociationProfile) {
        addSemanticRelationshipProfileToVisualModelAction(
          notificationMockup, graph, visualModel,
          relationshipIdentifier, modelDsIdentifier);
      }

      return;
    }

    const visualSourcesAsEntities = visualSources
      .map(visualSource => visualModel.getVisualEntity(visualSource))
      .filter(entity => entity !== null);

    const visualTargetsAsEntities = visualTargets
      .map(visualTarget => visualModel.getVisualEntity(visualTarget))
      .filter(entity => entity !== null);

    addVisualRelationshipsWithSpecifiedVisualEnds(
      visualModel, modelDsIdentifier, relationshipIdentifier,
      visualSourcesAsEntities, visualTargetsAsEntities);
  }

  static fillVisualModelWithData(
    modelToFillWith: EntityModel,
    visualmodelToFill: WritableVisualModel,
    relationshipToTestType: TestedSemanticConnectionType,
  ) {
    const nodes: string[] = [];
    const edges: string[] = [];
    // First add all nodes
    for(const entity of Object.values(modelToFillWith.getEntities())) {
      if(isSemanticModelClass(entity)) {
        const id = ActionsTestSuite.createNewVisualNodeForTesting(
          visualmodelToFill, modelToFillWith.getId(), entity.id);
        nodes.push(id);
      }
    }

    // Now add all edges since the ends already exist in visual model
    for(const entity of Object.values(modelToFillWith.getEntities())) {
      if(ActionsTestSuite.mapTestedSemanticConnectionToSemanticCheck[relationshipToTestType](entity)) {
        const ends = [];
        if(relationshipToTestType === TestedSemanticConnectionType.Generalization) {
          ends.push((entity as SemanticModelGeneralization).child);
          ends.push((entity as SemanticModelGeneralization).parent);
        }
        else {
          ends.push((entity as SemanticModelRelationship | SemanticModelRelationshipProfile).ends[0].concept);
          ends.push((entity as SemanticModelRelationship | SemanticModelRelationshipProfile).ends[1].concept);
        }
        if(ends[0] === null || ends[1] === null) {
          throw new Error("Failed on test setup");
        }
        const id = ActionsTestSuite.createNewVisualRelationshipsForTestingFromSemanticEnds(
          visualmodelToFill, modelToFillWith.getId(),
          ends[0],
          ends[1],
          entity.id
        );

        edges.push(id);
      }
    }

    return {
      nodes,
      edges
    };
  }

}

export const notificationMockup: UseNotificationServiceWriterType = {
  success: () => { },
  error: () => { },
};
