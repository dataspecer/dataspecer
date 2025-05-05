import {
    CreateTemplate,
    DeleteTemplate,
    DetailTemplate,
    EditTemplate,
    ListTemplate,
    CreateLdkitInstanceGenerator,
    EditLdkitInstanceGenerator,
    InstanceDeleteLdkitGenerator,
    InstanceDetailLdkitReaderGenerator,
    InstanceListLdkitReaderGenerator
}
from "./template-generators/ldkit/index.ts";
import { DalGeneratorStrategy } from "./strategy-interface.ts";
import { DataSourceType, DatasourceConfig } from "../engine/graph/datasource.ts";
import { TemplateDataLayerGeneratorStrategy } from "./strategies/ldkit-template-strategy.ts";

export type DataAccessLayerGeneratorFactory = {
    getDalGeneratorStrategy: (technicalLabel: string, specificationIri: string, datasourceConfig: DatasourceConfig) => DalGeneratorStrategy;
}

export const ListTemplateDalGeneratorFactory: DataAccessLayerGeneratorFactory = {

    getDalGeneratorStrategy(technicalLabel: string, specificationIri: string, datasourceConfig: DatasourceConfig): DalGeneratorStrategy {
        const generators = {
            [DataSourceType.RDF]: new TemplateDataLayerGeneratorStrategy<ListTemplate>(
                new InstanceListLdkitReaderGenerator(`./readers/ldkit/${technicalLabel}-list.ts`),
                specificationIri,
                datasourceConfig
            ),
            [DataSourceType.JSON]:  null as unknown as DalGeneratorStrategy,
            [DataSourceType.XML]:   null as unknown as DalGeneratorStrategy,
            [DataSourceType.CSV]:   null as unknown as DalGeneratorStrategy,
            [DataSourceType.Local]: null as unknown as DalGeneratorStrategy,
        };

        const generator = generators[datasourceConfig.format];

        if (!generator) {
            throw new Error("No matching data layer generator has been found!");
        }

        return generator;
    }
}

export const DetailTemplateDalGeneratorFactory: DataAccessLayerGeneratorFactory = {

    getDalGeneratorStrategy(technicalLabel: string, specificationIri: string, datasourceConfig: DatasourceConfig): DalGeneratorStrategy {
        const generators = {
            [DataSourceType.RDF]: new TemplateDataLayerGeneratorStrategy<DetailTemplate>(
                new InstanceDetailLdkitReaderGenerator(`./readers/ldkit/${technicalLabel}-detail.ts`),
                specificationIri,
                datasourceConfig
            ),
            [DataSourceType.JSON]:  null as unknown as DalGeneratorStrategy,
            [DataSourceType.XML]:   null as unknown as DalGeneratorStrategy,
            [DataSourceType.CSV]:   null as unknown as DalGeneratorStrategy,
            [DataSourceType.Local]: null as unknown as DalGeneratorStrategy,
        };

        const generator = generators[datasourceConfig.format];

        if (!generator) {
            throw new Error("No matching data layer generator has been found!");
        }

        return generator;
    }
}

export const DeleteInstanceTemplateGeneratorFactory: DataAccessLayerGeneratorFactory = {
    getDalGeneratorStrategy(technicalLabel: string, specificationIri: string, datasourceConfig: DatasourceConfig): DalGeneratorStrategy {
        const generators = {
            [DataSourceType.RDF]: new TemplateDataLayerGeneratorStrategy<DeleteTemplate>(
                new InstanceDeleteLdkitGenerator(`./writers/ldkit/${technicalLabel}-instance-delete.ts`),
                specificationIri,
                datasourceConfig
            ),
            [DataSourceType.JSON]:  null as unknown as DalGeneratorStrategy,
            [DataSourceType.XML]:   null as unknown as DalGeneratorStrategy,
            [DataSourceType.CSV]:   null as unknown as DalGeneratorStrategy,
            [DataSourceType.Local]: null as unknown as DalGeneratorStrategy,
        };

        const generator = generators[datasourceConfig.format];

        if (!generator) {
            throw new Error("No matching data layer generator has been found!");
        }

        return generator;
    }
}

export const CreateInstanceTemplateGeneratorFactory: DataAccessLayerGeneratorFactory = {
    getDalGeneratorStrategy(technicalLabel: string, specificationIri: string, datasourceConfig: DatasourceConfig): DalGeneratorStrategy {
        const generators = {
            [DataSourceType.RDF]: new TemplateDataLayerGeneratorStrategy<CreateTemplate>(
                new CreateLdkitInstanceGenerator(`./writers/ldkit/${technicalLabel}-create-instance.ts`),
                specificationIri,
                datasourceConfig
            ),
            [DataSourceType.JSON]:  null as unknown as DalGeneratorStrategy,
            [DataSourceType.XML]:   null as unknown as DalGeneratorStrategy,
            [DataSourceType.CSV]:   null as unknown as DalGeneratorStrategy,
            [DataSourceType.Local]: null as unknown as DalGeneratorStrategy,
        };

        const generator = generators[datasourceConfig.format];

        if (!generator) {
            throw new Error("No matching data layer generator has been found!");
        }

        return generator;
    }
}

export const EditInstanceTemplateGeneratorFactory: DataAccessLayerGeneratorFactory = {
    getDalGeneratorStrategy(technicalLabel: string, specificationIri: string, datasourceConfig: DatasourceConfig): DalGeneratorStrategy {
        const generators = {
            [DataSourceType.RDF]: new TemplateDataLayerGeneratorStrategy<EditTemplate>(
                new EditLdkitInstanceGenerator(`./writers/ldkit/${technicalLabel}-edit-instance.ts`),
                specificationIri,
                datasourceConfig
            ),
            [DataSourceType.JSON]:  null as unknown as DalGeneratorStrategy,
            [DataSourceType.XML]:   null as unknown as DalGeneratorStrategy,
            [DataSourceType.CSV]:   null as unknown as DalGeneratorStrategy,
            [DataSourceType.Local]: null as unknown as DalGeneratorStrategy,
        };

        const generator = generators[datasourceConfig.format];

        if (!generator) {
            throw new Error("No matching data layer generator has been found!");
        }

        return generator;
    }
}