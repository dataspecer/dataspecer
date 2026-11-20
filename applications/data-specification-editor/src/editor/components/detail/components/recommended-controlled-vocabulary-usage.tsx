import { FormControl, FormControlLabel, Radio, RadioGroup, Typography } from "@mui/material";
import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import { InfoHelp } from "../../../../components/info-help";

export interface RecommendedControlledVocabularyUsageValue {
    requireValue: boolean | null;
    restrictValues: boolean | null;
}

/**
 * Tells how the controlled vocabulary assigned with the usage "recommended" is
 * validated. Null means that the default of the data specification is used.
 */
export const RecommendedControlledVocabularyUsage: FC<{
    value: RecommendedControlledVocabularyUsageValue,
    onChange: (value: RecommendedControlledVocabularyUsageValue) => void,
}> = ({value, onChange}) => {
    const {t} = useTranslation("detail");

    return <>
        <TriStateOption
            title={t('controlled vocabularies.recommended usage.require value.title')}
            help={t('controlled vocabularies.recommended usage.require value.help')}
            value={value.requireValue}
            onChange={requireValue => onChange({...value, requireValue})}
        />
        <TriStateOption
            title={t('controlled vocabularies.recommended usage.restrict values.title')}
            help={t('controlled vocabularies.recommended usage.restrict values.help')}
            value={value.restrictValues}
            onChange={restrictValues => onChange({...value, restrictValues})}
        />
    </>;
};

const TriStateOption: FC<{
    title: string,
    help: string,
    value: boolean | null,
    onChange: (value: boolean | null) => void,
}> = ({title, help, value, onChange}) => {
    const {t} = useTranslation("detail");

    return <FormControl sx={{display: "block", mt: 1}}>
        <Typography variant="body2" component="h3">
            {title} <InfoHelp text={help} />
        </Typography>
        <RadioGroup
            row
            value={value === true ? "true" : value === false ? "false" : "null"}
            onChange={el => onChange(el.target.value === "true" ? true : el.target.value === "false" ? false : null)}
        >
            <FormControlLabel value="true" control={<Radio />} label={t('controlled vocabularies.recommended usage.yes')} />
            <FormControlLabel value="false" control={<Radio />} label={t('controlled vocabularies.recommended usage.no')} />
            <FormControlLabel value="null" control={<Radio />} label={t('controlled vocabularies.recommended usage.default')} />
        </RadioGroup>
    </FormControl>;
};
