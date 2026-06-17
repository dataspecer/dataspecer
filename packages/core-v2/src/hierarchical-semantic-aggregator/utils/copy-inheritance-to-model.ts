import { Entity } from "../../entity-model/index.ts";
import { isSemanticModelGeneralization, SemanticModelClass, SemanticModelGeneralization } from "../../semantic-model/concepts/index.ts";
import { InMemorySemanticModel } from "../../semantic-model/in-memory/index.ts";
import { createClass, createGeneralization } from "../../semantic-model/operations/index.ts";

/**
 * Copies classes with their inheritance from the source model to the target model.
 * Starts with {@link fromClassId} and ends with {@link toClassId}. These ids refer to the source model.
 */
export function copyInheritanceToModel(targetSemanticModel: InMemorySemanticModel, sourceSemanticModel: Entity[], fromClassId: string, toClassId: string) {
  const fromClass = sourceSemanticModel.find((e) => e.id === fromClassId) as SemanticModelClass;
  const toClass = sourceSemanticModel.find((e) => e.id === toClassId) as SemanticModelClass;

  if (!fromClass) {
    throw new Error("No fromClass");
  }

  if (!toClass) {
    throw new Error("No toClass");
  }

  // Find all classes which needs to be created or checked in order from most generic to most specific.
  const classesToProcess: string[] = [];

  // DFS that finds a SINGLE (random, if multiple exists) path
  const traverseFunction = (currentClass: SemanticModelClass, path: Set<string> = new Set()): boolean => {
    let success = currentClass.id === toClass.id;

    if (currentClass !== toClass) {
      path.add(currentClass.id as string);
      const thisClassExtends = sourceSemanticModel
        .filter(isSemanticModelGeneralization)
        .filter((g) => g.child === currentClass.id)
        .map((g) => g.parent);
      for (const ext of thisClassExtends) {
        const extClass = sourceSemanticModel.find((e) => e.id === ext) as SemanticModelClass;
        if (!extClass) {
          continue;
        }
        if (path.has(extClass.iri as string)) {
          continue;
        }
        if (traverseFunction(extClass, path)) {
          success = true;
          break;
        }
      }
      path.delete(currentClass.iri as string);
    }

    if (success) {
      classesToProcess.push(currentClass.iri as string);
    }
    return success;
  };

  const success = traverseFunction(fromClass);

  const targetEntities = targetSemanticModel.getEntities();

  // Create each class and fix its extends
  let parentLocalClassInChain: string | null = null; // Patent of the current one but from the local store
  for (const classToProcessId of classesToProcess) {
    const classToProcess = sourceSemanticModel.find((e) => (e as SemanticModelClass).iri === classToProcessId) as SemanticModelClass;

    if (!targetEntities[classToProcess.iri!]) {
      const op = createClass(classToProcess);
      targetSemanticModel.executeOperation(op);
    }

    if (parentLocalClassInChain) {
      const generalization = sourceSemanticModel.find(
        (entity) => isSemanticModelGeneralization(entity) && entity.child === classToProcessId && entity.parent === parentLocalClassInChain,
      ) as SemanticModelGeneralization;
      if (!targetEntities[generalization.id]) {
        const op = createGeneralization(generalization);
        targetSemanticModel.executeOperation(op);
      }
    }

    parentLocalClassInChain = classToProcessId;
  }

  return success;
}
