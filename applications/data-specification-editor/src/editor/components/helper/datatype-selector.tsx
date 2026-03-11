import React, {memo, type ChangeEvent, type ChangeEventHandler} from "react";
import {Autocomplete, Box, Chip, IconButton, TextField, Typography} from "@mui/material";
import {KnownDatatype} from "../../utils/known-datatypes";
import InfoTwoToneIcon from "@mui/icons-material/InfoTwoTone";
import {Datatype} from "../data-psm/common/Datatype";

export type DatatypeSelectorValueType = string | KnownDatatype;

interface DatatypeSelectorParameters {
    value: DatatypeSelectorValueType;
    onChange: (value: DatatypeSelectorValueType) => void;
    onEnter?: (event: React.KeyboardEvent<HTMLInputElement>) => void,
    disabled?: boolean;

    options: KnownDatatype[];
}

export const getIriFromDatatypeSelectorValue = (value: string | KnownDatatype | null) => {
    if (typeof value === 'object' && value) {
        return value.iri;
    }
    if (typeof value === 'string') {
        return value === "" ? null : value;
    }
    return null;
}

/**
 * Allows user select a data type from a list of pre-defined types or by typing a custom IRI.
 * Because user may want to set a type whose prefix is a well-known type (for example string-only-ascii vs string) we
 * must not immediately replace the user text with well-known types. Therefore, the complexity of value prop.
 */
export const DatatypeSelector: React.FC<DatatypeSelectorParameters> = memo(({value, onChange, options, onEnter, disabled}) => {
    //const {t} = useTranslation("detail");

    // Whether the value is non-null object
    const valueIsKnown = typeof value === 'object' && value;

    return <>
    <Autocomplete
        autoHighlight
        disabled={disabled}

        freeSolo
        // @ts-ignore
        value={valueIsKnown ? value : undefined}
        disableClearable

        onChange={(event, newValue) => {
            // noinspection SuspiciousTypeOfGuard
            if (typeof newValue !== "string") {
                // @ts-ignore
                onChange(newValue);
            }
        }}

        renderOption={(props, option: KnownDatatype) => (
            <Box component="li" {...props} sx={{display: "flex", gap: "1rem"}}>
                <Datatype iri={option.iri} style={{whiteSpace: "nowrap"}} />
                <Typography color={"gray"} sx={{flexGrow: 1, textOverflow: 'ellipsis', overflow: "hidden", whiteSpace: "nowrap"}}>
                    {option.iri}
                </Typography>
                {option.documentation &&
                    <IconButton href={option.documentation} target="_blank">
                        <InfoTwoToneIcon/>
                    </IconButton>
                }
            </Box>
        )}
        // Used for searching.
        getOptionLabel={datatype => `${(datatype as KnownDatatype).prefix}:${(datatype as KnownDatatype).localPart}\0${(datatype as KnownDatatype).iri}\0${Object.values((datatype as KnownDatatype).label ?? {}).join("\0")}`}
        renderInput={(params) =>  {
            return <TextField
                {...params}
                InputProps={{
                    ...params.InputProps,
                    startAdornment: valueIsKnown ? <Chip size="small" color="primary" label={<Datatype iri={value.iri} />} onDelete={() => {
                        onChange("")
                    }}/> : null,
                    sx: {
                        paddingTop: "0 !important",
                        paddingBottom: "0 !important",
                        paddingLeft: "12px !important",
                        paddingRight: "12px !important",
                    },
                }}
                inputProps={{
                    ...params.inputProps,
                    autoComplete: 'new-password',
                    value: valueIsKnown ? "" : value,
                    onChange: (event: ChangeEvent<HTMLInputElement>) => {
                        onChange((event.target as HTMLInputElement).value);
                        (params.inputProps.onChange as ChangeEventHandler<HTMLInputElement>)(event);
                    },
                    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                        if (event.key === "Backspace" && valueIsKnown) {
                            onChange("");
                        }
                        if (event.key === "Enter" && valueIsKnown && onEnter) {
                            onEnter(event);
                            return;
                        }
                        if (params.inputProps.onKeyDown) {
                            params.inputProps.onKeyDown(event);
                        }
                    },
                    sx: {
                        paddingTop: "16px !important",
                        paddingBottom: "17px !important",
                        paddingLeft: "0 !important",
                        paddingRight: "0 !important",
                    }
                }}
                variant="filled"
                hiddenLabel
            />
        }}
        options={options}
    />


    </>
});
