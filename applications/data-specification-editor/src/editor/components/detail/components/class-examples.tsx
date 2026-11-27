import * as React from "react";
import {memo, useEffect, useState} from "react";
import {useResource} from "@dataspecer/federated-observable-store-react/use-resource";
import {
    Alert,
    Box,
    Button,
    Grid,
    IconButton,
    List,
    ListItemButton,
    ListItemSecondaryAction,
    ListItemText,
    TextField,
    Typography
} from "@mui/material";
import {useTranslation} from "react-i18next";
import {dialog, DialogParameters, useDialog} from "../../../dialog";
import {DialogWrapper} from "../common";
import DeleteIcon from '@mui/icons-material/Delete';
import {useSaveHandler} from "../../helper/save-handler";
import { deepEqual } from "@dataspecer/utilities";
import {useFederatedObservableStore} from "@dataspecer/federated-observable-store-react/store";
import {SetObjectExample} from "../../../operations/set-object-example";
import { ExtendedSemanticModelClass, isSemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { Entity } from "@dataspecer/core-v2";

function isFaultyJson(str: string) {
    str = (str ?? "").trim();
    if (str === "") return null;
    let errorMsg: string | null = null;
    try {
        JSON.parse(str);
    } catch (e) {
        errorMsg = e.message;
    }
    return errorMsg;
}

function parseJson(str: string) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return undefined;
    }
}

/**
 * Shows editor for class examples iff {@link pimClassIri} is class.
 */
export const ClassExamples = memo(({pimClassIri}: {pimClassIri: string | null | undefined}) => {
    const {t} = useTranslation("detail", {keyPrefix: "object examples"});
    const store = useFederatedObservableStore();

    const {resource: rawResource} = useResource<Entity>(pimClassIri ?? null);
    const resource = isSemanticModelClass(rawResource) ? rawResource as ExtendedSemanticModelClass : null;

    const [examples, setExamples] = useState<object[]>([]);

    useEffect(() => {
        setExamples(resource?.objectExample ?? []);
    }, [resource?.objectExample]);

    const Dialog = useDialog(ExamplesDialog, ["examples", "setExamples"]);

    useSaveHandler(
        resource && !deepEqual(examples, resource.objectExample ?? []),
        async () =>
            resource &&
            await store.executeComplexOperation(new SetObjectExample(resource.iri, examples))
    );

    return <>
        {resource && <>
            <Box sx={{mb: 3}}>
                <Typography variant="subtitle1" component="h2">
                    {t('examples')}
                </Typography>
                <Grid container spacing={2}>
                    <Grid item flexGrow={1}>
                        <Typography
                            variant="body1"
                            color="textSecondary"
                            sx={{mt: 1}}
                            align="center"
                        >
                            {t('examples count', {count: examples.length})}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Button variant="contained" onClick={Dialog.open}>{t('manage examples button')}</Button>
                    </Grid>
                </Grid>
            </Box>
        </>}
        <Dialog.Component examples={examples} setExamples={setExamples} />
    </>;
});

const ExamplesDialog: React.FC<{
    examples: object[],
    setExamples: (examples: object[]) => void,
} & DialogParameters> = dialog({maxWidth: "md", fullWidth: true}, memo((props) => {
    const {t} = useTranslation("detail", {keyPrefix: "object examples"});

    return <DialogWrapper close={props.close} title={t("dialog title")} >
        <DialogInner examples={props.examples} setExamples={props.setExamples} isOpen={props.isOpen} />
    </DialogWrapper>;
}));

const DialogInner = (props: {examples: object[], setExamples: (examples: object[]) => void, isOpen: boolean}) => {
    const {t} = useTranslation("detail", {keyPrefix: "object examples"});

    const [selected, setSelected] = useState<number>(0);
    const [examples, setExamples] = useState<string[]>([]);

    useEffect(() => {
        if (props.isOpen) {
            setExamples(props.examples.map(i => JSON.stringify(i, undefined, 2)));
            setSelected(0);
        }
    }, [props.examples, props.isOpen]);

    const jsonError = isFaultyJson(examples[selected]);

    const parsed = examples.filter(e => e.trim() !== "").map(parseJson).filter(o => o !== undefined);
    useSaveHandler(
        !deepEqual(parsed, props.examples),
        () => {
            props.setExamples(parsed);
        }
    );

    return <>
        <Grid container spacing={2}>
            <Grid item xs={4} sx={{padding: "0 !important"}}>
                <List>
                    {examples.map((example, index) => <ListItemButton key={index} selected={selected === index} onClick={() => setSelected(index)}>
                        <ListItemText
                            primary={t("example") + " " + (index + 1)}
                        />
                        <ListItemSecondaryAction>
                            <IconButton
                                edge="end"
                                aria-label="delete"
                                onClick={() => {
                                    setExamples(examples.filter((_, i) => i !== index));
                                    if (examples.length - 1 === selected) { // was last item
                                        setSelected((examples.length - 2) ? null : examples.length - 2);
                                    }
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItemButton>)}
                    <ListItemButton selected={selected === examples.length} onClick={() => setSelected(examples.length)}>
                        <ListItemText
                            primary={t("example") + " " + (examples.length + 1)}
                        />
                    </ListItemButton>
                </List>
            </Grid>
            <Grid item xs={8}>
                <Typography variant={'h6'} sx={{mb: 2}}>Example {selected + 1}</Typography>
                {t("help text")}
                <TextField
                    multiline
                    fullWidth
                    value={examples[selected] ?? ""}
                    onChange={e => {
                        const newExamples = [...examples];
                        newExamples[selected] = e.target.value;
                        setExamples(newExamples);
                    }}
                    error={jsonError != null}
                    minRows={10}
                    maxRows={10}
                />
                {jsonError == null ?
                    <Alert severity='success'>
                        {t("no error")}
                    </Alert> :
                    <Alert severity='error'>
                        {jsonError}
                    </Alert>
                }
            </Grid>
        </Grid>
    </>;
}
