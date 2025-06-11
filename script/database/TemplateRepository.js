export class TemplateRepository {
    constructor(dbManager) {
        this.db = dbManager;
        this.storeName = 'templates';
    }

    async getAll() {
        return await this.db.getAll(this.storeName);
    }

    async getById(id) {
        return await this.db.get(this.storeName, id);
    }

    async save(template) {
        // Ensure template has required fields
        if (!template.id) {
            throw new Error('Template must have an id');
        }
        
        // Set timestamps
        const now = new Date().toISOString();
        if (!template.createdAt) {
            template.createdAt = now;
        }
        template.updatedAt = now;

        return await this.db.put(this.storeName, template);
    }

    async delete(id) {
        return await this.db.delete(this.storeName, id);
    }

    async deleteMultiple(ids) {
        const promises = ids.map(id => this.delete(id));
        return await Promise.all(promises);
    }

    async exists(id) {
        const template = await this.getById(id);
        return template !== undefined;
    }

    async count() {
        return await this.db.count(this.storeName);
    }

    async findByName(itemName) {
        const templates = await this.getAll();
        return templates.filter(t => t.itemName === itemName);
    }

    async findByType(itemType) {
        const templates = await this.getAll();
        return templates.filter(t => t.itemType === itemType);
    }

    async findByRarity(rarity) {
        const templates = await this.getAll();
        return templates.filter(t => t.rarity === rarity);
    }

    async search(query) {
        const templates = await this.getAll();
        const lowercaseQuery = query.toLowerCase();
        
        return templates.filter(template => {
            return (template.itemName && template.itemName.toLowerCase().includes(lowercaseQuery)) ||
                   (template.displayName && template.displayName.toLowerCase().includes(lowercaseQuery)) ||
                   (template.description && template.description.toLowerCase().includes(lowercaseQuery)) ||
                   (template.itemType && template.itemType.toLowerCase().includes(lowercaseQuery));
        });
    }

    async duplicate(id, newName = null) {
        const original = await this.getById(id);
        if (!original) {
            throw new Error('Template not found');
        }

        const duplicate = {
            ...JSON.parse(JSON.stringify(original)),
            id: this.generateId(),
            itemID: this.generateId(),
            itemName: newName || `${original.itemName}_Copy`,
            createdAt: undefined,
            updatedAt: undefined,
            iconFileId: original.iconFileId,
            meshFileId: original.meshFileId
        };

        return await this.save(duplicate);
    }

    async getTemplatesWithFiles() {
        const templates = await this.getAll();
        return templates.filter(t => t.iconFileId || t.meshFileId);
    }

    async getTemplatesWithoutFiles() {
        const templates = await this.getAll();
        return templates.filter(t => !t.iconFileId && !t.meshFileId);
    }

    async updateMultiple(updates) {
        const promises = updates.map(update => {
            if (!update.id) {
                throw new Error('Update must include template id');
            }
            return this.save(update);
        });
        return await Promise.all(promises);
    }

    async clear() {
        return await this.db.clear(this.storeName);
    }

    async export(templateIds = null) {
        let templates;
        
        if (templateIds && templateIds.length > 0) {
            const promises = templateIds.map(id => this.getById(id));
            templates = await Promise.all(promises);
            templates = templates.filter(t => t !== undefined);
        } else {
            templates = await this.getAll();
        }

        // Remove file references for export
        return templates.map(template => {
            const { iconFileId, meshFileId, createdAt, updatedAt, ...exportTemplate } = template;
            return exportTemplate;
        });
    }

    async import(templatesData) {
        const imported = [];
        
        for (const templateData of templatesData) {
            // Ensure required fields
            if (!templateData.itemID) {
                templateData.itemID = this.generateId();
            }
            
            templateData.id = templateData.itemID;
            templateData.iconFileId = null;
            templateData.meshFileId = null;
            
            try {
                await this.save(templateData);
                imported.push(templateData);
            } catch (error) {
                console.error('Failed to import template:', templateData.itemName, error);
            }
        }
        
        return imported;
    }

    validateTemplate(template) {
        const errors = [];
        
        if (!template.itemName || template.itemName.trim() === '') {
            errors.push('Item Name is required');
        }
        
        if (!template.displayName || template.displayName.trim() === '') {
            errors.push('Display Name is required');
        }
        
        if (!template.itemID || template.itemID.trim() === '') {
            errors.push('Item ID is required');
        }
        
        if (template.itemName && template.itemName.length > 24) {
            errors.push('Item Name must be 24 characters or less');
        }
        
        if (template.itemName && /\s/.test(template.itemName)) {
            errors.push('Item Name cannot contain whitespace');
        }
        
        if (template.itemName && /[^a-zA-Z_]/.test(template.itemName)) {
            errors.push('Item Name can only contain letters and underscores');
        }
        
        if (template.itemID && !this.isValidUUID(template.itemID)) {
            errors.push('Item ID must be a valid UUID format');
        }
        
        if (template.maxStackSize && template.maxStackSize <= 0) {
            errors.push('Max Stack Size must be greater than 0');
        }
        
        if (template.weight && template.weight < 0) {
            errors.push('Weight cannot be negative');
        }
        
        if (template.value && template.value < 0) {
            errors.push('Value cannot be negative');
        }
        
        if (template.durability && (template.durability < 0 || template.durability > 100)) {
            errors.push('Durability must be between 0 and 100');
        }
        
        return errors;
    }

    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    generateId() {
        return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    createEmptyTemplate() {
        const id = this.generateId();
        return {
            id,
            itemID: id,
            itemName: '',
            displayName: '',
            thumbnailDescription: '',
            description: '',
            itemType: 'Misc',
            rarity: 'Common',
            maxStackSize: 1,
            weight: 0,
            value: 0,
            durability: 100,
            isStackable: true,
            isDroppable: true,
            isUsable: false,
            isEquippable: false,
            isTradeable: true,
            isQuestItem: false,
            iconFileId: null,
            meshFileId: null,
            meshPath: '',
            materialPath: '',
            equipSlot: 'None',
            customProperties: []
        };
    }

    async getStatistics() {
        const templates = await this.getAll();
        
        const stats = {
            total: templates.length,
            byType: {},
            byRarity: {},
            withFiles: 0,
            withoutFiles: 0,
            averageWeight: 0,
            averageValue: 0
        };
        
        let totalWeight = 0;
        let totalValue = 0;
        
        templates.forEach(template => {
            // Count by type
            stats.byType[template.itemType] = (stats.byType[template.itemType] || 0) + 1;
            
            // Count by rarity
            stats.byRarity[template.rarity] = (stats.byRarity[template.rarity] || 0) + 1;
            
            // Files
            if (template.iconFileId || template.meshFileId) {
                stats.withFiles++;
            } else {
                stats.withoutFiles++;
            }
            
            // Averages
            totalWeight += template.weight || 0;
            totalValue += template.value || 0;
        });
        
        if (templates.length > 0) {
            stats.averageWeight = totalWeight / templates.length;
            stats.averageValue = totalValue / templates.length;
        }
        
        return stats;
    }
}