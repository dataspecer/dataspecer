import { ExportVersionType } from "@dataspecer/git";
import { useTranslation } from "react-i18next";
import { PopOverGitGeneralComponent } from "./popover-git-general";


type ExportVersionRadioButtonsProps = {
  exportVersion: ExportVersionType,
  setExportVersion: (newExportVersion: ExportVersionType) => void,
}

export const ExportVersionRadioButtons = (props: ExportVersionRadioButtonsProps) => {
  const { t } = useTranslation();
  const oldVersionValue: ExportVersionType = 1;
  const newVersionValue: ExportVersionType = 2;

  return (
    <div className="grid grid-cols-[1fr_1.5fr] mb-4 items-center space-x-6">
      <span className="flex flex-1 flex-row text-sm">{t("git.choose-an-export-version")}:
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
          <span>Old</span>
        </label>
        <label className="flex items-center space-x-2 pl-7">
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
    </div>
  );
};


function RepositoryExportVersionTooltip() {
  return <div>
    &nbsp; - The old version maps packages to directories and the models are put as files within the specific package.
    <br/>
    &nbsp; - The new version is more structured. It still holds true that models are files, which are inside directories that were packages.
    <br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - The structure comes from the fact the models are put to a directory based on a type of the model.
    <br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - For example, packages are inside "directories" directory, and visual models are in "visual-models" directory.
  </div>;
}
