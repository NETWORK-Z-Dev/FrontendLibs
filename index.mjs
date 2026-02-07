import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export default class FrontendLibs {
    static async install(packageSpec, pathToSave) {
        try {
            const [packageName, version] = packageSpec.includes('@') && !packageSpec.startsWith('@')
                ? packageSpec.split('@')
                : [packageSpec, 'latest'];

            const targetPath = path.resolve(pathToSave, packageName);

            // delete if exists (replace with new version)
            if (fs.existsSync(targetPath)) {
                console.log(`Removing old version of ${packageName}...`);
                fs.rmSync(targetPath, { recursive: true, force: true });
            }

            const tempDir = path.join(process.cwd(), '.temp', `${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });

            const fullPackageName = `@hackthedev/${packageName}`;
            const installSpec = version === 'latest'
                ? fullPackageName
                : `${fullPackageName}@${version}`;

            console.log(`Fetching ${installSpec}...`);

            const tarballName = execSync(
                `npm pack ${installSpec}`,
                { cwd: tempDir, encoding: 'utf8' }
            ).trim();

            execSync(`tar -xzf ${tarballName}`, { cwd: tempDir });

            const extractedPath = path.join(tempDir, 'package');

            fs.mkdirSync(pathToSave, { recursive: true });

            this._copyRecursive(extractedPath, targetPath);

            fs.rmSync(tempDir, { recursive: true, force: true });

            return {
                success: true,
                message: `Successfully installed ${packageName}@${version}`,
                path: targetPath
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
            results.push({ package: pkg, ...result });
        }
        return results;
    }

    static _copyRecursive(src, dest) {
        if (!fs.existsSync(src)) return;

        if (fs.statSync(src).isDirectory()) {
            fs.mkdirSync(dest, { recursive: true });
            const entries = fs.readdirSync(src, { withFileTypes: true });

            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);

                if (entry.isDirectory()) {
                    this._copyRecursive(srcPath, destPath);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        } else {
            fs.copyFileSync(src, dest);
        }
    }
}