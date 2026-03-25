import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { validateBlueprint } from './validationService';
import { exportBundleV2 } from './apiService';

const ensureFolder = (root, folderPath = '') => {
    if (!folderPath) return root;
    return folderPath.split('/').reduce((cursor, segment) => {
        if (!segment) return cursor;
        return cursor.folder(segment);
    }, root);
};

const writeFile = (root, path, content) => {
    const normalizedPath = String(path || '').replace(/^\/+/, '').replace(/\\/g, '/');
    if (!normalizedPath) return;
    const parts = normalizedPath.split('/');
    const fileName = parts.pop();
    if (!fileName) return;
    const folderPath = parts.join('/');
    const folder = ensureFolder(root, folderPath);
    folder.file(fileName, content == null ? '' : String(content));
};

export const checkAllAnswered = (pillars) => {
    const result = validateBlueprint({ pillars });
    return result.isValid && result.warnings.length === 0;
};

export const generateBlueprintZip = async (pillars, metadata = {}, force = false, v2State = {}) => {
    if (!Array.isArray(pillars) || pillars.length === 0) {
        throw new Error('Cannot export blueprint. No architecture pillars defined. Describe your application idea first.');
    }

    const validation = validateBlueprint({ pillars });
    if (!validation.isValid) {
        const errorList = validation.errors.join('\n- ');
        throw new Error(`Cannot export blueprint. The following critical integrity checks failed:\n- ${errorList}`);
    }

    if (validation.warnings.length > 0 && !force) {
        const warningList = validation.warnings.slice(0, 3).join('\n- ');
        const moreCount = validation.warnings.length - 3;
        const msg = `Quality Warnings:\n- ${warningList}${moreCount > 0 ? `\n- ...and ${moreCount} more quality issues.` : ''}\n\nExporting now may result in low-quality agent execution. Continue anyway?`;
        const error = new Error(msg);
        error.warnings = validation.warnings;
        error.isWarning = true;
        throw error;
    }

    const projectState = {
        idea: metadata.idea || metadata.projectIdea || '',
        pillars,
        ...(v2State && typeof v2State === 'object' ? v2State : {})
    };
    const bundle = await exportBundleV2({ projectState, projectId: metadata.projectId || null });
    const rootName = typeof bundle?.root === 'string' && bundle.root.trim() ? bundle.root.trim() : 'cartograph-output';
    const files = Array.isArray(bundle?.files) ? bundle.files : [];

    if (files.length === 0) {
        throw new Error('Export failed: export.v2.bundle returned no files.');
    }

    const zip = new JSZip();
    const root = zip.folder(rootName);
    files.forEach((file) => {
        writeFile(root, file.path, file.content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'Cartograph_Output.zip');
};
