import type { Entity } from "@dataspecer/core-v2";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, VISUAL_MODEL, RDFS_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import type { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { createUpdateEntityOperation, type OperationInModel } from "@dataspecer/core/operation";
import { createWritableInMemoryProfileModel, isSemanticModelClassProfile, isSemanticModelRelationshipProfile, SemanticProfileModelOperations } from "@dataspecer/profile-model";
import { createCreateModelOperation, createCreateProjectOperation, createRemoveModelOperation, type ProjectModelEntity } from "@dataspecer/project-model";
import { ModelCompositionConfigurationApplicationProfile, type ModelCompositionConfigurationMerge } from "@dataspecer/specification/model-hierarchy";
import { createStructureProfile } from "@dataspecer/structure-model/profile";
import { createSetLabelOperation } from "@dataspecer/visual-model";
import { type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import configuration from "../configuration.ts";
import { modelRepository } from "../main.ts";
import { PROJECT_MODEL_ID } from "../models/model-id.ts";
import { diffModelEntitiesToOperations } from "../models/model-operations.ts";
import { deserializeModelEntities } from "../models/model-types.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import { importFromUrl } from "./import.ts";
import { PimStoreWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import { isSemanticModelClass, isSemanticModelRelationship, type SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";

/**
 * Creates a new application profile by importing specifications and setting up
 * semantic and visual models.
 *
 * todo: This function depends on the knowledge how to perform import and conceptual and structural profiling.
 */
export const newApplicationProfile = asyncHandler(async (request: Request, response: Response) => {
  const querySchema = z.object({
    // Parent package IRI where the profile will be created
    parentIri: z.string().min(1),
  });

  const bodySchema = z.object({
    // List of specifications that should be profiled
    specifications: z
      .array(
        z.object({
          url: z.url(),
        }),
      )
      .min(1),

    // Whether to automatically profile everything
    autoProfile: z.boolean().optional().default(true),

    label: z.string().optional(),
    description: z.string().optional(),

    baseIri: z.url().min(1),
  });

  const query = querySchema.parse(request.query);
  const body = bodySchema.parse(request.body);

  try {
    const packageIri = uuidv4();
    const semanticModelIri = packageIri + "/semantic-model";
    const viewIri = packageIri + "/visual-model";

    // A package created directly under a root is a project with its own
    // history, otherwise it is a model of the project it is created in.
    const isProject = (await modelRepository.getRootResources()).some((root) => root.iri === query.parentIri);
    const projectIri = isProject ? packageIri : await modelRepository.getProjectIri(query.parentIri);
    if (projectIri === null) {
      throw new Error(`Parent package "${query.parentIri}" was not found.`);
    }

    // Create package. The models are created later, once their content is
    // known. Only the project root can be expressed by the create project
    // operation, other roots are addressed as an ordinary parent package.
    const createPackage =
      query.parentIri === configuration.localRootIri ? createCreateProjectOperation(packageIri) : createCreateModelOperation(query.parentIri, LOCAL_PACKAGE, packageIri);
    createPackage.label = body.label ? { en: body.label } : {};
    createPackage.description = body.description ? { en: body.description } : {};
    await modelRepository.applyTransactions(projectIri, [{ id: uuidv4(), operations: [{ modelId: PROJECT_MODEL_ID, operation: createPackage }] }]);

    // Import resources from all specification URLs
    const importResults = [];
    for (const specification of body.specifications) {
      try {
        const [importedResource, entities] = await importFromUrl(packageIri, specification.url);
        importResults.push({ success: true, importedResource, entities });
      } catch (error) {
        importResults.push({ success: false, error });
        console.error(error);
      }
    }

    // Check if all imports were successful
    if (!importResults.every((r) => r.success)) {
      await modelRepository.applyTransactions(projectIri, [
        { id: uuidv4(), operations: [{ modelId: PROJECT_MODEL_ID, operation: createRemoveModelOperation(packageIri) }] },
      ]);
      response.status(400).json({
        error: "Failed to import one or more specifications",
        details: importResults.filter((r) => !r.success).map((r) => r.error?.toString()),
      });
      return;
    }

    // Get a label from the first imported resource
    let profileLabel = body.label;
    if (!profileLabel && importResults.length > 0 && importResults[0].importedResource) {
      const metadata = importResults[0].importedResource.userMetadata;
      profileLabel = "Profile of " + (metadata?.label?.en || metadata?.label?.cs || "specification");
    }

    // Now we want the auto profiling functionality
    let profiledEntities: Record<string, Entity> = {};
    if (body.autoProfile) {
      // We need to inspect all sub-packages and read semantic models from them
      const entitiesToProfile: Entity[] = [];
      const otherEntities: Entity[] = [];
      for (const importedPackage of importResults) {
        const thisSpecificationEntities: Entity[] = [];
        if (importedPackage.importedResource) {
          const pckg = await modelRepository.getPackage(importedPackage.importedResource!.iri);
          for (const subResource of pckg!.subResources) {
            if (subResource.types.includes(LOCAL_SEMANTIC_MODEL)) {
              const subModelJson = await modelRepository.getResourceStoreJson(subResource.iri);
              if (subModelJson.entities) {
                thisSpecificationEntities.push(...Object.values(subModelJson.entities as Record<string, Entity>));
              }
            } else if (subResource.types.includes(RDFS_MODEL)) {
              const subModelJson = await modelRepository.getResourceStoreJson(subResource.iri);
              const model = new PimStoreWrapper(subModelJson.pimStore, subModelJson.id, "", subModelJson.urls);
              model.fetchFromPimStore();
              otherEntities.push(...Object.values(model.getEntities()));
            }
          }
        } else {
          // We imported single model
          thisSpecificationEntities.push(...importedPackage.entities!);
        }

        // Since there might be specifications that mix vocabulary and profiles,
        // we need to filter out all vocabulary entities as they are already
        // profiled.
        if (thisSpecificationEntities.some((e) => isSemanticModelClassProfile(e) || isSemanticModelRelationshipProfile(e))) {
          entitiesToProfile.push(...thisSpecificationEntities.filter((e) => isSemanticModelClassProfile(e) || isSemanticModelRelationshipProfile(e)));
        } else {
          entitiesToProfile.push(...thisSpecificationEntities);
        }

        // We need to include classes that are referenced by the resources that are being profiled
        const otherClasses: Record<string, SemanticModelClass> = {};
        for (const entity of otherEntities) {
          if (isSemanticModelClass(entity)) {
            otherClasses[entity.iri ?? entity.id] = entity;
          }
        }

        const alreadyProfiledClasses = new Set<string>(entitiesToProfile.filter(isSemanticModelClass).map((e) =>  e.iri ?? e.id));
        for (const entity of entitiesToProfile) {
          if (isSemanticModelRelationship(entity)) {
            for (const end of entity.ends) {
              if (!alreadyProfiledClasses.has(end.concept ?? "")) {
                const cls = otherClasses[end.concept ?? ""];
                if (cls) {
                  entitiesToProfile.push(cls);
                  alreadyProfiledClasses.add(cls.iri ?? cls.id);
                }
              }
            }
          }
        }
      }

      const profileModel = createWritableInMemoryProfileModel({
        identifier: semanticModelIri,
        baseIri: body.baseIri,
      });

      await SemanticProfileModelOperations.profileEntities(
        {
          targetModel: profileModel,
        },
        {
          entities: entitiesToProfile,
        },
      );

      profiledEntities = profileModel.getEntities();
    }

    // Everything created from here on is known upfront, so it is created by a
    // single transaction: the models of the profile together with their content.
    const operations: OperationInModel[] = [];

    const createSemanticModel = createCreateModelOperation(packageIri, LOCAL_SEMANTIC_MODEL, semanticModelIri);
    createSemanticModel.label = { en: profileLabel || "Profile" };
    createSemanticModel.description = { en: "Semantic model for the profile" };
    operations.push({ modelId: PROJECT_MODEL_ID, operation: createSemanticModel });
    operations.push(
      ...diffModelEntitiesToOperations(semanticModelIri, LOCAL_SEMANTIC_MODEL, {}, {
        // A semantic model describes itself by its main entity.
        [semanticModelIri]: { id: semanticModelIri, type: [LOCAL_SEMANTIC_MODEL], modelAlias: profileLabel || "Profile", baseIri: body.baseIri },
        ...profiledEntities,
      } as EntityRecord),
    );

    const createVisualModel = createCreateModelOperation(packageIri, VISUAL_MODEL, viewIri);
    createVisualModel.label = { en: "View for " + (profileLabel || "Profile") };
    createVisualModel.description = { en: "Visual model for the profile" };
    operations.push({ modelId: PROJECT_MODEL_ID, operation: createVisualModel });
    operations.push({ modelId: viewIri, operation: createSetLabelOperation({ en: "Main view" }) });

    // Update package metadata with the final label
    const updatePackage: Partial<ProjectModelEntity> & Pick<Entity, "id"> = {
      id: packageIri,
      label: { en: profileLabel || "Profile" },
      description: body.description ? { en: body.description } : {},
    };
    operations.push({ modelId: PROJECT_MODEL_ID, operation: createUpdateEntityOperation(updatePackage) });

    /**
     * Now we profile structure models from all imported specifications.
     *
     * @todo Technically, we may not want to profile all of them since some of
     * them may be ok and we just want to reference them. The same applies to
     * conceptual models. This needs to be analyzed more thoroughly.
     */
    if (body.autoProfile) {
      // We need to prepare the function that can get the reverse mapping
      const lookup = new Map<string, string>();
      for (const [profiledIri, entity] of Object.entries(profiledEntities)) {
        if (isSemanticModelClassProfile(entity)) {
          entity.profiling.forEach((id) => lookup.set(id, profiledIri));
        }
        if (isSemanticModelRelationshipProfile(entity)) {
          entity.ends.forEach((end) => {
            end.profiling.forEach((id) => lookup.set(id, profiledIri));
          });
        }
      }
      const getByProfiling = (externalEntityIri: string): string | null => {
        return lookup.get(externalEntityIri) || null;
      };

      // Old IRI to new IRI mapping
      const iriMapping: Record<string, string> = {};

      // Structure models from all packages to be profiled
      const collectedStructureModels: CoreResource[][] = [];

      for (const importedPackage of importResults) {
        if (!importedPackage.importedResource) continue;
        const pckg = await modelRepository.getPackage(importedPackage.importedResource!.iri);
        for (const subResource of pckg!.subResources) {
          if (!subResource.types.includes(V1.PSM)) continue;
          const subModelJson = await modelRepository.getResourceStoreJson(subResource.iri);

          if (subModelJson.resources) {
            const model = Object.values(subModelJson.resources) as CoreResource[];
            collectedStructureModels.push(model);
            // Have nicer IRIs for the model
            iriMapping[subResource.iri] = uuidv4();
          }
        }
      }

      const result = await createStructureProfile(collectedStructureModels, getByProfiling, {
        newIriMapping: iriMapping,
      });

      // Now, we need to store each structure model as a separate resource
      // IRIs of schemas must match the IRIs of the model
      for (const newStructure of result) {
        const schema = newStructure.find(DataPsmSchema.is)!;

        const createStructureModel = createCreateModelOperation(packageIri, V1.PSM, schema.iri!);
        createStructureModel.label = schema.dataPsmHumanLabel ?? undefined;
        createStructureModel.description = schema.dataPsmHumanDescription ?? undefined;
        operations.push({ modelId: PROJECT_MODEL_ID, operation: createStructureModel });

        const entities = deserializeModelEntities(schema.iri!, V1.PSM, {
          operations: [],
          resources: Object.fromEntries(newStructure.map((r) => [r.iri!, r])),
        });
        operations.push(...diffModelEntitiesToOperations(schema.iri!, V1.PSM, {}, entities));
      }
    }

    // The package itself holds the composition of the models it contains.
    const updatePackageContent = {
      id: packageIri,
      modelCompositionConfiguration: {
        modelType: "application-profile",
        model: semanticModelIri,
        profiles: {
          modelType: "merge",
          models: null,
        } satisfies ModelCompositionConfigurationMerge as ModelCompositionConfigurationMerge,
        canAddEntities: true,
        canModify: true,
      } satisfies ModelCompositionConfigurationApplicationProfile,
    } as Partial<Entity> & Pick<Entity, "id">;
    operations.push({ modelId: packageIri, operation: createUpdateEntityOperation(updatePackageContent) });

    await modelRepository.applyTransactions(projectIri, [{ id: uuidv4(), operations }]);

    // Return the created profile information
    response.json({
      packageIri,
      viewIri,
      semanticModelIri,
      label: profileLabel || "Profile",
    });
  } catch (error) {
    console.error("Error creating application profile:", error);
    response.status(500).json({ error: "Failed to create application profile" });
  }
});
