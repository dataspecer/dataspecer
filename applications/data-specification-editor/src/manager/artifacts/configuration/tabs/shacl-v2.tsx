import { DeepPartial } from "@dataspecer/core/core/utilities/deep-partial";
import type { SemanticModelsToShaclConfiguration } from "@dataspecer/shacl-v2";
import type { PartialShaclConfiguration, ShaclConfiguration } from "@dataspecer/specification/shacl-v2";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Box, Divider, FormGroup, Grid, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { FC, useRef, useState } from "react";
import { SwitchWithDefault } from "../ui-components/index";

type FileConfig = DeepPartial<SemanticModelsToShaclConfiguration>;

/** Per-file configuration panel */
const FileConfigPanel: FC<{
  fileConfig: FileConfig;
  defaultConfig?: SemanticModelsToShaclConfiguration;
  onChange: (updated: FileConfig) => void;
}> = ({ fileConfig, defaultConfig, onChange }) => {
  const languages: string[] = Array.isArray((fileConfig as any)?.languages) ? ((fileConfig as any).languages as string[]) : [];
  const languagesText = languages.join(", ");

  const handleLanguagesChange = (value: string) => {
    const parsed = value
      .split(/[^a-zA-Z0-9]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const updated: FileConfig = { ...fileConfig, languages: [... new Set(parsed)] };
    onChange(updated);
  };

  const handleSwitchChange = (updated: Record<string, any>) => {
    // SwitchWithDefault spreads `current` and sets/deletes one key.
    // We need to merge that back with the full fileConfig so languages are preserved.
    onChange({ ...fileConfig, ...updated } as FileConfig);
  };

  return (
    <Box sx={{ pt: 1 }}>
      <Typography variant="subtitle2" component="h4">
        Languages
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Comma-separated language tags for <code>sh:name</code> and <code>sh:description</code>. For example: <code>en, cs</code> or <code>en, de, fr</code>. Leave empty to include all languages.
      </Typography>
      <TextField
        variant="standard"
        label="Comma-separated languages or empty for all"
        placeholder="cs, en, de"
        defaultValue={languagesText}
        onChange={(e) => handleLanguagesChange(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle2" component="h4" sx={{ mt: 1 }}>
        Constraints
      </Typography>
      <Grid container rowGap={1}>
        <Grid item xs={12}>
          <SwitchWithDefault label="No class constraints" current={fileConfig ?? {}} itemKey="noClassConstraints" onChange={handleSwitchChange} default={defaultConfig} />
        </Grid>
        <Grid item xs={12}>
          <SwitchWithDefault
            label="Split property shapes by constraints"
            current={fileConfig ?? {}}
            itemKey="splitPropertyShapesByConstraints"
            onChange={handleSwitchChange}
            default={defaultConfig}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export const ShaclV2: FC<{
  input: PartialShaclConfiguration;
  defaultObject?: ShaclConfiguration;
  onChange: (options: PartialShaclConfiguration) => void;
}> = ({ input, onChange, defaultObject }) => {
  const [newFileName, setNewFileName] = useState("");
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Always include the default ("") file in the normalised view
  const files = { "": {}, ...(input.files ?? {}) } as Record<string, FileConfig>;

  // Ensure the default file ("") is always shown first
  const sortedKeys = Object.keys(files).sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    return a.localeCompare(b);
  });

  const updateFile = (key: string, updated: FileConfig) => {
    onChange({ files: { ...files, [key]: updated } });
  };

  const removeFile = (key: string) => {
    const next = { ...files };
    delete next[key];
    onChange({ files: next });
  };

  const addFile = () => {
    const name = newFileName.trim();
    if (name in files) return;
    onChange({ files: { ...files, [name]: {} } });
    setNewFileName("");
  };

  const startRename = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingKey(key);
    setRenameValue(key);
    // Focus the input on the next tick
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const commitRename = () => {
    if (renamingKey === null) return;
    const newKey = renameValue.trim();
    if (newKey === renamingKey) {
      setRenamingKey(null);
      return;
    }
    if (newKey in files) {
      // Name collision — abort
      setRenamingKey(null);
      return;
    }
    const next: Record<string, FileConfig> = {};
    for (const k of Object.keys(files)) {
      next[k === renamingKey ? newKey : k] = files[k];
    }
    onChange({ files: next });
    setRenamingKey(null);
  };

  return (
    <FormGroup>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Each entry below represents one output file for SHACL. Additional entries produce extra files with the given name as suffix.
      </Typography>

      {sortedKeys.map((key) => (
        <Accordion key={key} disableGutters variant="outlined" sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1 }}>
              {renamingKey === key ? (
                <TextField
                  inputRef={renameInputRef}
                  variant="standard"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setRenamingKey(null);
                    }
                  }}
                  onBlur={commitRename}
                  error={renameValue.trim() !== key && renameValue.trim() in files}
                  helperText={renameValue.trim() !== key && renameValue.trim() in files ? "A file with this name already exists." : "Press Enter to confirm, Escape to cancel."}
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
              ) : (
                <Typography sx={{ flexGrow: 1 }}>
                  {key === "" ? (
                    <em>Default file</em>
                  ) : (
                    <>
                      <strong>Suffix: </strong>
                      {key}
                    </>
                  )}
                </Typography>
              )}
              {key !== "" && renamingKey !== key && (
                <Tooltip title="Rename this file">
                  <IconButton size="small" onClick={(e) => startRename(key, e)}>
                    <DriveFileRenameOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {key !== "" && renamingKey !== key && (
                <Tooltip title="Remove this file">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(key);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <FileConfigPanel fileConfig={files[key] ?? {}} defaultConfig={defaultObject.files?.[key]} onChange={(updated) => updateFile(key, updated)} />
          </AccordionDetails>
        </Accordion>
      ))}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Add new file
      </Typography>
      <Grid container alignItems="center" spacing={1}>
        <Grid item xs>
          <TextField
            variant="standard"
            label="File name suffix"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFile();
              }
            }}
            // error={newFileName.trim() in files}
            // helperText={newFileName.trim() in files ? "A file with this name already exists." : undefined}
            fullWidth
          />
        </Grid>
        <Grid item>
          <IconButton onClick={addFile} size="small" disabled={newFileName.trim() in files}>
            <AddIcon />
          </IconButton>
        </Grid>
      </Grid>
    </FormGroup>
  );
};
