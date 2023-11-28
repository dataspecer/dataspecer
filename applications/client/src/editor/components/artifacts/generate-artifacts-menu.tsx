import React, {useCallback, useContext, useRef, useState} from "react";
import {Button, CardContent, Checkbox, DialogActions, DialogContent, Divider, IconButton, ListItemText, Menu, MenuItem, Tooltip, Typography} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {useToggle} from "../../hooks/use-toggle";
import {uniqueId} from "lodash";
import {useTranslation} from "react-i18next";
import {ConfigurationContext} from "../App";
import FileSaver from "file-saver";
import copy from "copy-to-clipboard";
import {useSnackbar} from "notistack";
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import DownloadTwoToneIcon from '@mui/icons-material/DownloadTwoTone';
import FindInPageTwoToneIcon from '@mui/icons-material/FindInPageTwoTone';
import {dialog, useDialog} from "../../dialog";
import {JSON_SCHEMA} from "@dataspecer/json/json-schema";
import {styled} from "@mui/material/styles";
import {XML_SCHEMA} from "@dataspecer/xml/xml-schema";
import {JSON_LD_GENERATOR} from "@dataspecer/json/json-ld";
import {XSLT_LIFTING, XSLT_LOWERING} from "@dataspecer/xml/xml-transformations";
import {CSV_SCHEMA} from "@dataspecer/csv/csv-schema";
import {getSingleArtifact} from "./get-single-artifact";
import {DataSpecificationSchema} from "@dataspecer/core/data-specification/model";
import mime from "mime/lite";
import {SingleArtifactPreview} from "./multiple-artifacts-preview";
import PrintTwoToneIcon from '@mui/icons-material/PrintTwoTone';
import {useResource} from "@dataspecer/federated-observable-store-react/use-resource";
import {DataPsmSchema} from "@dataspecer/core/data-psm/model";
import {SPARQL} from "@dataspecer/sparql-query";
import {DefaultConfigurationContext} from "../../../application";
import {RDF_TO_CSV} from "@dataspecer/csv/rdf-to-csv";
import {MemoryStreamDictionary} from "@dataspecer/core/io/stream/memory-stream-dictionary";
import {ShaclGenerator, ShexGenerator} from "@dataspecer/shacl";
import {JsonExampleGenerator} from "@dataspecer/json-example";

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
                configuration.store,
                configuration.dataSpecificationIri as string,
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

export const GenerateArtifactsMenu: React.FC<{
    artifactPreview: string[],
    setArtifactPreview: (value: string[]) => void
}> = ({setArtifactPreview, artifactPreview}) => {
    const {isOpen, open, close} = useToggle();
    const [ id ] = useState(() => uniqueId());
    const ref = useRef(null);
    const {t} = useTranslation("artifacts");

    const ProvidedPreviewDialog = useDialog(PreviewDialog);

    const add = (artifact: string) => setArtifactPreview([...artifactPreview, artifact]);

    const del = (artifact: string) => setArtifactPreview(artifactPreview.filter(a => a !== artifact));

    const {dataPsmSchemaIri} = useContext(ConfigurationContext);
    const {resource: root} = useResource<DataPsmSchema>(dataPsmSchemaIri);

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
                {/*<ArtifactItem title={"Store"} checked={false} setChecked={() => null}/>
                <Divider />*/}
                <GeneratedArtifactItem
                    title={"JSON schema"}
                    generator={JSON_SCHEMA.Generator}
                    live={artifactPreview.includes(JSON_SCHEMA.Generator)}
                    onPreview={() => ProvidedPreviewDialog.open({generatorId: JSON_SCHEMA.Generator})}
                    setLive={v => (v ? add : del)(JSON_SCHEMA.Generator)}
                />
                <GeneratedArtifactItem
                  title={"JSON-LD"}
                  generator={JSON_LD_GENERATOR}
                  live={artifactPreview.includes(JSON_LD_GENERATOR)}
                  onPreview={() => ProvidedPreviewDialog.open({generatorId: JSON_LD_GENERATOR})}
                  setLive={v => (v ? add : del)(JSON_LD_GENERATOR)}
                />
                <GeneratedArtifactItem
                    title={"JSON examples"}
                    generator={JsonExampleGenerator.IDENTIFIER}
                    live={artifactPreview.includes(JsonExampleGenerator.IDENTIFIER)}
                    onPreview={() => ProvidedPreviewDialog.open({generatorId: JsonExampleGenerator.IDENTIFIER})}
                    setLive={v => (v ? add : del)(JsonExampleGenerator.IDENTIFIER)}
                />
                <Divider />
                <GeneratedArtifactItem
                    title={"XSD schema"}
                    generator={XML_SCHEMA.Generator}
                    live={artifactPreview.includes(XML_SCHEMA.Generator)}
                    onPreview={() => ProvidedPreviewDialog.open({generatorId: XML_SCHEMA.Generator})}
                    setLive={v => (v ? add : del)(XML_SCHEMA.Generator)}
                />
                <GeneratedArtifactItem
                    title={"Lifting XSLT"}
                    generator={XSLT_LIFTING.Generator}
                    live={artifactPreview.includes(XSLT_LIFTING.Generator)}
                    onPreview={() => ProvidedPreviewDialog.open({generatorId: XSLT_LIFTING.Generator})}
                    setLive={v => (v ? add : del)(XSLT_LIFTING.Generator)}
                />
                <GeneratedArtifactItem
                    title={"Lowering XSLT"}
                    generator={XSLT_LOWERING.Generator}
                    live={artifactPreview.includes(XSLT_LOWERING.Generator)}
                    onPreview={() => ProvidedPreviewDialog.open({generatorId: XSLT_LOWERING.Generator})}
                    setLive={v => (v ? add : del)(XSLT_LOWERING.Generator)}
                />
                <Divider />
                <GeneratedArtifactItem
                    title={"CSV schema"}
                    generator={CSV_SCHEMA.Generator}
                    live={artifactPreview.includes(CSV_SCHEMA.Generator)}
                    onPreview={() => ProvidedPreviewDialog.open({generatorId: CSV_SCHEMA.Generator})}
                    setLive={v => (v ? add : del)(CSV_SCHEMA.Generator)}
                />
                <GeneratedArtifactItem
                    title={"RDF-to-CSV"}
                    generator={RDF_TO_CSV.Generator}
                    live={artifactPreview.includes(RDF_TO_CSV.Generator)}
                    onPreview={() => ProvidedPreviewDialog.open({generatorId: RDF_TO_CSV.Generator})}
                    setLive={v => (v ? add : del)(RDF_TO_CSV.Generator)}
                />
                <Divider />
                <GeneratedArtifactItem
                    title={"SPARQL"}
                    generator={SPARQL.Generator}
                    live={artifactPreview.includes(SPARQL.Generator)}
                    onPreview={() => ProvidedPreviewDialog.open({generatorId: SPARQL.Generator})}
                    setLive={v => (v ? add : del)(SPARQL.Generator)}
                />
                <GeneratedArtifactItem
                    title={"SHACL"}
                    generator={ShaclGenerator.IDENTIFIER}
                    live={artifactPreview.includes(ShaclGenerator.IDENTIFIER)}
                    onPreview={() => ProvidedPreviewDialog.open({generatorId: ShaclGenerator.IDENTIFIER})}
                    setLive={v => (v ? add : del)(ShaclGenerator.IDENTIFIER)}
                />
                <GeneratedArtifactItem
                    title={"ShEx"}
                    generator={ShexGenerator.IDENTIFIER}
                    live={artifactPreview.includes(ShexGenerator.IDENTIFIER)}
                    onPreview={() => ProvidedPreviewDialog.open({generatorId: ShexGenerator.IDENTIFIER})}
                    setLive={v => (v ? add : del)(ShexGenerator.IDENTIFIER)}
                />

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
