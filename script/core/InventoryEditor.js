import { DatabaseManager } from '../database/DatabaseManager.js';
import { TemplateRepository } from '../database/TemplateRepository.js';
import { FileRepository } from '../database/FileRepository.js';
import { UIManager } from '../ui/UIManager.js';
import { FormManager } from '../forms/FormManager.js';
import { ValidationManager } from '../forms/ValidationManager.js';
import { FileHandler } from '../features/FileHandler.js';
import { ImportExport } from '../features/ImportExport.js';
import { SettingsManager } from '../features/SettingsManager.js';
import { NotificationSystem } from '../utils/NotificationSystem.js';

export class InventoryEditor {
    constructor() {
        this.currentTemplate = null;
        this.customPropCounter = 0;
        this.selectedTemplates = new Set();
        
        this.notifications = new NotificationSystem();
        this.ui = new UIManager(this);
        this.form = new FormManager(this);  
        this.validation = new ValidationManager(this);

        this.settings = {
            categories: [
                "Weapon", "Armor", "Consumable", "Material", "Quest", "Misc"
            ],
            rarities: [
                { name: "Common", color: "#9CA3AF" },
                { name: "Uncommon", color: "#10B981" },
                { name: "Rare", color: "#3B82F6" },
                { name: "Epic", color: "#8B5CF6" },
                { name: "Legendary", color: "#F59E0B" }
            ],
            equipmentSlots: [
                "none", "Hand.Left", "Hand.Right", "Back", "Belt", "Helmet",
                "Chest", "Shoulder.Left", "Shoulder.Right", "Leg.Left",
                "Leg.Right", "Boots", "Gloves", "Necklace"
            ]
        };

        this.init();
    }

    async init() {
        try {
            this.dbManager = new DatabaseManager();
            await this.dbManager.initialize();

            this.templateRepo = new TemplateRepository(this.dbManager);
            this.fileRepo = new FileRepository(this.dbManager);

            this.fileHandler = new FileHandler(this);
            this.importExport = new ImportExport(this);
            this.settingsManager = new SettingsManager(this);

            await this.loadSettings();
            await this.loadTemplates();

            this.initializeEventListeners();
            this.ui.renderTemplatesList();
            this.validation.setupFormValidation();
            this.ui.updateSelectionUI();
            this.settingsManager.populateDropdowns();
        } catch (error) {
            console.error('Failed to initialize editor:', error);
            this.notifications.show('Failed to initialize application', 'error');
        }
    }

    async loadSettings() {
        try {
            const settings = await this.dbManager.getSettings();
            if (settings.categories) this.settings.categories = settings.categories;
            if (settings.rarities) this.settings.rarities = settings.rarities;
            if (settings.equipmentSlots) this.settings.equipmentSlots = settings.equipmentSlots;
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            await this.dbManager.saveSettings(this.settings);
            this.settingsManager.populateDropdowns();
            this.notifications.show('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.notifications.show('Failed to save settings', 'error');
        }
    }

    async loadTemplates() {
        try {
            this.templates = await this.templateRepo.getAll();
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.templates = [];
        }
    }

    initializeEventListeners() {
        // Header controls
        document.getElementById('newTemplate').addEventListener('click', () => this.createNewTemplate());
        document.getElementById('showPreview').addEventListener('click', (e) => this.ui.showPreview(e));
        document.getElementById('importTemplate').addEventListener('click', () => this.importExport.importTemplate());
        document.getElementById('exportTemplate').addEventListener('click', () => this.importExport.exportTemplates());
        document.getElementById('exportSingle').addEventListener('click', () => this.importExport.exportSingleTemplate());
        document.getElementById('exportMultiple').addEventListener('click', () => this.importExport.exportMultipleTemplates());
        document.getElementById('fileInput').addEventListener('change', (e) => this.importExport.handleFileImport(e));
        document.getElementById('help').addEventListener('click', () => this.ui.showHelp());
        document.getElementById('closeHelp').addEventListener('click', () => this.ui.closeHelp());
        document.getElementById('settings').addEventListener('click', () => this.settingsManager.showSettings());
        document.getElementById('mobileClose').addEventListener('click', () => this.ui.closeCurrentTemplate());

        // Form controls
        document.getElementById('mobileSave').addEventListener('click', () => this.saveCurrentTemplate());
        document.getElementById('duplicateTemplate').addEventListener('click', () => this.duplicateCurrentTemplate());

        // Selection controls
        document.getElementById('selectAllTemplates').addEventListener('click', () => this.ui.selectAllTemplates());
        document.getElementById('deselectAll').addEventListener('click', () => this.ui.deselectAllTemplates());
        document.getElementById('deleteSelected').addEventListener('click', () => this.deleteSelectedTemplates());

        // Custom properties
        document.getElementById('addCustomProp').addEventListener('click', () => this.ui.addCustomProperty());

        // Equipment section toggle
        document.getElementById('isEquippable').addEventListener('change', (e) => {
            const equipmentSection = document.getElementById('equipmentSection');
            equipmentSection.style.display = e.target.checked ? 'block' : 'none';
        });

        // Stackable toggle
        document.getElementById('isStackable').addEventListener('change', (e) => {
            const maxStackSize = document.getElementById('maxStackSize');
            if (e.target.checked) {
                maxStackSize.min = '1';
                maxStackSize.value = Math.max(1, maxStackSize.value);
            } else {
                maxStackSize.value = '1';
            }
        });

        // Preview and settings panels
        document.getElementById('closePreview').addEventListener('click', () => this.ui.closePreview());
        document.getElementById('closeSettings').addEventListener('click', () => this.settingsManager.closeSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.settingsManager.saveSettingsData());
        document.getElementById('addCategory').addEventListener('click', () => this.settingsManager.addCategory());
        document.getElementById('addRarity').addEventListener('click', () => this.settingsManager.addRarity());
        document.getElementById('addEquipmentSlot').addEventListener('click', () => this.settingsManager.addEquipmentSlot());

        // Auto-save on form changes
        document.getElementById('templateForm').addEventListener('input', () => {
            if (this.currentTemplate) {
                this.ui.updatePreview();
            }
        });

        // Generate new GUID button
        this.addGenerateGuidButton();

        // Keyboard shortcuts
        this.initializeKeyboardShortcuts();
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveCurrentTemplate();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.createNewTemplate();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.duplicateCurrentTemplate();
                        break;
                }
            }

            if (e.key === 'Escape') {
                if (document.getElementById('previewPanel').classList.contains('show')) {
                    this.ui.closePreview();
                } else if (this.currentTemplate) {
                    this.ui.closeCurrentTemplate();
                } else if (document.getElementById('helpModal').classList.contains('show')) {
                    this.ui.closeHelp();
                } else if (document.getElementById('settingsModal').classList.contains('show')) {
                    this.settingsManager.closeSettings();
                }
            }

            if (e.key === 'F1') {
                e.preventDefault();
                this.ui.showHelp();
            }
        });
    }

    generateGUID() {
        return 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    addGenerateGuidButton() {
        const itemIdGroup = document.getElementById('itemID').closest('.form-group');
        const generateBtn = document.createElement('button');
        generateBtn.type = 'button';
        generateBtn.className = 'btn btn btn-secondary generate-guid-btn';
        generateBtn.textContent = 'Generate New GUID';
        generateBtn.style.marginTop = 'var(--spacing-xs)';
        generateBtn.style.alignSelf = 'flex-start';

        generateBtn.addEventListener('click', () => {
            document.getElementById('itemID').value = this.generateGUID();
            this.validation.clearFieldError('itemID');
            if (this.currentTemplate) {
                this.ui.updatePreview();
            }
        });

        itemIdGroup.appendChild(generateBtn);
    }

    async createNewTemplate() {
        const template = this.templateRepo.createEmptyTemplate();
        this.templates.unshift(template);
        this.currentTemplate = template;
        await this.templateRepo.save(template);
        this.ui.loadTemplateToForm(template);
        this.ui.selectTemplateInList(template.id);
        this.ui.renderTemplatesList();
        this.notifications.show('New template created', 'success');
    }

    async saveCurrentTemplate() {
        if (!this.validation.validateForm().isValid) {
            this.notifications.show('Please fix validation errors', 'error');
            return;
        }

        const formData = this.ui.getFormData();
        Object.assign(this.currentTemplate, formData);
        await this.templateRepo.save(this.currentTemplate);
        this.ui.renderTemplatesList();
        this.notifications.show('Template saved successfully', 'success');
    }

    async duplicateCurrentTemplate() {
        if (!this.currentTemplate) {
            this.notifications.show('No template selected', 'error');
            return;
        }

        const duplicate = await this.templateRepo.duplicate(this.currentTemplate.id);
        this.templates.unshift(duplicate);
        this.currentTemplate = duplicate;
        this.ui.loadTemplateToForm(duplicate);
        this.ui.selectTemplateInList(duplicate.id);
        this.ui.renderTemplatesList();
        this.notifications.show('Template duplicated successfully', 'success');
    }

    async deleteSelectedTemplates() {
        if (this.selectedTemplates.size === 0) {
            this.notifications.show('No templates selected', 'error');
            return;
        }

        const count = this.selectedTemplates.size;
        if (await this.notifications.confirm(`Delete ${count} selected template(s)?`)) {
            await this.templateRepo.deleteMultiple([...this.selectedTemplates]);
            this.templates = this.templates.filter(t => !this.selectedTemplates.has(t.id));
            
            if (this.currentTemplate && this.selectedTemplates.has(this.currentTemplate.id)) {
                this.ui.clearForm();
                this.currentTemplate = null;
            }
            
            this.selectedTemplates.clear();
            this.ui.renderTemplatesList();
            this.ui.updateSelectionUI();
            this.notifications.show(`${count} template(s) deleted`, 'success');
        }
    }

    showNotification(message, type) {
        this.notifications.show(message, type);
    }

    clearFieldError(field) {
        this.validation.clearFieldError(field.id || field.name);
    }
}