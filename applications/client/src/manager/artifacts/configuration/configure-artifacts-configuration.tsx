import {useState} from "react";
import {Box, Tab, Tabs} from "@mui/material";
import {DataSpecification} from "./tabs/data-specification";
import {Json} from "./tabs/json";
import {Csv} from "./tabs/csv";
import {Xml} from "./tabs/xml";
import {Bikeshed} from "./tabs/bikeshed";
import {
    DataSpecificationConfiguration,
    DataSpecificationConfigurator
} from "@dataspecer/core/data-specification/configuration";
import {CsvConfiguration, CsvConfigurator} from "@dataspecer/csv/configuration";
import {JsonConfiguration, JsonConfigurator} from "@dataspecer/json/configuration";
import {XmlConfiguration, XmlConfigurator} from "@dataspecer/xml/configuration";
import { TemplateArtifactConfiguration, TemplateArtifactConfigurator } from "@dataspecer/template-artifact/configuration";

/**
 * Component that renders the UI for configuration change. It is possible to pre-set default configuration, or keep it
 * undefined for setting only the temporary configuration.
 */
export const ConfigureArtifactsConfiguration = ({defaultConfiguration, configuration, onConfigurationChange}: {
    defaultConfiguration: object | undefined,
    configuration: object,
    onConfigurationChange: (configuration: object) => void,
}) => {
    const [currentTab, setCurrentTab] = useState(0);
    return <div>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={currentTab} onChange={(e, i) => setCurrentTab(i)}>
                <Tab label="Data specification" />
                <Tab label="JSON" />
                <Tab label="CSV" />
                <Tab label="XSD" />
                <Tab label="Bikeshed" />
            </Tabs>
        </Box>
        {currentTab === 0 &&
            <DataSpecification
                input={DataSpecificationConfigurator.getFromObject(configuration)}
                onChange={u => onConfigurationChange(DataSpecificationConfigurator.setToObject(configuration, u))}
                defaultObject={defaultConfiguration ? DataSpecificationConfigurator.getFromObject(defaultConfiguration) as DataSpecificationConfiguration : undefined}
            />
        }
        {currentTab === 1 &&
            <Json
                input={JsonConfigurator.getFromObject(configuration)}
                onChange={u => onConfigurationChange(JsonConfigurator.setToObject(configuration, u))}
                defaultObject={defaultConfiguration ? JsonConfigurator.getFromObject(defaultConfiguration) as JsonConfiguration : undefined}
            />
        }
        {currentTab === 2 &&
            <Csv
                input={CsvConfigurator.getFromObject(configuration)}
                onChange={u => onConfigurationChange(CsvConfigurator.setToObject(configuration, u))}
                defaultObject={defaultConfiguration ? CsvConfigurator.getFromObject(defaultConfiguration) as CsvConfiguration : undefined}
            />
        }
        {currentTab === 3 &&
            <Xml
                input={XmlConfigurator.getFromObject(configuration)}
                onChange={u => onConfigurationChange(XmlConfigurator.setToObject(configuration, u))}
                defaultObject={defaultConfiguration ? XmlConfigurator.getFromObject(defaultConfiguration) as XmlConfiguration : undefined}
            />
        }
        {currentTab === 4 &&
            <Bikeshed
                input={TemplateArtifactConfigurator.getFromObject(configuration)}
                onChange={u => onConfigurationChange(TemplateArtifactConfigurator.setToObject(configuration, u))}
                defaultObject={defaultConfiguration ? TemplateArtifactConfigurator.getFromObject(defaultConfiguration) as TemplateArtifactConfiguration : undefined}
            />
        }
    </div>
}
