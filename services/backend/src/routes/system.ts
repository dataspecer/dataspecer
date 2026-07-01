import { asyncHandler } from "../utils/async-handler.ts";
import JSZip from "jszip";
import fs from "fs";
import path from "path";

const databaseDirectory = "./database";

/**
 * The purpose of this route is to ZIP all the data that is stored in database and return them as a ZIP file.
 *
 * ! This route is for development/debugging purposes only and may be removed in the future due to security reasons.
 */
export const getSystemData = asyncHandler(async (_, response) => {
    const zip = new JSZip();

    // Function to recursively add files to the ZIP
    const addFilesToZip = (dir: string, zipFolder: JSZip) => {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // If the file is a directory, create a folder in the ZIP and recurse
                const folder = zipFolder.folder(file)!; // According to the documentation, null is not possible.
                addFilesToZip(filePath, folder);
            } else {
                // If the file is a file, add it to the ZIP
                const fileData = fs.readFileSync(filePath);
                zipFolder.file(file, fileData);
            }
        });
    };

    // Start adding files from the database directory
    addFilesToZip(databaseDirectory, zip);

    // Generate the ZIP file
    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    // Set the response headers and send the ZIP file
    response.setHeader("Content-Disposition", "attachment; filename=data.zip");
    response.setHeader("Content-Type", "application/zip");
    response.send(zipContent);
});
