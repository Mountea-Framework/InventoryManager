export class ImportExport {
    constructor(editor) {
        this.editor = editor;
        this.supportedVersions = ['1.0.0', '1.1.0'];
    }

    async exportTemplates() {
        try {
            const data = await this.editor.templateRepo.exportTemplates();
            const fileName = `mountea_inventory_templates_${new Date().toISOString().slice(0, 10)}.json`;
            this.downloadFile(JSON.stringify(data, null, 2), fileName, 'application/json');
            this.editor.showNotification('Templates exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.editor.showNotification('Failed to export templates', 'error');
        }
    }

    async exportSingleTemplate() {
        try {
            if (!this.editor.currentTemplate) {
                this.editor.showNotification('No template selected', 'error');
                return;
            }

            const data = await this.editor.templateRepo.exportTemplates([this.editor.currentTemplate.id]);
            const fileName = `${this.editor.currentTemplate.itemName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            this.downloadFile(JSON.stringify(data, null, 2), fileName, 'application/json');
            this.editor.showNotification('Template exported successfully', 'success');
        } catch (error) {
            console.error('Single export failed:', error);
            this.editor.showNotification('Failed to export template', 'error');
        }
    }

    async exportMultipleTemplates() {
        try {
            const selectedIds = [...this.editor.selectedTemplates];
            const data = await this.editor.templateRepo.exportTemplates(selectedIds.length > 0 ? selectedIds : null);
            
            const count = selectedIds.length > 0 ? selectedIds.length : this.editor.templates.length;
            const fileName = `mountea_inventory_${count}_templates_${new Date().toISOString().slice(0, 10)}.json`;
            
            this.downloadFile(JSON.stringify(data, null, 2), fileName, 'application/json');
            this.editor.showNotification(`${count} template(s) exported successfully`, 'success');
        } catch (error) {
            console.error('Multiple export failed:', error);
            this.editor.showNotification('Failed to export templates', 'error');
        }
    }

    async exportToUnrealFormat() {
        try {
            const selectedIds = [...this.editor.selectedTemplates];
            const templates = selectedIds.length > 0 
                ? await Promise.all(selectedIds.map(id => this.editor.templateRepo.get(id)))
                : this.editor.templates;

            const unrealData = this.convertToUnrealFormat(templates.filter(t => t !== null));
            const fileName = `MounteaInventoryItems_${new Date().toISOString().slice(0, 10)}.mnteaitems`;
            
            this.downloadFile(JSON.stringify(unrealData, null, 2), fileName, 'application/json');
            this.editor.showNotification('Unreal format exported successfully', 'success');
        } catch (error) {
            console.error('Unreal export failed:', error);
            this.editor.showNotification('Failed to export to Unreal format', 'error');
        }
    }

    convertToUnrealFormat(templates) {
        return {
            Version: "1.1.0",
            ExportDate: new Date().toISOString(),
            Items: templates.map(template => ({
                ItemID: template.itemID,
                ItemName: template.itemName,
                DisplayName: template.displayName,
                ThumbnailDescription: template.thumbnailDescription || "",
                Description: template.description || "",
                ItemType: template.itemType,
                ItemSubCategory: template.itemSubCategory || "",
                Rarity: template.rarity,
                MaxStackSize: template.maxStackSize,
                MaxQuantity: template.maxQuantity || 0,
                Weight: template.weight,
                Value: template.value,
                Durability: template.durability,
                Tags: template.tags || [],
                bHasWeight: template.bHasWeight || false,
                bHasPrice: template.bHasPrice || false,
                bHasDurability: template.bHasDurability || false,
                BasePrice: template.basePrice || 0,
                SellPriceCoefficient: template.sellPriceCoefficient || 0.5,
                MaxDurability: template.maxDurability || 100,
                BaseDurability: template.baseDurability || 100,
                DurabilityPenalization: template.durabilityPenalization || 1.0,
                DurabilityToPriceCoefficient: template.durabilityToPriceCoefficient || 1.0,
                bIsStackable: template.isStackable || false,
                bIsDroppable: template.isDroppable !== false,
                bIsUsable: template.isUsable || false,
                bIsEquippable: template.isEquippable || false,
                bIsTradeable: template.isTradeable !== false,
                bIsQuestItem: template.isQuestItem || false,
                IconPath: template.iconPath || "",
                MeshPath: template.meshPath || "",
                Materials: template.materials || [],
                EquipSlot: template.equipSlot || "none",
                CustomProperties: this.convertCustomPropertiesToUnreal(template.customProperties || [])
            }))
        };
    }

    convertCustomPropertiesToUnreal(customProperties) {
        const unrealProps = {};
        customProperties.forEach(prop => {
            if (prop.name && prop.value) {
                unrealProps[prop.name] = prop.value;
            }
        });
        return unrealProps;
    }

    importTemplate() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
        }
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await this.readFileAsText(file);
            const data = JSON.parse(text);
            
            if (!this.validateImportData(data)) {
                this.editor.showNotification('Invalid file format', 'error');
                return;
            }

            const result = await this.editor.templateRepo.importTemplates(data);
            
            if (result.errors.length > 0) {
                console.warn('Import warnings:', result.errors);
            }

            this.editor.templates = await this.editor.templateRepo.getAll();
            this.editor.ui.renderTemplatesList();
            
            const message = result.errors.length > 0 
                ? `Imported ${result.imported.length}/${result.total} templates (${result.errors.length} failed)`
                : `Successfully imported ${result.imported.length} template(s)`;
            
            this.editor.showNotification(message, result.errors.length > 0 ? 'warning' : 'success');
            
        } catch (error) {
            console.error('Import failed:', error);
            this.editor.showNotification('Failed to import file: ' + error.message, 'error');
        } finally {
            event.target.value = '';
        }
    }

    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        if (!data.version || !this.supportedVersions.includes(data.version)) {
            console.warn('Unsupported version:', data.version);
        }

        if (!data.templates || !Array.isArray(data.templates)) {
            return false;
        }

        return data.templates.every(template => 
            template && 
            typeof template === 'object' && 
            template.itemName && 
            template.itemID
        );
    }

    migrateImportData(data) {
        const migrated = { ...data };
        
        if (!migrated.version) {
            migrated.version = '1.0.0';
        }

        migrated.templates = migrated.templates.map(template => {
            const migratedTemplate = { ...template };

            if (migratedTemplate.materialPath && !migratedTemplate.materials) {
                const materialName = this.extractMaterialNameFromPath(migratedTemplate.materialPath);
                migratedTemplate.materials = [{
                    name: materialName,
                    path: migratedTemplate.materialPath
                }];
                delete migratedTemplate.materialPath;
            }

            if (!Array.isArray(migratedTemplate.materials)) {
                migratedTemplate.materials = [];
            }

            if (!Array.isArray(migratedTemplate.tags)) {
                migratedTemplate.tags = [];
            }

            if (!Array.isArray(migratedTemplate.customProperties)) {
                migratedTemplate.customProperties = [];
            }

            if (migratedTemplate.CustomProperties && typeof migratedTemplate.CustomProperties === 'object') {
                migratedTemplate.customProperties = Object.entries(migratedTemplate.CustomProperties).map(([key, value]) => ({
                    name: key,
                    value: String(value)
                }));
                delete migratedTemplate.CustomProperties;
            }

            if (migratedTemplate.Materials && Array.isArray(migratedTemplate.Materials)) {
                migratedTemplate.materials = migratedTemplate.Materials.map(material => ({
                    name: material.name || material.Name || 'Material',
                    path: material.path || material.Path || `/Game/Materials/${material.name || material.Name || 'Material'}`
                }));
                delete migratedTemplate.Materials;
            }

            const unrealToCamelCase = {
                'ItemID': 'itemID',
                'ItemName': 'itemName',
                'DisplayName': 'displayName',
                'ThumbnailDescription': 'thumbnailDescription',
                'Description': 'description',
                'ItemType': 'itemType',
                'ItemSubCategory': 'itemSubCategory',
                'Rarity': 'rarity',
                'MaxStackSize': 'maxStackSize',
                'MaxQuantity': 'maxQuantity',
                'Weight': 'weight',
                'Value': 'value',
                'Durability': 'durability',
                'Tags': 'tags',
                'BasePrice': 'basePrice',
                'SellPriceCoefficient': 'sellPriceCoefficient',
                'MaxDurability': 'maxDurability',
                'BaseDurability': 'baseDurability',
                'DurabilityPenalization': 'durabilityPenalization',
                'DurabilityToPriceCoefficient': 'durabilityToPriceCoefficient',
                'bIsStackable': 'isStackable',
                'bIsDroppable': 'isDroppable',
                'bIsUsable': 'isUsable',
                'bIsEquippable': 'isEquippable',
                'bIsTradeable': 'isTradeable',
                'bIsQuestItem': 'isQuestItem',
                'bHasWeight': 'bHasWeight',
                'bHasPrice': 'bHasPrice',
                'bHasDurability': 'bHasDurability',
                'IconPath': 'iconPath',
                'MeshPath': 'meshPath',
                'EquipSlot': 'equipSlot'
            };

            Object.entries(unrealToCamelCase).forEach(([unrealKey, camelKey]) => {
                if (migratedTemplate.hasOwnProperty(unrealKey)) {
                    migratedTemplate[camelKey] = migratedTemplate[unrealKey];
                    delete migratedTemplate[unrealKey];
                }
            });

            return migratedTemplate;
        });

        return migrated;
    }

    extractMaterialNameFromPath(path) {
        if (!path) return 'Material';
        
        const parts = path.split('/');
        const fileName = parts[parts.length - 1];
        
        return fileName || 'Material';
    }

    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    async exportTemplateWithFiles(templateId) {
        try {
            const template = await this.editor.templateRepo.get(templateId);
            if (!template) {
                this.editor.showNotification('Template not found', 'error');
                return;
            }

            const exportData = {
                template: template,
                files: {}
            };

            if (template.iconFileId) {
                const iconFile = await this.editor.fileRepo.get(template.iconFileId);
                if (iconFile) {
                    exportData.files.icon = {
                        fileName: iconFile.fileName,
                        fileType: iconFile.fileType,
                        data: iconFile.data
                    };
                }
            }

            if (template.meshFileId) {
                const meshFile = await this.editor.fileRepo.get(template.meshFileId);
                if (meshFile) {
                    exportData.files.mesh = {
                        fileName: meshFile.fileName,
                        fileType: meshFile.fileType,
                        data: meshFile.data
                    };
                }
            }

            const fileName = `${template.itemName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_with_files.json`;
            this.downloadFile(JSON.stringify(exportData, null, 2), fileName, 'application/json');
            this.editor.showNotification('Template with files exported successfully', 'success');

        } catch (error) {
            console.error('Export with files failed:', error);
            this.editor.showNotification('Failed to export template with files', 'error');
        }
    }

    async importTemplateWithFiles(data) {
        try {
            if (!data.template) {
                throw new Error('No template data found');
            }

            const template = await this.editor.templateRepo.save(data.template);

            if (data.files) {
                if (data.files.icon) {
                    const iconFileId = await this.editor.fileRepo.save({
                        fileName: data.files.icon.fileName,
                        fileType: data.files.icon.fileType,
                        data: data.files.icon.data,
                        size: data.files.icon.data.length
                    });
                    template.iconFileId = iconFileId;
                }

                if (data.files.mesh) {
                    const meshFileId = await this.editor.fileRepo.save({
                        fileName: data.files.mesh.fileName,
                        fileType: data.files.mesh.fileType,
                        data: data.files.mesh.data,
                        size: data.files.mesh.data.length
                    });
                    template.meshFileId = meshFileId;
                }

                if (template.iconFileId || template.meshFileId) {
                    await this.editor.templateRepo.save(template);
                }
            }

            return template;

        } catch (error) {
            console.error('Import with files failed:', error);
            throw error;
        }
    }

    getExportStatistics() {
        const templates = this.editor.templates;
        const stats = {
            total: templates.length,
            byType: {},
            byRarity: {},
            withFiles: 0,
            withMaterials: 0,
            withCustomProperties: 0
        };

        templates.forEach(template => {
            stats.byType[template.itemType] = (stats.byType[template.itemType] || 0) + 1;
            stats.byRarity[template.rarity] = (stats.byRarity[template.rarity] || 0) + 1;
            
            if (template.iconFileId || template.meshFileId) {
                stats.withFiles++;
            }
            
            if (template.materials && template.materials.length > 0) {
                stats.withMaterials++;
            }
            
            if (template.customProperties && template.customProperties.length > 0) {
                stats.withCustomProperties++;
            }
        });

        return stats;
    }
}