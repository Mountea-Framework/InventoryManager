export class FileRepository {
    constructor(dbManager) {
        this.db = dbManager;
        this.storeName = 'files';
    }

    async store(templateId, file, type) {
        try {
            const validation = this.validateFile(file, type);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            const fileData = {
                id: `${templateId}_${type}`,
                templateId: templateId,
                type: type,
                fileName: file.name,
                fileType: file.type,
                size: file.size,
                lastModified: file.lastModified,
                data: file,
                createdAt: new Date().toISOString()
            };

            await this.db.put(this.storeName, fileData);
            return fileData.id;
        } catch (error) {
            console.error('Failed to store file:', error);
            throw error;
        }
    }

    async get(fileId) {
        try {
            return await this.db.get(this.storeName, fileId);
        } catch (error) {
            console.error('Failed to get file:', error);
            return null;
        }
    }

    async delete(fileId) {
        try {
            return await this.db.delete(this.storeName, fileId);
        } catch (error) {
            console.error('Failed to delete file:', error);
            throw error;
        }
    }

    async getByTemplateId(templateId) {
        try {
            return await this.db.getByIndex(this.storeName, 'templateId', templateId);
        } catch (error) {
            console.error('Failed to get files by template ID:', error);
            return [];
        }
    }

    async getByType(type) {
        try {
            return await this.db.getByIndex(this.storeName, 'type', type);
        } catch (error) {
            console.error('Failed to get files by type:', error);
            return [];
        }
    }

    async deleteByTemplateId(templateId) {
        try {
            return await this.db.deleteByIndex(this.storeName, 'templateId', templateId);
        } catch (error) {
            console.error('Failed to delete files by template ID:', error);
            throw error;
        }
    }

    async getPreviewUrl(fileId) {
        try {
            const fileData = await this.get(fileId);
            if (!fileData || !fileData.data) return null;

            return URL.createObjectURL(fileData.data);
        } catch (error) {
            console.error('Failed to generate preview URL:', error);
            return null;
        }
    }

    validateFile(file, type) {
        if (!file) {
            return { valid: false, error: 'No file provided' };
        }

        if (type === 'icon') {
            return this.validateIconFile(file);
        } else if (type === 'mesh') {
            return this.validateMeshFile(file);
        }

        return { valid: false, error: 'Invalid file type specified' };
    }

    validateIconFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            return {
                valid: false,
                error: 'Invalid file type. Please select JPG, PNG, or BMP.'
            };
        }

        if (file.size > maxSize) {
            return {
                valid: false,
                error: 'File too large. Please select a file under 5MB.'
            };
        }

        return { valid: true };
    }

    validateMeshFile(file) {
        const validExtensions = ['.obj', '.fbx'];
        const maxSize = 50 * 1024 * 1024; // 50MB

        const hasValidExtension = validExtensions.some(ext =>
            file.name.toLowerCase().endsWith(ext)
        );

        if (!hasValidExtension) {
            return {
                valid: false,
                error: 'Invalid file type. Please select OBJ or FBX files.'
            };
        }

        if (file.size > maxSize) {
            return {
                valid: false,
                error: 'File too large. Please select a mesh file under 50MB.'
            };
        }

        return { valid: true };
    }

    async getFileInfo(fileId) {
        try {
            const fileData = await this.get(fileId);
            if (!fileData) return null;

            return {
                id: fileData.id,
                templateId: fileData.templateId,
                type: fileData.type,
                fileName: fileData.fileName,
                fileType: fileData.fileType,
                size: fileData.size,
                sizeFormatted: this.formatFileSize(fileData.size),
                lastModified: fileData.lastModified,
                createdAt: fileData.createdAt
            };
        } catch (error) {
            console.error('Failed to get file info:', error);
            return null;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    async getAllFiles() {
        try {
            return await this.db.getAll(this.storeName);
        } catch (error) {
            console.error('Failed to get all files:', error);
            return [];
        }
    }

    async count() {
        try {
            return await this.db.count(this.storeName);
        } catch (error) {
            console.error('Failed to count files:', error);
            return 0;
        }
    }

    async getTotalStorageUsed() {
        try {
            const files = await this.getAllFiles();
            return files.reduce((total, file) => total + (file.size || 0), 0);
        } catch (error) {
            console.error('Failed to calculate storage usage:', error);
            return 0;
        }
    }

    async getStorageStatistics() {
        try {
            const files = await this.getAllFiles();
            
            const stats = {
                totalFiles: files.length,
                totalSize: 0,
                iconFiles: 0,
                meshFiles: 0,
                iconSize: 0,
                meshSize: 0,
                largestFile: null,
                smallestFile: null
            };

            files.forEach(file => {
                stats.totalSize += file.size || 0;
                
                if (file.type === 'icon') {
                    stats.iconFiles++;
                    stats.iconSize += file.size || 0;
                } else if (file.type === 'mesh') {
                    stats.meshFiles++;
                    stats.meshSize += file.size || 0;
                }

                if (!stats.largestFile || file.size > stats.largestFile.size) {
                    stats.largestFile = file;
                }

                if (!stats.smallestFile || file.size < stats.smallestFile.size) {
                    stats.smallestFile = file;
                }
            });

            stats.totalSizeFormatted = this.formatFileSize(stats.totalSize);
            stats.iconSizeFormatted = this.formatFileSize(stats.iconSize);
            stats.meshSizeFormatted = this.formatFileSize(stats.meshSize);

            return stats;
        } catch (error) {
            console.error('Failed to get storage statistics:', error);
            return null;
        }
    }

    async cleanup() {
        try {
            const files = await this.getAllFiles();
            const templates = await this.db.getAll('templates');
            
            const templateIds = new Set(templates.map(t => t.id));
            const orphanedFiles = files.filter(file => !templateIds.has(file.templateId));
            
            for (const file of orphanedFiles) {
                await this.delete(file.id);
            }
            
            return orphanedFiles.length;
        } catch (error) {
            console.error('Failed to cleanup files:', error);
            throw error;
        }
    }

    async exportFile(fileId) {
        try {
            const fileData = await this.get(fileId);
            if (!fileData) return null;

            return {
                fileName: fileData.fileName,
                data: fileData.data,
                type: fileData.type,
                metadata: {
                    templateId: fileData.templateId,
                    fileType: fileData.fileType,
                    size: fileData.size,
                    lastModified: fileData.lastModified
                }
            };
        } catch (error) {
            console.error('Failed to export file:', error);
            return null;
        }
    }

    async replaceFile(templateId, file, type) {
        try {
            const existingFileId = `${templateId}_${type}`;
            const existingFile = await this.get(existingFileId);
            if (existingFile) {
                await this.delete(existingFileId);
            }

            return await this.store(templateId, file, type);
        } catch (error) {
            console.error('Failed to replace file:', error);
            throw error;
        }
    }

    async clear() {
        try {
            return await this.db.clear(this.storeName);
        } catch (error) {
            console.error('Failed to clear files:', error);
            throw error;
        }
    }

    getFileTypeIcon(fileType) {
        if (fileType.startsWith('image/')) {
            return '🖼️';
        } else if (fileType.includes('fbx') || fileType.includes('obj')) {
            return '🎨';
        }
        return '📄';
    }

    isImageFile(fileType) {
        return fileType && fileType.startsWith('image/');
    }

    isMeshFile(fileName) {
        const meshExtensions = ['.obj', '.fbx'];
        return meshExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    }
}