import {Box, Button, DialogActions, DialogContent, FormControlLabel, Grid, Radio, RadioGroup, Switch, TextField} from "@mui/material";
import React, {useEffect} from "react";
import {useTranslation} from "react-i18next";
import {dialog, DialogParameters, useDialog} from "../../dialog";
import {DialogTitle} from "../detail/common";
import { deepEqual } from "@dataspecer/utilities";
import { DataPsmAttribute } from "@dataspecer/core/data-psm/model/data-psm-attribute";
import { DataPsmAssociationEnd } from "@dataspecer/core/data-psm/model/data-psm-association-end";

export interface Cardinality {
    cardinalityMin: number,
    cardinalityMax: number | null,
}

enum PredefinedCardinality {
    c_0_infinity = '0..*',
    c_1_infinity = '1..*',
    c_0_1 = '0..1',
    c_1 = '1',
    unset = 'unset',
}

type CardinalitySelectorProps = {
    disabled?: boolean;
    color?: React.ComponentProps<typeof Radio>["color"];
} & ({
    value: Cardinality,
    onChange: (value: Cardinality) => void;

    /**
     * Whether it is allowed to inherit the cardinality from the parent.
     */
    inherit?: false;
} | {
    value: Cardinality | null,
    onChange: (value: Cardinality | null) => void;

    /**
     * Whether it is allowed to inherit the cardinality from the parent.
     */
    inherit: true;
});

export function cardinalityFromPim(pimResource: {
    cardinality?: [number, number | null],
}): Cardinality {
    return {
        cardinalityMin: pimResource?.cardinality?.[0] ?? 0,
        cardinalityMax: pimResource?.cardinality?.[1] ?? null,
    };
}

/**
 * Returns PSM cardinality or null if not set.
 */
export function cardinalityFromPsm(entity: DataPsmAttribute | DataPsmAssociationEnd): Cardinality | null {
    if (entity.dataPsmCardinality) {
        return {
            cardinalityMin: entity.dataPsmCardinality[0] ?? 0,
            cardinalityMax: entity.dataPsmCardinality[1] ?? null,
        };
    } else {
        return null;
    }
}

const predefinedCardinalityToValue: {[key in PredefinedCardinality]: Cardinality | null} = {
    [PredefinedCardinality.c_0_infinity]: {
        cardinalityMin: 0,
        cardinalityMax: null,
    },
    [PredefinedCardinality.c_1_infinity]: {
        cardinalityMin: 1,
        cardinalityMax: null,
    },
    [PredefinedCardinality.c_0_1]: {
        cardinalityMin: 0,
        cardinalityMax: 1,
    },
    [PredefinedCardinality.c_1]: {
        cardinalityMin: 1,
        cardinalityMax: 1,
    },
    [PredefinedCardinality.unset]: null,
};

export const defaultCardinality: Cardinality = {
    cardinalityMin: 0,
    cardinalityMax: null,
};

const CustomCardinalityDialog: React.FC<DialogParameters & {
    onConfirm: (cardinality: Cardinality) => void,
    defaultValue: Cardinality,
}> = dialog({maxWidth: "xs", fullWidth: true}, ({onConfirm, defaultValue, close}) => {
    const {t} = useTranslation("detail");

    const defaultMin = defaultValue?.cardinalityMin ?? 0;
    const defaultMax = defaultValue?.cardinalityMax ?? null;

    const [cardinalityMin, setCardinalityMin] = React.useState<string>(String(defaultMin));
    const [cardinalityMax, setCardinalityMax] = React.useState<string>(defaultMax === null ? "1" : String(defaultMax));
    const [infinity, setInfinity] = React.useState<boolean>(defaultMax === null);

    const min = parseInt(cardinalityMin);
    const max = infinity ? null : parseInt(cardinalityMax);
    const isValid = !isNaN(min) && (max === null || !isNaN(max)) && min >= 0 && (max === null || max >= min);

    const confirm = () => {
        if (!isValid) {
            return;
        }
        onConfirm({
            cardinalityMin: parseInt(cardinalityMin),
            cardinalityMax: infinity ? null : parseInt(cardinalityMax),
        });
        close();
    }

    return <>
        <DialogTitle>{t("cardinality custom title")}</DialogTitle>
        <DialogContent>
            <Grid container spacing={2} sx={{alignItems: "flex-end"}}>
                <Grid item xs={6} >
                    <TextField
                        autoFocus
                        margin="dense"
                        label={t('label min')}
                        fullWidth
                        variant="filled"
                        value={cardinalityMin}
                        onChange={event => setCardinalityMin(event.target.value)}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                        onKeyDown={event => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                confirm();
                            }
                        }}
                    />
                </Grid>
                <Grid item xs={6}>
                    <FormControlLabel control={<Switch checked={infinity} onChange={event => setInfinity(event.target.checked)} />} label={t("cardinality infinity") as string} />
                    <TextField
                        disabled={infinity}
                        margin="dense"
                        label={t('label max')}
                        fullWidth
                        variant="filled"
                        value={infinity ? "∞" : cardinalityMax}
                        onChange={event => setCardinalityMax(event.target.value)}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                        onKeyDown={event => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                confirm();
                            }
                        }}
                    />
                </Grid>
            </Grid>
        </DialogContent>
        <DialogActions>
            <Button disabled={!isValid} variant={"contained"} fullWidth onClick={confirm}>{t("confirm")}</Button>
        </DialogActions>
    </>
});

function cardinalityToKnown(cardinality: Cardinality | null): PredefinedCardinality | null {
    if (!cardinality) {
        return PredefinedCardinality.unset;
    }
    if (cardinality.cardinalityMin === 0 && cardinality.cardinalityMax === null) {
        return PredefinedCardinality.c_0_infinity;
    }
    if (cardinality.cardinalityMin === 1 && cardinality.cardinalityMax === null) {
        return PredefinedCardinality.c_1_infinity;
    }
    if (cardinality.cardinalityMin === 0 && cardinality.cardinalityMax === 1) {
        return PredefinedCardinality.c_0_1;
    }
    if (cardinality.cardinalityMin === 1 && cardinality.cardinalityMax === 1) {
        return PredefinedCardinality.c_1;
    }
    return null
}

export const CardinalitySelector: React.FC<CardinalitySelectorProps> = ({value, onChange, disabled, inherit, color}) => {
    const {t} = useTranslation("detail");

    const selectedRadio = cardinalityToKnown(value) ?? "custom";
    const [custom, setCustom] = React.useState<Cardinality | null>(null);
    const customIsUnique = custom && !cardinalityToKnown(custom);

    useEffect(() => {
        if (!cardinalityToKnown(value) && !deepEqual(custom, value)) {
            setCustom(value);
        }
    }, [value, custom]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value === "custom" ? custom as Cardinality : predefinedCardinalityToValue[event.target.value as PredefinedCardinality]);
    };

    const CustomDialog = useDialog(CustomCardinalityDialog, ["defaultValue", "onConfirm"]);

    return <Box sx={{display: "flex", flexDirection: "row"}}>
        <RadioGroup
            aria-label="gender"
            name="controlled-radio-buttons-group"
            value={selectedRadio}
            onChange={handleChange}
            sx={{display: "flex", flexDirection: "row"}}
        >
            {inherit && <FormControlLabel disabled={disabled} value={PredefinedCardinality.unset} control={<Radio color={color} />} label={t("cardinality unset") as string} />}
            <FormControlLabel disabled={disabled} value={PredefinedCardinality.c_0_infinity} control={<Radio color={color} />} label="0..*" />
            <FormControlLabel disabled={disabled} value={PredefinedCardinality.c_1_infinity} control={<Radio color={color} />} label="1..*" />
            <FormControlLabel disabled={disabled} value={PredefinedCardinality.c_0_1} control={<Radio color={color} />} label="0..1" />
            <FormControlLabel disabled={disabled} value={PredefinedCardinality.c_1} control={<Radio color={color} />} label="1" />
            {customIsUnique && <FormControlLabel disabled={disabled} value={"custom"} control={<Radio color={color} />} label={custom.cardinalityMin + ".." + (custom.cardinalityMax ?? "*")} />}
        </RadioGroup>
        <FormControlLabel disabled={disabled} value={"sdf"} control={<Radio onClick={() => CustomDialog.open({})} checked={false} />} label={t("cardinality custom") as string} />

        <CustomDialog.Component onConfirm={cardinality => {
            setCustom(cardinality);
            onChange(cardinality);
        }} defaultValue={value} />
    </Box>;
}
