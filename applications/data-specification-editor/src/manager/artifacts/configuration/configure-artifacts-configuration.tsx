import type { Configuration, ConfigurationChain } from "@dataspecer/core/configuration";
import {useState} from "react";
import {Box, Tab, Tabs} from "@mui/material";
import {DataSpecification} from "./tabs/data-specification";
import {Json} from "./tabs/json";
import {Csv} from "./tabs/csv";
import {Xml} from "./tabs/xml";
import { getDataSpecificationConfigInput, dataSpecificationConfig, resolveDataSpecificationConfig } from "@dataspecer/core/data-specification/configuration";
import { getCsvConfigInput, csvConfig, resolveCsvConfig } from "@dataspecer/csv/configuration";
import { getJsonConfigInput, jsonConfig, resolveJsonConfig } from "@dataspecer/json/configuration";
import { getXmlConfigInput, xmlConfig, resolveXmlConfig } from "@dataspecer/xml/configuration";
import { ArtifactNames } from "./tabs/artifact-names";
import { ShaclV2 } from "./tabs/shacl-v2";
import { getShaclConfigInput, shaclConfig, resolveShaclConfig } from "@dataspecer/specification/shacl-v2";

/**
 * Component that renders the UI for configuration change. It is possible to pre-set default configuration, or keep it
 * undefined for setting only the temporary configuration.
 */
export const ConfigureArtifactsConfiguration = ({defaultConfiguration, configuration, onConfigurationChange}: {
    defaultConfiguration: ConfigurationChain | undefined,
    configuration: Configuration,
    onConfigurationChange: (configuration: Configuration) => void,
}) => {
    const [currentTab, setCurrentTab] = useState(0);
    return <div>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={currentTab} onChange={(e, i) => setCurrentTab(i)}>
                <Tab label="Data specification" />
                <Tab label="JSON" />
                <Tab label="CSV" />
                <Tab label="XSD" />
                <Tab label="SHACL" />
                <Tab label="File names" />
            </Tabs>
        </Box>
        {currentTab === 0 &&
            <DataSpecification
                input={getDataSpecificationConfigInput(configuration)}
                onChange={u => onConfigurationChange({ ...configuration, ...dataSpecificationConfig(u) })}
                defaultObject={defaultConfiguration ? resolveDataSpecificationConfig(defaultConfiguration) : undefined}
            />
        }
        {currentTab === 1 &&
            <Json
                input={getJsonConfigInput(configuration)}
                onChange={u => onConfigurationChange({ ...configuration, ...jsonConfig(u) })}
                defaultObject={defaultConfiguration ? resolveJsonConfig(defaultConfiguration) : undefined}
            />
        }
        {currentTab === 2 &&
            <Csv
                input={getCsvConfigInput(configuration)}
                onChange={u => onConfigurationChange({ ...configuration, ...csvConfig(u) })}
                defaultObject={defaultConfiguration ? resolveCsvConfig(defaultConfiguration) : undefined}
            />
        }
        {currentTab === 3 &&
            <Xml
                input={getXmlConfigInput(configuration)}
                onChange={u => onConfigurationChange({ ...configuration, ...xmlConfig(u) })}
                defaultObject={defaultConfiguration ? resolveXmlConfig(defaultConfiguration) : undefined}
            />
        }
        {currentTab === 4 &&
            <ShaclV2
                input={getShaclConfigInput(configuration)}
                onChange={u => onConfigurationChange({ ...configuration, ...shaclConfig(u) })}
                defaultObject={defaultConfiguration ? resolveShaclConfig(defaultConfiguration) : undefined}
            />
        }
        {currentTab === 5 &&
            <ArtifactNames
                input={getDataSpecificationConfigInput(configuration)}
                onChange={u => onConfigurationChange({ ...configuration, ...dataSpecificationConfig(u) })}
                defaultObject={defaultConfiguration ? resolveDataSpecificationConfig(defaultConfiguration) : undefined}

                currentConfiguration={configuration}
            />
        }
    </div>
}
