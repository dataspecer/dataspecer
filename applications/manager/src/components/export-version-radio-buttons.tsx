import { ExportVersionType } from "@dataspecer/git";
import { useTranslation } from "react-i18next";
import { PopOverGitGeneralComponent } from "./popover-git-general";


type ExportVersionRadioButtonsProps = {
  exportVersion: ExportVersionType,
  setExportVersion: (newExportVersion: ExportVersionType) => void,
}

/**
 * Radio buttons that lets user choose between (currently two) export version.
 * The original one and more structured, that puts models into directories based on their type.
 */
export const ExportVersionRadioButtons = (props: ExportVersionRadioButtonsProps) => {
  const { t } = useTranslation();
  const oldVersionValue: ExportVersionType = 1;
  const newVersionValue: ExportVersionType = 2;

  return (
    <div className="grid grid-cols-[1fr_1.5fr] mb-4 items-center space-x-6">
      <span className="flex flex-1 flex-row text-sm">{t("git.choose-an-export-version")}
        <div className="">
          <PopOverGitGeneralComponent>
            <RepositoryExportVersionTooltip/>
          </PopOverGitGeneralComponent>
        </div>
      </span>

      <div className="flex flex-1 flex-row pb-4">
        <label className="flex items-center space-x-2 pl-8">
          <input
            type="radio"
            value={oldVersionValue}
            checked={props.exportVersion === oldVersionValue}
            onChange={(e) => props.setExportVersion(Number(e.target.value) as ExportVersionType)}
            className="form-radio text-blue-600"
          />
          <span>{t("git.export-version-old")}</span>
        </label>
        <label className="flex items-center space-x-2 pl-7">
          <input
            type="radio"
            value={newVersionValue}
            checked={props.exportVersion === newVersionValue}
            onChange={(e) => props.setExportVersion(Number(e.target.value) as ExportVersionType)}
            className="form-radio text-blue-600"
          />
          <span>{t("git.export-version-new")}</span>
        </label>
      </div>
    </div>
  );
};


function RepositoryExportVersionTooltip() {
  const { t } = useTranslation();

  return <div>
    {t("git.export-version-tooltip.old")}
    <br/>
    {t("git.export-version-tooltip.new")}
    <br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {t("git.export-version-tooltip.structure")}
    <br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {t("git.export-version-tooltip.example")}
  </div>;
}
