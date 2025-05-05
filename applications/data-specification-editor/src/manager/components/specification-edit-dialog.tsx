import { LanguageString } from "@dataspecer/core/core";
import { Box, Button, Checkbox, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, ListItemText, MenuItem, Select, TextField } from "@mui/material";
import { isEqual } from "lodash";
import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { dialog } from "../../editor/dialog";
import { useTranslation } from "react-i18next";

export interface SpecificationEditDialogEditableProperties {
  label: LanguageString;
  tags: string[];
  type: string;
}

/**
 * Dialog which edits basic properties of the data specification.
 */
export const SpecificationEditDialog: React.FC<{
  isOpen: boolean;
  close: () => void;

  mode: "create" | "modify";

  properties?: Partial<SpecificationEditDialogEditableProperties>;
  onSubmit: (properties: Partial<SpecificationEditDialogEditableProperties>) => Promise<void>;
}> = dialog({ maxWidth: "xs", fullWidth: true }, ({ isOpen, close, mode, properties, onSubmit }) => {
  const [label, setLabel] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const { t } = useTranslation("ui");

  useEffect(() => {
    setLabel(properties?.label?.en ?? "");
    setTags(properties?.tags ?? []);
  }, [setLabel, properties, isOpen]);

  const submit = useCallback(async () => {
    const change = {} as Partial<SpecificationEditDialogEditableProperties>;

    if (label !== properties?.label?.["en"]) {
      change.label = {
        ...properties?.label,
        en: label,
      };
    }

    if (!isEqual(mode === "create" ? [] : new Set(properties?.tags ?? []), new Set(tags))) {
      change.tags = tags;
    }

    if (properties?.type) {
      change.type = properties.type;
    }

    await onSubmit(change);
    close();
  }, [close, label, mode, onSubmit, properties?.label, properties?.tags, properties.type, tags]);

  const existingTags = [];

  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customTagField, setCustomTagField] = useState<string>("");

  const availableTags = useMemo(() => [...existingTags, ...customTags], [existingTags, customTags]);

  const tagsId = useId();

  return (
    <>
      <DialogTitle>
        {mode === "create" && "Create new data specification"}
        {mode === "modify" && "Modify data specification"}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          fullWidth
          variant="filled"
          value={label}
          label="Label"
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit().then();
            }
          }}
        />
        <FormControl variant="filled" sx={{ mt: 2, width: "100%" }}>
          <InputLabel id={tagsId}>Tags</InputLabel>
          <Select
            label={"Tags"}
            labelId={tagsId}
            multiple
            value={tags}
            fullWidth
            onChange={(e) => setTags(e.target.value as string[])}
            renderValue={(selected) => selected.join(", ")}
          >
            {availableTags.map((tag) => (
              <MenuItem key={tag} value={tag}>
                <Checkbox checked={tags.includes(tag)} />
                <ListItemText primary={tag} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
          <TextField label="New tag" size="small" fullWidth value={customTagField} onChange={(e) => setCustomTagField(e.target.value)} />
          <Button
            sx={{ width: "30%" }}
            onClick={() => {
              if (customTagField.length > 0) {
                if (!availableTags.includes(customTagField)) {
                  setCustomTags([...customTags, customTagField]);
                }
                if (!tags.includes(customTagField)) {
                  setTags([...tags, customTagField]);
                }
                setCustomTagField("");
              }
            }}
            variant="outlined"
            color="inherit"
            size="small"
          >
            Add tag
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>
          {t("discard")}
        </Button>
        <Button onClick={submit}>
          {mode === "create" && "Create"}
          {mode === "modify" && "Modify"}
        </Button>
      </DialogActions>
    </>
  );
});
