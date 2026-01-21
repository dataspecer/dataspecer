import { ManagementButton } from "../components/management/buttons/management-button";
import { usePackageSectionService } from "./package-section-service";
import { useTranslation } from "../application/localization";

export const PackageSection = () => {
  const t = useTranslation();
  const { packageHasIdentifier, packageLabel, save, saveAndClose } = usePackageSectionService();
  return (
    <div className="flex flex-row text-nowrap gap-x-2">
      {packageLabel === null ? t("header.package.missing") : t("header.package.label", packageLabel)}
      <SavePackageButton
        disabled={!packageHasIdentifier}
        title={packageHasIdentifier ? t("header.package.save.title") : t("header.package.disable")}
        onClick={() => void save()}
      />
      <SavePackageAndLeaveButton
        disabled={!packageHasIdentifier}
        title={packageHasIdentifier ? t("header.package.save-and-leave.title") : t("header.package.disable")}
        onClick={() => void saveAndClose()}
      />
    </div>
  );
};

const SavePackageButton = (props: { disabled?: boolean; title?: string; onClick?: () => void }) => {
  const t = useTranslation();
  return (
    <ManagementButton color="bg-green-600" {...props} withDisabledHelpCursor={true}>
      {t("header.package.save")}
    </ManagementButton>
  );
};

const SavePackageAndLeaveButton = (props: { disabled?: boolean; title?: string; onClick?: () => void }) => {
  const t = useTranslation();
  return (
    <ManagementButton color="bg-green-600" {...props} withDisabledHelpCursor={true}>
      {t("header.package.save-and-leave")}
    </ManagementButton>
  );
};
