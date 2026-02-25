import React, { useRef } from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslation } from "react-i18next";
import { useToggle } from "../editor/hooks/use-toggle";
import { useTheme } from "next-themes";

/**
 * The button in top application bar which allows switching between light and dark themes.
 */
export const ThemeSelector: React.FC = () => {
  const { t } = useTranslation("ui");
  const ref = useRef(null);
  const { isOpen, open, close } = useToggle();
  const { theme, setTheme } = useTheme();

  const selectTheme = (newTheme: string) => {
    close();
    setTheme(newTheme);
  };

  const getIcon = () => {
    if (theme === "dark") return <Brightness4Icon color="inherit" />;
    if (theme === "light") return <Brightness7Icon color="inherit" />;
    return <SettingsBrightnessIcon color="inherit" />;
  };

  return (
    <>
      <Button
        startIcon={getIcon()}
        endIcon={<ExpandMoreIcon color="inherit" />}
        onClick={open}
        color="inherit"
        ref={ref}
      >
        {t(`theme.${theme || "system"}`)}
      </Button>
      <Menu anchorEl={ref.current} keepMounted open={isOpen} onClose={close}>
        <MenuItem onClick={() => selectTheme("light")}>{t("theme.light")}</MenuItem>
        <MenuItem onClick={() => selectTheme("dark")}>{t("theme.dark")}</MenuItem>
        <MenuItem onClick={() => selectTheme("system")}>{t("theme.system")}</MenuItem>
      </Menu>
    </>
  );
};
