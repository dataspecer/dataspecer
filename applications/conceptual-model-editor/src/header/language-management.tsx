import { DropDownCatalog } from "../components/dropdown-catalog";
import { type Language, SupportedLanguages, useOptions } from "../configuration/options";

export const LanguageManagement = () => {
  const options = useOptions();
  return (
    <DropDownCatalog
      label="Language"
      valueSelected={options.language}
      openCatalogTitle="Change preferred language"
      availableValues={SupportedLanguages}
      onValueSelected={(value) => options.setLanguage(value as Language)}
    />
  );
};
