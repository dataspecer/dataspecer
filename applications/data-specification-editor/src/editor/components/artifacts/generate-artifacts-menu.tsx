import { DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
import { MemoryStreamDictionary } from "@dataspecer/core/io/stream/memory-stream-dictionary";
import { CSV_SCHEMA } from "@dataspecer/csv/csv-schema";
import { RDF_TO_CSV } from "@dataspecer/csv/rdf-to-csv";
import { useResource } from "@dataspecer/federated-observable-store-react/use-resource";
import { JsonExampleGenerator } from "@dataspecer/json-example";
import { JSON_LD_GENERATOR } from "@dataspecer/json/json-ld";
import { JSON_SCHEMA } from "@dataspecer/json/json-schema";
import { OpenapiGenerator } from "@dataspecer/openapi";
import { ShaclGenerator } from "@dataspecer/shacl";
import { ShexGenerator, ShexMapGenerator } from "@dataspecer/shex";
import { SPARQL } from "@dataspecer/sparql-query";
import { XML_SCHEMA } from "@dataspecer/xml/xml-schema";
import { XSLT_LIFTING, XSLT_LOWERING } from "@dataspecer/xml/xml-transformations";
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import DownloadTwoToneIcon from '@mui/icons-material/DownloadTwoTone';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FindInPageTwoToneIcon from '@mui/icons-material/FindInPageTwoTone';
import PrintTwoToneIcon from '@mui/icons-material/PrintTwoTone';
import { Button, CardContent, Checkbox, DialogActions, DialogContent, Divider, IconButton, ListItemText, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import copy from "copy-to-clipboard";
import FileSaver from "file-saver";
import mime from "mime/lite";
import { useSnackbar } from "notistack";
import React, { useCallback, useContext, useId, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DefaultConfigurationContext } from "../../../application";
import { dialog, useDialog } from "../../dialog";
import { useAsyncMemo } from "../../hooks/use-async-memo";
import { useToggle } from "../../hooks/use-toggle";
import { ConfigurationContext } from "../App";
import { getSingleArtifact } from "../../../generators/get-single-artifact";
import { SingleArtifactPreview } from "./multiple-artifacts-preview";
import { DefaultArtifactConfigurator } from "@dataspecer/specification/v1";

const PreviewDialog = dialog<{generatorId: string}>({fullWidth: true, maxWidth: "xl"}, (({generatorId, close}) => {
    const {t} = useTranslation("artifacts");

    return <>
        <DialogContent>
            <SingleArtifactPreview
                generatorIdentifier={generatorId}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={close}>{t("close")}</Button>
        </DialogActions>
    </>
}));

/**
 * Local hook that returns a function that either saves the artifact or stores it into the clipboard.
 * @param generator
 * @param save Whether the artifact should be saved. If false, it will be copied to the clipboard.
 */
const useSaveOrCopy = (generator: string, save: boolean) => {
    const defaultConfiguration = useContext(DefaultConfigurationContext);
    const configuration = useContext(ConfigurationContext);
    const {t} = useTranslation("artifacts");
    const {enqueueSnackbar} = useSnackbar();
    return useCallback(async () => {
        let memoryStreamDictionary: MemoryStreamDictionary | undefined = undefined;
        try {
            memoryStreamDictionary = await getSingleArtifact(
                // @ts-ignore
                configuration.store,
                configuration.dataSpecificationIri as string,
                // @ts-ignore
                configuration.dataSpecifications,
                artefact =>
                    artefact.generator === generator &&
                    DataSpecificationSchema.is(artefact) &&
                    artefact.psm === configuration.dataPsmSchemaIri,
                defaultConfiguration
            );
        } catch (error) {
            console.error(error);
            enqueueSnackbar(<><strong>{t("error")}</strong>: {(error as Error).message}</>, {variant: "error"});
        }
        if (memoryStreamDictionary !== undefined && configuration.dataPsmSchemaIri) {
            const files = await memoryStreamDictionary.list();

            if (files.length === 1) {
                const filename = files[0].split("/").pop()!;
                const artifact = await memoryStreamDictionary.readPath(files[0]).read();
                if (save) {
                    const data = new Blob([artifact], {
                        type: mime.getType(filename.split(".").pop() as string) ?? undefined
                    });
                    FileSaver.saveAs(data, filename, {autoBom: false});
                } else {
                    if (copy(artifact)) {
                        enqueueSnackbar(t("snackbar copied to clipboard.ok"), {variant: "success"});
                    } else {
                        enqueueSnackbar(t("snackbar copied to clipboard.failed"), {variant: "error"});
                    }
                }
            }

        }
    }, [configuration.dataPsmSchemaIri, configuration.store, configuration.dataSpecificationIri, configuration.dataSpecifications, defaultConfiguration, generator, enqueueSnackbar, t, save]);
}

const ArtifactItem: React.FC<{
    title: string,
    checked: boolean,
    setChecked: (checked: boolean) => any,
    onPreview?: () => void,
    onCopy?: () => void,
    onDownload?: () => void,
}> = props => {
    const {t} = useTranslation("artifacts");
    return <MenuItem onClick={() => props.setChecked(!props.checked)}>
        <Checkbox checked={props.checked} onChange={e => props.setChecked(e.target.checked)}/>
        <ListItemText>{props.title}</ListItemText>
        <div style={{width: "1cm"}}/>
        <Tooltip title={t("tooltip preview") as string}>
            <IconButton color={"inherit"} onClick={e => {
                e.stopPropagation();
                props.onPreview?.();
            }}><FindInPageTwoToneIcon fontSize="small"/></IconButton>
        </Tooltip>
        <Tooltip title={t("tooltip copy") as string}>
            <IconButton color={"inherit"} onClick={e => {
                e.stopPropagation();
                props.onCopy?.();
            }}><ContentCopyTwoToneIcon fontSize="small"/></IconButton>
        </Tooltip>
        <Tooltip title={t("tooltip download") as string}>
            <IconButton color={"inherit"} onClick={e => {
                e.stopPropagation();
                props.onDownload?.();
            }}><DownloadTwoToneIcon fontSize="small"/></IconButton>
        </Tooltip>
    </MenuItem>
};

const GeneratedArtifactItem: React.FC<{
    title: string,
    generator: string,
    live: boolean,
    setLive: (value: boolean) => void,
    onPreview?: () => void,
}> = ({title, generator, live, setLive, onPreview}) => {
    const save = useSaveOrCopy(generator, true);
    const copy = useSaveOrCopy(generator, false);

    return <ArtifactItem
        title={title}
        onCopy={copy}
        onDownload={save}
        checked={live}
        setChecked={setLive}
        onPreview={onPreview}
    />
}

const StyledMenu = styled(Menu)({
    "ul" : {
        paddingBottom: 0,
    }
});

const MenuNote = styled(CardContent)(({theme}) => ({
    background: theme.palette.action.hover,
    paddingTop: 0,
    paddingBottom: "0 !important",
    overflow: "auto",
}))

const DIVIDER = null;
const items = [
    {
        title: "JSON schema",
        generator: JSON_SCHEMA.Generator,
    },
    {
        title: "JSON-LD context",
        generator: JSON_LD_GENERATOR,
    },
    {
        title: "JSON examples",
        generator: JsonExampleGenerator.IDENTIFIER,
    },
    DIVIDER,
    {
        title: "XSD schema",
        generator: XML_SCHEMA.Generator,
    },
    {
        title: "Lifting XSLT",
        generator: XSLT_LIFTING.Generator,
    },
    {
        title: "Lowering XSLT",
        generator: XSLT_LOWERING.Generator,
    },
    DIVIDER,
    {
        title: "CSV schema",
        generator: CSV_SCHEMA.Generator,
    },
    {
        title: "RDF-to-CSV",
        generator: RDF_TO_CSV.Generator,
    },
    DIVIDER,
    {
        title: "SPARQL",
        generator: SPARQL.Generator,
    },
    DIVIDER,
    {
        title: "SHACL",
        generator: ShaclGenerator.IDENTIFIER,
    },
    {
        title: "ShEx",
        generator: ShexGenerator.IDENTIFIER,
    },
    {
        title: "ShEx Map",
        generator: ShexMapGenerator.IDENTIFIER,
    },
    DIVIDER,
    {
        title: "OpenAPI specification",
        generator: OpenapiGenerator.IDENTIFIER,
    },
];


export const GenerateArtifactsMenu: React.FC<{
    artifactPreview: string[],
    setArtifactPreview: (value: string[]) => void
}> = ({setArtifactPreview, artifactPreview}) => {
    const {isOpen, open, close} = useToggle();
    const id = useId();
    const ref = useRef(null);
    const {t} = useTranslation("artifacts");

    const ProvidedPreviewDialog = useDialog(PreviewDialog);

    const add = (artifact: string) => setArtifactPreview([...artifactPreview, artifact]);

    const del = (artifact: string) => setArtifactPreview(artifactPreview.filter(a => a !== artifact));

    const {dataPsmSchemaIri} = useContext(ConfigurationContext);
    const {resource: root} = useResource<DataPsmSchema>(dataPsmSchemaIri);

    const configuration = useContext(ConfigurationContext);
    const defaultConfiguration = useContext(DefaultConfigurationContext);

    const [artifactConfiguration] = useAsyncMemo(async () => {
        if (configuration.dataSpecifications[configuration.dataSpecificationIri as string] === undefined) {
            return null;
        }
        const defaultArtifactConfigurator = new DefaultArtifactConfigurator(
            Object.values(configuration.dataSpecifications), configuration.store, defaultConfiguration);
        const artifacts = await defaultArtifactConfigurator.generateFor(configuration.dataSpecificationIri as string);
        return artifacts;
    }, [configuration, defaultConfiguration]);

    const filteredItems = useMemo(() => {
        if (!artifactConfiguration) {
            return [];
        }

        const filtered = items.filter(item => item === DIVIDER || artifactConfiguration.find(a => a.generator === item.generator));
        const filteredWithDividers = [];

        let wasDivider = true;
        for (const item of filtered) {
            if (item === DIVIDER) {
                if (!wasDivider) {
                    filteredWithDividers.push(DIVIDER);
                }
                wasDivider = true;
            } else {
                filteredWithDividers.push(item);
                wasDivider = false;
            }
        }

        if (filteredWithDividers[filteredWithDividers.length - 1] === DIVIDER) {
            filteredWithDividers.pop();
        }

        return filteredWithDividers;
    }, [artifactConfiguration]);

    return (
        <>
            <Button aria-controls={id} aria-haspopup="true" variant="contained" onClick={open} ref={ref} disabled={!root || root.dataPsmParts.length === 0}>
                <PrintTwoToneIcon style={{marginRight: ".25em"}}/>
                {t("button generate load artifacts")}
                <ExpandMoreIcon />
            </Button>
            <StyledMenu
                id={id}
                anchorEl={ref.current}
                keepMounted
                open={isOpen}
                onClose={close}
            >
                <CardContent>
                    <Typography variant={"h5"} component={"div"}>{t("title generate artifacts")}</Typography>
                </CardContent>

                {filteredItems.map((item, index) => item === DIVIDER ? <Divider key={`divider-${index}`}/> : (
                    <GeneratedArtifactItem
                        key={item.generator}
                        title={item.title}
                        generator={item.generator}
                        live={artifactPreview.includes(item.generator)}
                        onPreview={() => ProvidedPreviewDialog.open({generatorId: item.generator})}
                        setLive={v => (v ? add : del)(item.generator)}
                    />
                ))}

                <MenuNote>
                    <p style={{maxWidth: "10cm"}}>
                        {t("note use checkbox to live preview")}
                    </p>
                    <p style={{maxWidth: "10cm"}}>
                        {t("note use manager for all artifacts")}
                    </p>
                </MenuNote>

            </StyledMenu>

            <ProvidedPreviewDialog.Component />
        </>
    );
};
