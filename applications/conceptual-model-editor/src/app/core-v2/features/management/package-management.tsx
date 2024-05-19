import { useBackendConnection } from "../../backend-connection";
import { SavePackageAndLeaveButton, SavePackageButton } from "../../components/management/buttons/save-package-buttons";
import { useModelGraphContext } from "../../context/model-context";
import { usePackageSearch } from "../../util/package-search";

const SAVE_PACKAGE = "save package to backend";
const SAVE_PACKAGE_AND_LEAVE = "save package to backend and leave back to manager";
const YOU_NEED_A_PACKAGE_ON_BACKEND =
    "to be able to save to backend, make sure you are in a package. Start with visiting manager/v2";

const MGR_REDIRECT_PATH = process.env.NEXT_PUBLIC_MANAGER_PATH;

export const PackageManagement = () => {
    const { updateSemanticModelPackageModels } = useBackendConnection();
    const { packageId } = usePackageSearch();
    const { models, visualModels } = useModelGraphContext();
    // const { showMessage, UpdatingSavePackageButton } = useUpdatingSavePackageButton();

    const handleSavePackage = async () => {
        if (!packageId) {
            return false;
        }
        const result = await updateSemanticModelPackageModels(
            packageId,
            [...models.values()],
            [...visualModels.values()]
        );

        // if (result) {
        //     showMessage("success");
        // } else {
        //     showMessage("fail");
        // }

        return result;
    };

    const handleSavePackageAndLeave = async () => {
        handleSavePackage().then(() => {
            if (!MGR_REDIRECT_PATH) {
                console.error("manager path not set", MGR_REDIRECT_PATH);
                return;
            }
            const a = document.createElement("a");
            a.setAttribute("href", MGR_REDIRECT_PATH);
            a.click();
        });
    };

    return (
        <div className="my-auto flex flex-row text-nowrap">
            <SavePackageButton
                disabled={!packageId}
                title={packageId ? SAVE_PACKAGE : YOU_NEED_A_PACKAGE_ON_BACKEND}
                onClick={handleSavePackage}
            />
            <SavePackageAndLeaveButton
                disabled={!packageId}
                title={packageId ? SAVE_PACKAGE_AND_LEAVE : YOU_NEED_A_PACKAGE_ON_BACKEND}
                onClick={handleSavePackageAndLeave}
            />
        </div>
    );
};
