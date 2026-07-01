import { prismaClient, resourceModel } from "../../main.ts";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { LanguageString, ReadOnlyMemoryStore } from "@dataspecer/core/core/index";
import { PimStoreWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import { DataPsmResource } from "@dataspecer/core/data-psm/model/data-psm-resource";
import { DataPsmAssociationEnd } from "@dataspecer/core/data-psm/model/data-psm-association-end";

const PSM = "http://dataspecer.com/resources/v1/psm";
const PIM = "http://dataspecer.com/resources/v1/pim";
const CIM = "http://dataspecer.com/resources/v1/cim";
const GENERATOR_CONFIGURATION = "http://dataspecer.com/resources/v1/generator-configuration";

export default async function () {
  const roots = (await resourceModel.getRootResources()).filter(r => r.types.includes(LOCAL_PACKAGE));

  for (const root of roots) {
    const rootPackage = await resourceModel.getPackage(root.iri);
    for (const pkg of (rootPackage?.subResources!.filter(r => r.types.includes(LOCAL_PACKAGE)) ?? [])) {
      const finalPackage = await resourceModel.getPackage(pkg.iri);

      // Is is data specification?

      const pim = finalPackage?.subResources.find(r => r.types.includes(PIM));
      const cim = finalPackage?.subResources.find(r => r.types.includes(CIM));
      const generatorConfiguration = finalPackage?.subResources.find(r => r.types.includes(GENERATOR_CONFIGURATION));
      if (pim && cim && generatorConfiguration) {
        console.log(`  Migrating package ${finalPackage!.iri}...`);

        try {
          const packageData = {
            sourceSemanticModelIds: [] as string[],
            userPreferences: {} as Record<string, any>,
            localSemanticModelIds: [] as string[],
          };

          // Process CIM
          const cimData = await (await resourceModel.getResourceModelStore(cim.iri))?.getJson();
          const cimModels = cimData.models as string[];
          if (cimModels.length == 0) {
            packageData.sourceSemanticModelIds = ["https://dataspecer.com/adapters/sgov"];
          } else if (cimModels.length == 1 && cimModels[0].startsWith("https://dataspecer.com/adapters/")) {
            packageData.sourceSemanticModelIds = [cimModels[0]];
          } else {
            packageData.sourceSemanticModelIds = cimModels.map(m => `rdfs:${m}`);
          }
          await resourceModel.deleteResource(cim.iri);

          // Process Generator configuration
          const generatorConfigurationData = await (await resourceModel.getResourceModelStore(generatorConfiguration.iri))?.getJson();
          if (!Array.isArray(generatorConfigurationData.sourceSemanticModelIds) && generatorConfigurationData.client) {
            const client = generatorConfigurationData.client;
            delete generatorConfigurationData.client;
            packageData.userPreferences.client = client;
            await (await resourceModel.getResourceModelStore(generatorConfiguration.iri))?.setJson(generatorConfigurationData);
          }

          // Process PIM
          packageData.localSemanticModelIds = [pim.iri];
          await prismaClient.resource.update({
            where: { iri: pim.iri },
            data: {
              representationType: LOCAL_SEMANTIC_MODEL,
            }
          });
          const pimData = await (await resourceModel.getResourceModelStore(pim.iri))?.getJson();
          const reader = ReadOnlyMemoryStore.create(pimData.resources);
          const wrapper = new PimStoreWrapper(reader);
          wrapper.fetchFromPimStore();
          const entities = wrapper.getEntities();
          const semanticModel = {
            type: LOCAL_SEMANTIC_MODEL,
            modelId: pim.iri,
            modelAlias: "PIM",
            baseIri: "",
            entities,
          };
          await (await resourceModel.getResourceModelStore(pim.iri))?.setJson(semanticModel);

          // Title
          // @ts-ignore
          const title = Object.values(pimData.resources).find((r: any) => r?.types?.includes("https://ofn.gov.cz/slovník/pim/Schema"))?.pimHumanLabel as LanguageString ?? {};
          if (!finalPackage?.userMetadata.label || Object.keys(finalPackage?.userMetadata.label).length === 0) {
            resourceModel.updateResourceMetadata(finalPackage!.iri, { label: title });
          }

          // Process PSMs reverse associations
          const relationshipMapping = wrapper.relationshipMapping;
          for (const psm of finalPackage?.subResources.filter(r => r.types.includes(PSM)) ?? []) {
            const psmData = await (await resourceModel.getResourceModelStore(psm.iri))?.getJson();

            for (const entity of Object.values(psmData.resources) as DataPsmResource[]) {
              if (DataPsmAssociationEnd.is(entity)) {
                const mapping = entity.dataPsmInterpretation ? relationshipMapping[entity.dataPsmInterpretation] : null;
                if (mapping) {
                  entity.dataPsmInterpretation = mapping[0];
                  entity.dataPsmIsReverse = mapping[1];
                }
              }
            }

            await (await resourceModel.getResourceModelStore(psm.iri))?.setJson(psmData);

            // Title
            // @ts-ignore
            const title = Object.values(psmData.resources).find((r: any) => r?.types?.includes("https://ofn.gov.cz/slovník/psm/Schema"))?.dataPsmHumanLabel as LanguageString ?? {};
            if (!psm.userMetadata.label || Object.keys(psm.userMetadata.label).length === 0) {
              resourceModel.updateResourceMetadata(psm.iri, { label: title });
            }
          }

          // Store the package data
          const originalData = await (await resourceModel.getResourceModelStore(finalPackage!.iri))?.getJson() ?? {};
          await (await resourceModel.getResourceModelStore(finalPackage!.iri))?.setJson({...originalData, ...packageData});
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}