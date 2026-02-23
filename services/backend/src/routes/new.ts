import type { Entity } from "@dataspecer/core-v2";
import { LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import type { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { createWritableInMemoryProfileModel, isSemanticModelClassProfile, isSemanticModelRelationshipProfile, SemanticProfileModelOperations } from "@dataspecer/profile-model";
import { ModelCompositionConfigurationApplicationProfile, type ModelCompositionConfigurationMerge } from "@dataspecer/specification/model-hierarchy";
import { createStructureProfile } from "@dataspecer/structure-model/profile";
import { type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import { importFromUrl } from "./import.ts";

/**
 * Creates a new application profile by importing specifications and setting up
 * semantic and visual models.
 *
 * todo: This depends directly on the resource model. Should use some abstraction layer for that.
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
          url: z.string().url(),
        }),
      )
      .min(1),

    // Whether to automatically profile everything
    autoProfile: z.boolean().optional().default(true),

    label: z.string().optional(),
    description: z.string().optional(),

    baseIri: z.string().url().min(1),
  });

  const query = querySchema.parse(request.query);
  const body = bodySchema.parse(request.body);

  try {
    // Create package
    const packageIri = query.parentIri + "/" + uuidv4();
    await resourceModel.createPackage(query.parentIri, packageIri, {
      label: body.label ? { en: body.label } : {},
      description: body.description ? { en: body.description } : {},
    });
    const packageModel = await resourceModel.getOrCreateResourceModelStore(packageIri);
    await packageModel.setJson({});

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
      await resourceModel.deleteResource(packageIri);
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

    // Create semantic model
    await resourceModel.createResource(packageIri, packageIri + "/semantic-model", LOCAL_SEMANTIC_MODEL, {
      label: { en: profileLabel || "Profile" },
      description: { en: "Semantic model for the profile" },
      baseIri: body.baseIri,
    });
    const semanticModel = await resourceModel.getOrCreateResourceModelStore(packageIri + "/semantic-model");

    // Now we want the auto profiling functionality
    let profiledEntities: Record<string, Entity> = {};
    if (body.autoProfile) {
      // We need to inspect all sub-packages and read semantic models from them
      const entitiesToProfile: Entity[] = [];
      for (const importedPackage of importResults) {
        const pckg = await resourceModel.getPackage(importedPackage.importedResource!.iri);
        const thisSpecificationEntities: Entity[] = [];
        for (const subResource of pckg!.subResources) {
          if (!subResource.types.includes(LOCAL_SEMANTIC_MODEL)) continue; // todo so far we expect that semantic models are "local" and not imported
          const subModel = await resourceModel.getOrCreateResourceModelStore(subResource.iri);
          const subModelJson = await subModel.getJson();
          if (subModelJson.entities) {
            thisSpecificationEntities.push(...Object.values(subModelJson.entities as Record<string, Entity>));
          }
        }

        // Since there might be specifications that mix vocabulary and profiles,
        // we need to filter out all vocabulary entities as they are already
        // profiled.
        if (thisSpecificationEntities.some((e) => isSemanticModelClassProfile(e) || isSemanticModelRelationshipProfile(e))) {
          entitiesToProfile.push(...thisSpecificationEntities.filter((e) => isSemanticModelClassProfile(e) || isSemanticModelRelationshipProfile(e)));
        } else {
          entitiesToProfile.push(...thisSpecificationEntities);
        }
      }

      const profileModel = createWritableInMemoryProfileModel({
        identifier: packageIri + "/semantic-model",
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
    await semanticModel.setJson({
      type: "http://dataspecer.com/resources/local/semantic-model",
      modelId: packageIri + "/semantic-model",
      modelAlias: profileLabel || "Profile",
      baseIri: body.baseIri,
      entities: profiledEntities,
    });

    // Create visual model
    const viewIri = packageIri + "/visual-model";
    await resourceModel.createResource(packageIri, viewIri, LOCAL_VISUAL_MODEL, {
      label: { en: "View for " + (profileLabel || "Profile") },
      description: { en: "Visual model for the profile" },
    });
    const visualModel = await resourceModel.getOrCreateResourceModelStore(viewIri);
    await visualModel.setJson({
      type: "http://dataspecer.com/resources/local/visual-model",
      modelId: viewIri,
      visualEntities: {},
      modelColors: {
        vhfk9: "#ffd670",
      },
    });

    // Update package metadata with the final label
    await resourceModel.updateResourceMetadata(packageIri, {
      label: { en: profileLabel || "Profile" },
      description: body.description ? { en: body.description } : {},
    });

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
        const pckg = await resourceModel.getPackage(importedPackage.importedResource!.iri);
        for (const subResource of pckg!.subResources) {
          if (!subResource.types.includes(V1.PSM)) continue;
          const subModel = await resourceModel.getOrCreateResourceModelStore(subResource.iri);
          const subModelJson = await subModel.getJson();

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

        await resourceModel.createResource(packageIri, schema.iri!, V1.PSM, {
          label: schema.dataPsmHumanLabel,
          description: schema.dataPsmHumanDescription,
        });
        const model = await resourceModel.getOrCreateResourceModelStore(schema.iri!);
        model.setJson({
          operations: [],
          resources: Object.fromEntries(newStructure.map((r) => [r.iri!, r])),
        });
      }
    }

    await packageModel.setJson({
      modelCompositionConfiguration: {
        modelType: "application-profile",
        model: packageIri + "/semantic-model",
        profiles: {
          modelType: "merge",
          models: null,
        } satisfies ModelCompositionConfigurationMerge as ModelCompositionConfigurationMerge,
        canAddEntities: true,
        canModify: true,
      } satisfies ModelCompositionConfigurationApplicationProfile,
    });

    // Return the created profile information
    response.json({
      packageIri,
      viewIri,
      semanticModelIri: packageIri + "/semantic-model",
      label: profileLabel || "Profile",
    });
  } catch (error) {
    console.error("Error creating application profile:", error);
    response.status(500).json({ error: "Failed to create application profile" });
  }
});
