import React from "react";
import {useTranslation} from "react-i18next";
import {Icons, IconsTwoTone} from "../../../icons";
import {ActionButton} from "../common/ActionButton";
import {useTheme} from "@mui/material";

export const DataPsmDeleteButton: React.FC<{onClick: () => void}> = ({onClick}) => {
    const {t} = useTranslation("psm");
    const theme = useTheme();
    
    // Use TwoTone icons in light mode, regular icons in dark mode
    const iconSet = theme.palette.mode === 'dark' ? Icons : IconsTwoTone;
    
    return <ActionButton onClick={onClick} icon={<iconSet.Tree.Delete/>} label={t("button delete")} />;
};
