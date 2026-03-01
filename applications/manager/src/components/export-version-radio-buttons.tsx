import { ExportVersionType } from "@dataspecer/git";
import { useTranslation } from "react-i18next";


type ExportVersionRadioButtonsProps = {
  exportVersion: ExportVersionType,
  setExportVersion: (newExportVersion: ExportVersionType) => void,
}

export const ExportVersionRadioButtons = (props: ExportVersionRadioButtonsProps) => {
  const { t } = useTranslation();
  const oldVersionValue: ExportVersionType = 1;
  const newVersionValue: ExportVersionType = 2;

  return (
    <div className="mt-4 mb-4 flex items-center space-x-6">
      <span className="text-sm font-semibold">{t("git.choose-an-export-version")}:</span>

      <label className="flex items-center space-x-2">
        <input
          type="radio"
          value={oldVersionValue}
          checked={props.exportVersion === oldVersionValue}
          onChange={(e) => props.setExportVersion(Number(e.target.value) as ExportVersionType)}
          className="form-radio text-blue-600"
        />
        <span>Old</span>
      </label>
      <label className="flex items-center space-x-2">
        <input
          type="radio"
          value={newVersionValue}
          checked={props.exportVersion === newVersionValue}
          onChange={(e) => props.setExportVersion(Number(e.target.value) as ExportVersionType)}
          className="form-radio text-blue-600"
        />
        <span>New (more structured)</span>
      </label>
    </div>
  );
};
