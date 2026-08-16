import fs from 'fs';
import path from 'path';
import {execSync} from "node:child_process";

export default class FrontendLibs {
    static host = "https://dist.dcts.community";

    static installFromBun(identifier, version = null){
        let packageIdentifier = `${identifier}${version ? `@${version}` : ""}`;

        try{
            execSync(`bun install "${packageIdentifier}" --ignore-scripts`, {
                stdio: "inherit"
            });

            return true;
        }
        catch{
            return false;
        }
    }

    static async install(packageSpec, pathToSave) {
        try {
            let packageName, version = null;

            // parse package name and version from spec
            const atIndex = packageSpec.lastIndexOf('@');

            if (atIndex > 0) {
                packageName = packageSpec.substring(0, atIndex);
                version = packageSpec.substring(atIndex + 1);
            } else {
                packageName = packageSpec;
            }

            if(!version) throw new Error("Package version is required!")

            // extract clean folder name from scoped package
            const folderName = packageName.includes('/')
                ? packageName.split('/').pop()
                : packageName;

            const targetPath = path.resolve(pathToSave, folderName);
            const versionFile = path.join(targetPath, '.version');

            const packagePath = packageName
                .split('/')
                .map(part => encodeURIComponent(part))
                .join('/');

            const filesResponse = await fetch(
                `${this.host}/api/package/${packagePath}/files/no-version`
            );

            // get response
            const filesResult = await filesResponse.json();

            if (filesResult.error) {
                if(filesResponse?.status === 404){
                    // fallback to bun install and if successful return right away
                    let bunRes = this.installFromBun(packageName, version)
                    if(!bunRes) throw new Error(filesResult.error);

                    if(bunRes === true) {
                        return {
                            success: true,
                            message: `Successfully installed ${packageSpec}`,
                            path: targetPath,
                            skipped: false
                        };
                    }
                    else{
                        return {
                            success: false,
                            message: `Failed to install ${packageSpec}`,
                            path: targetPath,
                            skipped: false
                        };
                    }
                }
                else{
                    throw new Error(filesResult.error);
                }
            }

            // api lists files n shit so we need that info lol
            const files = filesResult.files;
            const resolvedVersion = version ?? filesResult.version;

            if (!files?.length) {
                throw new Error("Package contains no files");
            }

            if (fs.existsSync(targetPath) && fs.existsSync(versionFile)) {
                const installedVersion = fs.readFileSync(versionFile, 'utf8').trim();

                if (installedVersion === resolvedVersion) {
                    return {
                        success: true,
                        message: `Package ${packageName}@${resolvedVersion} already installed. Skipped.`,
                        path: targetPath,
                        skipped: true
                    };
                }

                fs.rmSync(targetPath, {
                    recursive: true,
                    force: true
                });
            }

            fs.mkdirSync(targetPath, {
                recursive: true
            });

            for (const file of files) {
                const encodedFilePath = file
                    .split('/')
                    .map(part => encodeURIComponent(part))
                    .join('/');

                const fileUrl = version
                    ? `${this.host}/api/package/${packagePath}/${version}/${encodedFilePath}`
                    : `${this.host}/api/package/${packagePath}/${encodedFilePath}`;

                const response = await fetch(fileUrl);

                if (!response.ok) {
                    throw new Error(`Could not download ${file}`);
                }

                const targetFilePath = path.join(targetPath, file);

                fs.mkdirSync(path.dirname(targetFilePath), {
                    recursive: true
                });

                fs.writeFileSync(
                    targetFilePath,
                    Buffer.from(await response.arrayBuffer())
                );
            }

            if (version) {
                // write version file
                fs.writeFileSync(versionFile, version, 'utf8');
            }

            return {
                success: true,
                message: `Successfully installed ${packageSpec}`,
                path: targetPath,
                skipped: false
            };

        } catch (error) {
            return {
                success: false,
                message: `Error installing ${packageSpec}: ${error.message}`
            };
        }
    }

    static async installMultiple(packages) {
        const results = [];

        for (const { package: pkg, path: pathToSave } of packages) {
            const result = await this.install(pkg, pathToSave);
            results.push({
                package: pkg,
                ...result
            });
        }

        return results;
    }
}