import { DropDownCatalog } from "../components/management/dropdown-catalog";
import { useOptions, SupportedLanguages, type Language } from "../application/options";

export const LanguageManagement = () => {
    const options = useOptions();
    return (
        <DropDownCatalog
            catalogName="lang"
            valueSelected={options.language}
            openCatalogTitle="Change preferred language"
            availableValues={SupportedLanguages}
            onValueSelected={(value) => options.setLanguage(value as Language)}
        />
    );
};
