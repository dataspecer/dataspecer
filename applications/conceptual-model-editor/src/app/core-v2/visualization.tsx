import ReactFlow, {
    Background,
    Connection,
    Controls,
    Edge,
    EdgeChange,
    MiniMap,
    Node,
    NodeChange,
    Panel,
    Position,
    useEdgesState,
    useNodesState,
} from "reactflow";
import { useMemo, useCallback, useEffect } from "react";
import { ClassCustomNode, semanticModelClassToReactFlowNode } from "./reactflow/class-custom-node";
import {
    SimpleFloatingEdge,
    semanticModelClassUsageToReactFlowEdge,
    semanticModelGeneralizationToReactFlowEdge,
    semanticModelRelationshipToReactFlowEdge,
} from "./reactflow/simple-floating-edge";
import { isAttribute } from "./util/utils";
import { tailwindColorToHex } from "../utils/color-utils";

import "reactflow/dist/style.css";
import { useCreateConnectionDialog } from "./dialog/create-connection-dialog";
import { useModelGraphContext } from "./context/model-context";
import {
    SemanticModelClass,
    SemanticModelGeneralization,
    SemanticModelRelationship,
    isSemanticModelAttribute,
    isSemanticModelClass,
    isSemanticModelGeneralization,
    isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { Entity } from "@dataspecer/core-v2/entity-model";
import { useClassesContext } from "./context/classes-context";
import { VisualEntity } from "@dataspecer/core-v2/visual-model";

import { useEntityDetailDialog } from "./dialog/entity-detail-dialog";
import { useModifyEntityDialog } from "./dialog/modify-entity-dialog";
import { AggregatedEntityWrapper } from "@dataspecer/core-v2/semantic-model/aggregator";
import {
    SemanticModelClassUsage,
    SemanticModelRelationshipUsage,
    isSemanticModelClassUsage,
    isSemanticModelRelationshipUsage,
} from "@dataspecer/core-v2/semantic-model/usage/concepts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { useCreateClassDialog } from "./dialog/create-class-dialog";
import { useCreateProfileDialog } from "./dialog/create-profile-dialog";
import { getDomainAndRange } from "@dataspecer/core-v2/semantic-model/relationship-utils";

export const Visualization = () => {
    const { aggregatorView, models } = useModelGraphContext();
    const { CreateConnectionDialog, isCreateConnectionDialogOpen, openCreateConnectionDialog } =
        useCreateConnectionDialog();
    const { EntityDetailDialog, isEntityDetailDialogOpen, openEntityDetailDialog } = useEntityDetailDialog();
    const { ModifyEntityDialog, isModifyEntityDialogOpen, openModifyEntityDialog } = useModifyEntityDialog();
    const { CreateClassDialog, isCreateClassDialogOpen, openCreateClassDialog } = useCreateClassDialog();
    const { CreateProfileDialog, isCreateProfileDialogOpen, openCreateProfileDialog } = useCreateProfileDialog();

    const { classes, classes2, relationships, /* attributes, */ generalizations, profiles, sourceModelOfEntityMap } =
        useClassesContext();

    const activeVisualModel = useMemo(() => aggregatorView.getActiveVisualModel(), [aggregatorView]);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const nodeTypes = useMemo(() => ({ classCustomNode: ClassCustomNode }), []);
    const edgeTypes = useMemo(() => ({ floating: SimpleFloatingEdge }), []);

    const onConnect = useCallback(
        (connection: Connection) => {
            openCreateConnectionDialog(connection);
        },
        [setEdges]
    );

    const relationshipOrGeneralizationToEdgeType = (
        entity: Entity | null,
        color: string | undefined,
        openEntityDetailDialog: () => void
    ): Edge | undefined => {
        if (isSemanticModelRelationshipUsage(entity)) {
            const usageNotes = entity.usageNote ? [entity.usageNote] : [];
            return semanticModelRelationshipToReactFlowEdge(entity, color, usageNotes, openEntityDetailDialog) as Edge;
        } else if (isSemanticModelRelationship(entity)) {
            return semanticModelRelationshipToReactFlowEdge(entity, color, [], openEntityDetailDialog) as Edge;
        } else if (isSemanticModelGeneralization(entity)) {
            return semanticModelGeneralizationToReactFlowEdge(entity, color, openEntityDetailDialog) as Edge;
        }
        return;
    };
    const classUsageToEdgeType = (entity: SemanticModelClassUsage, color: string | undefined): Edge => {
        const res = semanticModelClassUsageToReactFlowEdge(entity, color, () => openEntityDetailDialog(entity));
        return res;
    };

    const rerenderEverythingOnCanvas = () => {
        const modelId = [...models.keys()].at(0);
        if (!modelId) {
            return;
        }
        activeVisualModel?.setColor(modelId, activeVisualModel.getColor(modelId)!); // fixme: jak lip vyvolat change na vsech entitach? 😅
    };

    useEffect(() => {
        const aggregatorCallback = (updated: AggregatedEntityWrapper[], removed: string[]) => {
            console.log("callToUnsubscribe2 u&r:", updated, removed);

            const localActiveVisualModel = aggregatorView.getActiveVisualModel();
            const entities = aggregatorView.getEntities();
            const [localRelationships, localGeneralizations, localModels] = [relationships, generalizations, models];
            let [localAttributes] = [relationships.filter(isSemanticModelAttribute)];
            let [localAttributeProfiles] = [profiles.filter(isSemanticModelRelationshipUsage).filter(isAttribute)];

            const getNode = (cls: SemanticModelClass | SemanticModelClassUsage, visualEntity: VisualEntity | null) => {
                if (!visualEntity) {
                    return;
                }
                const pos = visualEntity.position;
                const visible = visualEntity.visible;
                if (!cls || !pos) {
                    return;
                }
                if (!visible) {
                    return "hide-it!";
                }
                let originModelId = sourceModelOfEntityMap.get(cls.id); // ocalClasses.get(cls.id)?.origin;

                if (!originModelId) {
                    // just try to find the model directly
                    const modelId = [...localModels.values()]
                        .find((m) => {
                            const c = m.getEntities()[cls.id];
                            if (c) return true;
                        })
                        ?.getId();
                    if (modelId) {
                        originModelId = modelId;
                    }
                }
                const sourceModel = [models.get(originModelId ?? "")].find(
                    (m): m is InMemorySemanticModel => m instanceof InMemorySemanticModel
                );

                const attributes = localAttributes
                    .filter(isSemanticModelAttribute)
                    .filter((attr) => getDomainAndRange(attr)?.range.concept == cls.id);
                const attributeProfiles = localAttributeProfiles
                    .filter(isSemanticModelRelationshipUsage)
                    .filter(isAttribute)
                    .filter((attr) => attr.ends[0]?.concept == cls.id && !attr.ends[1]?.concept);

                return semanticModelClassToReactFlowNode(
                    cls.id,
                    cls,
                    pos,
                    originModelId ? localActiveVisualModel?.getColor(originModelId) : "#ffaa66", // colorForModel.get(UNKNOWN_MODEL_ID),
                    attributes,
                    () => openEntityDetailDialog(cls),
                    () => openModifyEntityDialog(cls, sourceModel ?? null),
                    () => openCreateProfileDialog(cls),
                    attributeProfiles
                );
            };

            const getEdge = (
                relOrGen: SemanticModelRelationship | SemanticModelGeneralization | SemanticModelRelationshipUsage,
                color: string | undefined
            ) => {
                return relationshipOrGeneralizationToEdgeType(relOrGen, color, () => openEntityDetailDialog(relOrGen));
            };

            if (removed.length > 0) {
                // --- removed entities --- --- ---
                const [affectedNodeIds, nodesAffectedByAttributeRemovals] = localAttributes
                    .filter((a) => removed.includes(a.id))
                    .map((a) => {
                        const aggregatedEntityOfAttributesNode =
                            entities[a.ends[0]?.concept ?? ""]?.aggregatedEntity ?? null;
                        const visualEntityOfAttributesNode =
                            entities[aggregatedEntityOfAttributesNode?.id ?? ""]?.visualEntity;
                        localAttributes = localAttributes.filter((la) => la.id != a.id);

                        if (
                            isSemanticModelClass(aggregatedEntityOfAttributesNode) ||
                            isSemanticModelClassUsage(aggregatedEntityOfAttributesNode)
                        ) {
                            const n = getNode(aggregatedEntityOfAttributesNode, visualEntityOfAttributesNode ?? null);
                            if (n && n != "hide-it!") {
                                return [n.id, n];
                            }
                        }
                        return null;
                    })
                    .filter((n): n is [string, Node] => n != null)
                    .reduce(
                        ([ids, nodes], curr) => {
                            return [ids.add(curr[0]), nodes.concat(curr[1])];
                        },
                        [new Set<string>(), [] as Node[]]
                    );
                setNodes((n) =>
                    n
                        .filter((v) => !removed.includes(v.id) && !affectedNodeIds.has(v.id))
                        .concat(nodesAffectedByAttributeRemovals)
                );
                console.log(removed, affectedNodeIds, nodesAffectedByAttributeRemovals);
            }

            for (const { id, aggregatedEntity: entity, visualEntity: ve } of updated) {
                const visualEntity = ve ?? entities[id]?.visualEntity ?? null; // FIXME: tohle je debilni, v updated by uz mohla behat visual informace
                if (isSemanticModelClass(entity) || isSemanticModelClassUsage(entity)) {
                    const n = getNode(entity, visualEntity);
                    if (n == "hide-it!") {
                        // console.log("hiding node", n);
                        setNodes((prev) => prev.filter((node) => node.data.cls.id !== id));
                    } else if (n) {
                        // console.log("adding node", n);
                        setNodes((prev) => prev.filter((n) => n.data.cls.id !== id).concat(n));
                    }
                } else if (
                    isSemanticModelRelationship(entity) ||
                    isSemanticModelGeneralization(entity) ||
                    isSemanticModelRelationshipUsage(entity)
                ) {
                    if (
                        (isSemanticModelRelationship(entity) || isSemanticModelRelationshipUsage(entity)) &&
                        (isSemanticModelAttribute(entity) || isAttribute(entity))
                    ) {
                        // it is an attribute, rerender the node that the attribute comes form
                        const rangeOfAttribute = isSemanticModelAttribute(entity)
                            ? getDomainAndRange(entity)?.range.concept
                            : null;
                        const aggrEntityOfAttributesNode =
                            entities[rangeOfAttribute ?? entity.ends[0]?.concept ?? ""]?.aggregatedEntity ?? null;
                        // console.log("entity is attribute", entity, rangeOfAttribute, aggrEntityOfAttributesNode);

                        if (
                            isSemanticModelClass(aggrEntityOfAttributesNode) ||
                            isSemanticModelClassUsage(aggrEntityOfAttributesNode)
                        ) {
                            // TODO: omg, localAttributes jeste v sobe nemaj ten novej atribut, tak ho se musim jeste pridat 🤦
                            if (isSemanticModelRelationship(entity)) {
                                // remove the existing version of attribute, use this updated one
                                localAttributes = localAttributes.filter((v) => v.id != entity.id).concat(entity);
                            } else {
                                // remove the existing version of attribute, use this updated one
                                localAttributeProfiles = localAttributeProfiles
                                    .filter((v) => v.id != entity.id)
                                    .concat(entity);
                            }
                            // localAttributes.push(entity as SemanticModelRelationship);
                            const visEntityOfAttributesNode = entities[aggrEntityOfAttributesNode.id]?.visualEntity;
                            const n = getNode(aggrEntityOfAttributesNode, visEntityOfAttributesNode ?? null);
                            if (n && n != "hide-it!") {
                                console.log("adding node due to attribute", n);
                                setNodes((prev) => prev.filter((n) => n.data.cls.id !== id).concat(n));
                            }
                        } else {
                            console.log(
                                "callback2: something weird",
                                aggrEntityOfAttributesNode,
                                entity,
                                entities[aggrEntityOfAttributesNode?.id ?? ""]
                            );
                        }
                        continue;
                    }
                } else {
                    console.error("callback2 unknown entity type", id, entity, visualEntity);
                    //throw new Error("unknown entity type"); // todo: throws if there is a visual entity without semantic entity
                }
            }

            const rerenderAllEdges = () => {
                const es = [
                    ...localRelationships,
                    ...localGeneralizations,
                    ...profiles.filter(isSemanticModelRelationshipUsage),
                ]
                    .map((relOrGen) =>
                        getEdge(
                            relOrGen,
                            localActiveVisualModel?.getColor(
                                sourceModelOfEntityMap.get(relOrGen.id) ?? "some random model id that doesn't exist"
                            )
                        )
                    )
                    .filter((e): e is Edge => {
                        return e?.id != undefined;
                    })
                    .concat(
                        [...profiles].filter(isSemanticModelClassUsage).map((u) =>
                            classUsageToEdgeType(
                                u,
                                localActiveVisualModel?.getColor(
                                    // sourceModelOfEntity(relOrGen.id, localModelsAsAnArray)?.getId()
                                    sourceModelOfEntityMap.get(u.id) ?? "some random model id that doesn't exist"
                                    // relOrGenToModel.get(u.id)!)
                                )
                            )
                        )
                    );

                setEdges(es);
            };
            rerenderAllEdges();
        };

        const callToUnsubscribe2 = aggregatorView.subscribeToChanges(aggregatorCallback);
        const callToUnsubscribe3 = aggregatorView
            .getActiveVisualModel()
            ?.subscribeToChanges((updated: Record<string, VisualEntity>, removed: string[]) => {
                console.log("callToUnsubscribe3 u&r:", updated, removed);
                const entities = aggregatorView.getEntities();
                const updatedAsAggrEntityWrappers = Object.entries(updated).map(
                    ([uId, visualEntity]) =>
                        ({
                            id: visualEntity.sourceEntityId,
                            aggregatedEntity: entities[visualEntity.sourceEntityId]?.aggregatedEntity ?? null,
                            visualEntity: visualEntity,
                        } as AggregatedEntityWrapper)
                );
                aggregatorCallback(updatedAsAggrEntityWrappers, removed);
            });

        aggregatorCallback([], []);

        return () => {
            callToUnsubscribe2?.();
            // callToUnsubscribe3?.();
        };
    }, [aggregatorView, classes /* changed when new view is used */]);

    useEffect(() => {
        console.log("visualization: active visual model changed", activeVisualModel);
        setNodes([]);
        setEdges([]);
        rerenderEverythingOnCanvas();
    }, [activeVisualModel]);

    const handleNodeChanges = (changes: NodeChange[]) => {
        for (const change of changes) {
            if (change.type == "position") {
                // FIXME: maybe optimize so that it doesn't update every pixel
                change.positionAbsolute &&
                    activeVisualModel?.updateEntity(change.id, { position: change.positionAbsolute });
            }
        }
    };

    return (
        <>
            {isCreateConnectionDialogOpen && <CreateConnectionDialog />}
            {isEntityDetailDialogOpen && <EntityDetailDialog />}
            {isModifyEntityDialogOpen && <ModifyEntityDialog />}
            {isCreateClassDialogOpen && <CreateClassDialog />}
            {isCreateProfileDialogOpen && <CreateProfileDialog />}

            <div className="h-full w-full">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={(changes: NodeChange[]) => {
                        onNodesChange(changes);
                        handleNodeChanges(changes);
                    }}
                    onEdgesChange={(changes: EdgeChange[]) => {
                        onEdgesChange(changes);
                    }}
                    onConnect={onConnect}
                    snapGrid={[20, 20]}
                    snapToGrid={true}
                    onPaneClick={(e) => {
                        if (e.altKey) {
                            console.log(e);
                            openCreateClassDialog(undefined, { x: e.nativeEvent.layerX, y: e.nativeEvent.layerY });
                        }
                    }}
                >
                    <Controls />
                    <MiniMap
                        nodeColor={miniMapNodeColor}
                        style={{ borderStyle: "solid", borderColor: "#5438dc", borderWidth: "2px" }}
                    />
                    <Panel position="top-right">
                        <div className="flex flex-col">
                            <div className="cursor-help" title="add class to canvas by clicking and holding `alt`">
                                ℹ
                            </div>
                        </div>
                    </Panel>
                    <Background gap={12} size={1} />
                </ReactFlow>
            </div>
        </>
    );
};

const miniMapNodeColor = (node: Node) => {
    return tailwindColorToHex(node.data?.color);
};
