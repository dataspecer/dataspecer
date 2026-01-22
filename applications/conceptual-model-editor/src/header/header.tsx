import React from "react";

import { PackageSection } from "./package-section";
import { ViewManagement } from "./view-management";
import { ExportManagement } from "./export-management";
import { LanguageManagement } from "./language-management";
import { getManagerLink } from "./header.service";

import { t } from "../application";

const Header = () => {
  return (
    <>
      <header
        className="flex w-full flex-wrap justify-between bg-[#5438dc] text-white"
      >
        <div className="ml-4 my-1 flex flex-row">
          <HeaderLogo />
        </div>
        <div className="my-2 flex flex-row px-2 md:my-0 md:justify-center md:px-0">
          <div className="my-auto mr-2 flex flex-wrap [&>*]:my-1">
            <PackageSection />
            <Divider />
            <ViewManagement />
            <Divider />
            <LanguageManagement />
          </div>
        </div>
        <div className="my-2 flex flex-row px-2 md:my-0 md:justify-end md:px-0">
          <ExportManagement />
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
