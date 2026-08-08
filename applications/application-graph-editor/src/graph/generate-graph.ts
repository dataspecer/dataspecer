import {
  FieldKind,
  Operation,
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type ApplicationGraph,
  type ApplicationNode,
} from "@dataspecer/app-generator/graph";
import { addEdge, addNode, connectionEdge, nextNodeId } from "./mutations.ts";

/** The order nodes are generated in, which also orders them inside each class. */
export const SKELETON_OPERATIONS: readonly Operation[] = [
  Operation.ReadList,
  Operation.ReadDetail,
  Operation.Create,
  Operation.Update,
  Operation.Delete,
];

/** The structures owning the pages of one class. */
interface ClassOwners {
  list: AggregateMetadata;
  detail: AggregateMetadata;
  members: AggregateMetadata[];
}

/**
 * Builds a connected graph with one node per class and selected operation:
 * - The aggregate having the most fields is considered the "detail" representation
 * - The aggregate having the least fields is considered the "list" representation
 */
export function skeletonGraph(
  base: ApplicationGraph,
  aggregates: readonly AggregateMetadata[],
  operations: ReadonlySet<Operation>,
): ApplicationGraph {
  let graph: ApplicationGraph = { ...base, nodes: [], edges: [] };
  const owners = classOwners(aggregates);
  const nodesByClass = new Map<string, Map<Operation, ApplicationNode>>();

  for (const aggregate of aggregates) {
    const owner = owners.get(aggregate.classIri);
    if (!owner) {
      continue;
    }
    for (const operation of SKELETON_OPERATIONS) {
      const owning = operation === Operation.ReadList ? owner.list : owner.detail;
      if (owning !== aggregate || !operations.has(operation)) {
        continue;
      }
      const node: ApplicationNode = {
        id: nextNodeId(graph, aggregate.name, operation),
        aggregateIri: aggregate.iri,
        operation,
      };
      let nodes = nodesByClass.get(aggregate.classIri);
      if (!nodes) {
        nodes = new Map();
        nodesByClass.set(aggregate.classIri, nodes);
      }
      nodes.set(operation, node);
      graph = addNode(graph, node);
    }
  }

  const nodeFor = (classIri: string, operation: Operation) =>
    nodesByClass.get(classIri)?.get(operation);
  const linked = new Set<string>();
  const link = (source: ApplicationNode | undefined, target: ApplicationNode | undefined) => {
    if (!source || !target || linked.has(`${source.id}>${target.id}`)) {
      return;
    }
    linked.add(`${source.id}>${target.id}`);
    graph = addEdge(graph, connectionEdge(graph, source, target));
  };

  // the page flow of one class
  for (const classIri of owners.keys()) {
    const list = nodeFor(classIri, Operation.ReadList);
    const detail = nodeFor(classIri, Operation.ReadDetail);
    const create = nodeFor(classIri, Operation.Create);
    link(list, detail);
    link(list, create);
    link(detail, nodeFor(classIri, Operation.Update));
    link(detail, nodeFor(classIri, Operation.Delete));
    link(create, detail);
    link(nodeFor(classIri, Operation.Update), detail);
    link(nodeFor(classIri, Operation.Delete), list);
  }

  // association links as the validator accepts them, so a list sees only its top level associations, a detail also the
  // nested ones
  for (const [sourceClass, sourceOwners] of owners) {
    for (const [targetClass, targetOwners] of owners) {
      if (sourceClass === targetClass) {
        continue;
      }
      const targetDetail = nodeFor(targetClass, Operation.ReadDetail);
      if (!targetDetail) {
        continue;
      }
      const list = nodeFor(sourceClass, Operation.ReadList);
      if (list && hasAssociationToClass(sourceOwners.list.fields, targetOwners, false)) {
        link(list, targetDetail);
      }
      const detail = nodeFor(sourceClass, Operation.ReadDetail);
      if (detail && hasAssociationToClass(sourceOwners.detail.fields, targetOwners, true)) {
        link(detail, targetDetail);
      }
    }
  }

  return graph;
}

function classOwners(aggregates: readonly AggregateMetadata[]): Map<string, ClassOwners> {
  const byClass = new Map<string, AggregateMetadata[]>();
  for (const aggregate of aggregates) {
    const members = byClass.get(aggregate.classIri);
    if (members) {
      members.push(aggregate);
    } else {
      byClass.set(aggregate.classIri, [aggregate]);
    }
  }

  const owners = new Map<string, ClassOwners>();
  for (const [classIri, members] of byClass) {
    let detail = members[0];
    for (const member of members) {
      if (fieldCount(member.fields) > fieldCount(detail.fields)) {
        detail = member;
      }
    }
    let list = detail;
    for (const member of members) {
      if (member !== detail && (list === detail || fieldCount(member.fields) < fieldCount(list.fields))) {
        list = member;
      }
    }
    owners.set(classIri, { list, detail, members });
  }
  return owners;
}

function fieldCount(fields: readonly AggregateFieldMetadata[]): number {
  return fields.reduce(
    (sum, field) => sum + 1 + (field.fields ? fieldCount(field.fields) : 0),
    0,
  );
}

/** Whether the fields reference the class, by its IRI or by any of its structures. */
function hasAssociationToClass(
  fields: readonly AggregateFieldMetadata[],
  target: ClassOwners,
  recursive: boolean,
): boolean {
  return fields.some(
    (field) =>
      (field.kind === FieldKind.Association &&
        (field.targetClassIri === target.detail.classIri ||
          target.members.some((member) => member.iri === field.targetAggregateIri))) ||
      (recursive && field.fields ? hasAssociationToClass(field.fields, target, recursive) : false),
  );
}
