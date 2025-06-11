export class FileHandler {
    constructor(editor) {
        this.editor = editor;
        this.initializeFileHandlers();
    }

    initializeFileHandlers() {
        const iconInput = document.getElementById('iconPath');
        const meshInput = document.getElementById('meshPath');

        iconInput.addEventListener('change', (e) => this.handleFileSelection(e, 'icon'));
        meshInput.addEventListener('change', (e) => this.handleFileSelection(e, 'mesh'));
    }

    async handleFileSelection(event, fileType) {
        const file = event.target.files[0];
        const input = event.target;

        this.clearFileDisplay(input);

        if (!file) return;

        if (!this.editor.currentTemplate) {
            this.editor.notifications.show('Please create or select a template first', 'error');
            input.value = '';
            return;
        }

        const validation = this.editor.fileRepo.validateFile(file, fileType);
        if (!validation.valid) {
            this.editor.notifications.show(validation.error, 'error');
            input.value = '';
            return;
        }

        try {
            const oldFileId = fileType === 'icon' 
                ? this.editor.currentTemplate.iconFileId 
                : this.editor.currentTemplate.meshFileId;

            if (oldFileId) {
                await this.editor.fileRepo.delete(oldFileId);
            }

            const fileId = await this.editor.fileRepo.store(
                this.editor.currentTemplate.id, 
                file, 
                fileType
            );

            if (fileType === 'icon') {
                this.editor.currentTemplate.iconFileId = fileId;
            } else {
                this.editor.currentTemplate.meshFileId = fileId;
            }

            await this.editor.templateRepo.save(this.editor.currentTemplate);
            await this.editor.ui.showFileInfo(this.editor.currentTemplate, fileType);
            this.editor.ui.updatePreview();

            this.editor.notifications.show(`${fileType} file stored successfully!`, 'success');
        } catch (error) {
            console.error('File storage error:', error);
            this.editor.notifications.show(`Failed to store ${fileType} file`, 'error');
            input.value = '';
        }
    }

    clearFileDisplay(input) {
        const fileGroup = input.closest('.form-group');
        const existingInfo = fileGroup.querySelector('.file-info-display');
        if (existingInfo) existingInfo.remove();
    }

    async removeFile(templateId, fileType) {
        try {
            const template = await this.editor.templateRepo.getById(templateId);
            if (!template) return false;

            const fileId = fileType === 'icon' ? template.iconFileId : template.meshFileId;
            if (!fileId) return false;

            await this.editor.fileRepo.delete(fileId);

            if (fileType === 'icon') {
                template.iconFileId = null;
            } else {
                template.meshFileId = null;
            }

            await this.editor.templateRepo.save(template);

            if (this.editor.currentTemplate?.id === templateId) {
                this.editor.currentTemplate = template;
                this.clearFileDisplay(document.getElementById(fileType === 'icon' ? 'iconPath' : 'meshPath'));
            }

            this.editor.notifications.show(`${fileType} file removed successfully`, 'success');
            return true;
        } catch (error) {
            console.error('File removal error:', error);
            this.editor.notifications.show(`Failed to remove ${fileType} file`, 'error');
            return false;
        }
    }

    async replaceFile(templateId, file, fileType) {
        try {
            const template = await this.editor.templateRepo.getById(templateId);
            if (!template) return false;

            const validation = this.editor.fileRepo.validateFile(file, fileType);
            if (!validation.valid) {
                this.editor.notifications.show(validation.error, 'error');
                return false;
            }

            const fileId = await this.editor.fileRepo.replaceFile(templateId, file, fileType);

            if (fileType === 'icon') {
                template.iconFileId = fileId;
            } else {
                template.meshFileId = fileId;
            }

            await this.editor.templateRepo.save(template);

            if (this.editor.currentTemplate?.id === templateId) {
                this.editor.currentTemplate = template;
                await this.editor.ui.showFileInfo(template, fileType);
            }

            this.editor.notifications.show(`${fileType} file replaced successfully`, 'success');
            return true;
        } catch (error) {
            console.error('File replacement error:', error);
            this.editor.notifications.show(`Failed to replace ${fileType} file`, 'error');
            return false;
        }
    }

    async getFilePreview(fileId) {
        try {
            return await this.editor.fileRepo.getPreviewUrl(fileId);
        } catch (error) {
            console.error('Preview generation error:', error);
            return null;
        }
    }

    async downloadFile(fileId, filename = null) {
        try {
            const fileData = await this.editor.fileRepo.exportFile(fileId);
            if (!fileData) {
                this.editor.notifications.show('File not found', 'error');
                return;
            }

            const blob = new Blob([fileData.data], { type: fileData.metadata.fileType });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || fileData.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.editor.notifications.show('File downloaded successfully', 'success');
        } catch (error) {
            console.error('File download error:', error);
            this.editor.notifications.show('Failed to download file', 'error');
        }
    }

    async getFileInfo(fileId) {
        try {
            return await this.editor.fileRepo.getFileInfo(fileId);
        } catch (error) {
            console.error('File info error:', error);
            return null;
        }
    }

    async getAllFilesForTemplate(templateId) {
        try {
            return await this.editor.fileRepo.getByTemplateId(templateId);
        } catch (error) {
            console.error('Template files error:', error);
            return [];
        }
    }

    async cleanupOrphanedFiles() {
        try {
            const orphanedCount = await this.editor.fileRepo.cleanup();
            if (orphanedCount > 0) {
                this.editor.notifications.show(`Cleaned up ${orphanedCount} orphaned files`, 'success');
            } else {
                this.editor.notifications.show('No orphaned files found', 'info');
            }
            return orphanedCount;
        } catch (error) {
            console.error('Cleanup error:', error);
            this.editor.notifications.show('Failed to cleanup files', 'error');
            return 0;
        }
    }

    async getStorageStats() {
        try {
            return await this.editor.fileRepo.getStorageStatistics();
        } catch (error) {
            console.error('Storage stats error:', error);
            return null;
        }
    }

    validateUpload(file, fileType) {
        return this.editor.fileRepo.validateFile(file, fileType);
    }

    getMaxFileSize(fileType) {
        return fileType === 'icon' ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    }

    getSupportedFormats(fileType) {
        if (fileType === 'icon') {
            return ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
        } else if (fileType === 'mesh') {
            return ['.obj', '.fbx'];
        }
        return [];
    }

    formatFileSize(bytes) {
        return this.editor.fileRepo.formatFileSize(bytes);
    }

    createFileUploadUI(container, fileType, onFileSelected) {
        const uploadDiv = document.createElement('div');
        uploadDiv.className = 'file-upload-area';
        uploadDiv.style.cssText = `
            border: 2px dashed var(--border-color);
            border-radius: var(--border-radius-md);
            padding: var(--spacing-lg);
            text-align: center;
            background: var(--bg-light);
            transition: border-color 0.3s ease;
            cursor: pointer;
        `;

        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';
        input.accept = this.getSupportedFormats(fileType).join(',');

        const label = document.createElement('div');
        label.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">
                ${fileType === 'icon' ? '🖼️' : '🎨'}
            </div>
            <div>Click to select ${fileType} file</div>
            <div style="font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--spacing-xs);">
                ${this.getSupportedFormats(fileType).join(', ')} • Max ${this.formatFileSize(this.getMaxFileSize(fileType))}
            </div>
        `;

        uploadDiv.appendChild(input);
        uploadDiv.appendChild(label);

        uploadDiv.addEventListener('click', () => input.click());
        
        uploadDiv.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadDiv.style.borderColor = 'var(--primary-color)';
        });

        uploadDiv.addEventListener('dragleave', () => {
            uploadDiv.style.borderColor = 'var(--border-color)';
        });

        uploadDiv.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadDiv.style.borderColor = 'var(--border-color)';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        input.addEventListener('change', (e) => {
            if (onFileSelected && e.target.files[0]) {
                onFileSelected(e.target.files[0], fileType);
            }
        });

        container.appendChild(uploadDiv);
        return { uploadDiv, input };
    }

    async createFileManager() {
        const modal = document.createElement('div');
        modal.className = 'file-manager-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--bg-white);
            border-radius: var(--border-radius-md);
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            padding: var(--spacing-lg);
        `;

        const header = document.createElement('div');
        header.innerHTML = `
            <h3 style="margin: 0 0 var(--spacing-md) 0;">File Manager</h3>
            <button id="closeFileManager" style="float: right; margin-top: -2rem;">×</button>
        `;

        const stats = await this.getStorageStats();
        const statsDiv = document.createElement('div');
        statsDiv.innerHTML = `
            <p><strong>Storage Statistics:</strong></p>
            <ul>
                <li>Total Files: ${stats?.totalFiles || 0}</li>
                <li>Total Size: ${stats?.totalSizeFormatted || '0 Bytes'}</li>
                <li>Icon Files: ${stats?.iconFiles || 0} (${stats?.iconSizeFormatted || '0 Bytes'})</li>
                <li>Mesh Files: ${stats?.meshFiles || 0} (${stats?.meshSizeFormatted || '0 Bytes'})</li>
            </ul>
        `;

        const actions = document.createElement('div');
        actions.innerHTML = `
            <button id="cleanupFiles" class="btn btn-secondary">Cleanup Orphaned Files</button>
        `;

        content.appendChild(header);
        content.appendChild(statsDiv);
        content.appendChild(actions);
        modal.appendChild(content);

        document.getElementById('closeFileManager').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        document.getElementById('cleanupFiles').addEventListener('click', async () => {
            await this.cleanupOrphanedFiles();
            document.body.removeChild(modal);
        });

        document.body.appendChild(modal);
    }
}