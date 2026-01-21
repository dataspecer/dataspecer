import React from "react";

import { PackageSection } from "./package-section";
import { ViewManagement } from "./view-management";
import { ExportManagement } from "./export-management";
import { LanguageManagement } from "./language-management";
import { getManagerLink } from "./header.service";
import { UiLanguageToggle } from "../user-interface/shadcn/ui-language-toggle";

import { t } from "../application";

const Header = () => {
  return (
    <>
      <header
        className="grid w-full grid-cols-1 grid-rows-[fit_auto_fit]
          justify-between bg-[#5438dc] text-white md:h-12
          md:grid-cols-[1fr_auto_1fr] md:grid-rows-1"
      >
        <div className="my-auto ml-4 flex flex-row">
          <HeaderLogo />
        </div>
        <div className="my-2 flex flex-row px-2 md:my-0 md:justify-center md:px-0">
          <div className="my-auto mr-2 flex flex-col md:flex-row [&>*]:my-1">
            <PackageSection />
            <Divider />
            <ViewManagement />
            <Divider />
            <LanguageManagement />
          </div>
        </div>
        <div className="my-2 flex flex-row px-2 md:my-0 md:justify-end md:px-0">
          <div className="flex flex-row gap-2">
            <UiLanguageToggle />
            <ExportManagement />
          </div>
        </div>
      </header>
    </>
  );
};

const HeaderLogo = () => {
  const link = getManagerLink();
  if (link === null) {
    return <DscmeLogo />;
  }
  return (
    <a href={link} className="my-auto" title={t("header.logo-title")}>
      <DscmeLogo />
    </a>
  );
};

const DscmeLogo = () => {
  return (
    <div className="my-auto flex flex-row">
      <div className="text-3xl font-bold text-white">ds</div>
      <div className="text-[15px] font-semibold text-[#ff5964]">cme</div>
    </div>
  );
};

const Divider = () => {
  return (
    <div className="mx-3 my-auto w-[1px] bg-white opacity-75" />
  );
};

export default Header;
