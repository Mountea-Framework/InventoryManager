import { ComponentLoader } from '../utils/ComponentLoader.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { TemplateRepository } from '../database/TemplateRepository.js';
import { FileRepository } from '../database/FileRepository.js';
import { UIManager } from '../ui/UIManager.js';
import { FormManager } from '../forms/FormManager.js';
import { ValidationManager } from '../forms/ValidationManager.js';
import { FileHandler } from '../features/FileHandler.js';
import { ImportExport } from '../features/ImportExport.js';
import { SettingsManager } from '../features/SettingsManager.js';
import { ThemeManager } from '../features/ThemeManager.js';
import { NotificationSystem } from '../utils/NotificationSystem.js';
import { LoadingManager } from '../utils/LoadingManager.js';
import { Helpers } from '../utils/Helpers.js';

export class InventoryEditor {
    constructor() {
        this.componentLoader = new ComponentLoader();
        this.currentTemplate = null;
        this.customPropCounter = 0;
        this.selectedTemplates = new Set();
        this.componentsLoaded = false;
        
        this.notifications = new NotificationSystem();
        this.loadingManager = new LoadingManager();

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

        // Create a promise that resolves when initialization is complete
        this.initPromise = this.init();
    }

    async init() {
        try {
            // Show loading screen
            await this.loadingManager.show();
            
            // Load all components first
            await this.loadComponents();
            this.componentsLoaded = true;
            
            // Wait for DOM to be ready
            await this.waitForDOM();
            
            // Initialize managers that depend on DOM elements
            this.loadingManager.trackUIInit();
            this.ui = new UIManager(this);
            this.form = new FormManager(this);  
            this.validation = new ValidationManager(this);
            
            // Initialize database and repositories
            this.loadingManager.trackDatabaseInit();
            this.dbManager = new DatabaseManager();
            await this.dbManager.initialize();

            this.templateRepo = new TemplateRepository(this.dbManager);
            this.fileRepo = new FileRepository(this.dbManager);

            this.fileHandler = new FileHandler(this);
            this.importExport = new ImportExport(this);
            this.settingsManager = new SettingsManager(this);
            this.themeManager = new ThemeManager(this);

            this.loadingManager.trackSettingsLoad();
            await this.loadSettings();
            
            this.loadingManager.trackTemplatesLoad();
            await this.loadTemplates();

            // Initialize event listeners AFTER components are loaded
            this.loadingManager.trackEventListeners();
            this.initializeEventListeners();
            
            // Wait a bit more to ensure all DOM elements are ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Now safely call UI methods
            this.loadingManager.trackFinalizing();
            this.ui.renderTemplatesList();
            this.validation.setupFormValidation();
            this.ui.updateSelectionUI();
            this.settingsManager.populateDropdowns();
            
            // Complete loading
            await this.loadingManager.complete();
            
        } catch (error) {
            console.error('Failed to initialize editor:', error);
            this.notifications.show('Failed to initialize application', 'error');
            await this.loadingManager.complete();
        }
    }

    async loadComponents() {
        const components = [
            { path: 'header.html', target: '#header-container' },
            { path: 'sidebar.html', target: '#sidebar-container' },
            { path: 'editor-form.html', target: '#editor-container' },
            { path: 'floating-buttons.html', target: '#floating-buttons-container' },
            { path: 'modals/preview.html', target: '#preview-container' },
            { path: 'modals/settings.html', target: '#settings-container' },
            { path: 'modals/help.html', target: '#help-container' }
        ];

        for (let i = 0; i < components.length; i++) {
            this.loadingManager.trackComponentLoading(i + 1, components.length);
            await this.componentLoader.loadComponent(components[i].path, components[i].target);
        }
    }

    async waitForDOM() {
        // Wait for critical elements to exist
        const checkElements = [
            '#selectionCount',
            '#selectAllTemplates', 
            '#exportMultiple',
            '#templatesList'
        ];
        
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        while (attempts < maxAttempts) {
            const allExist = checkElements.every(selector => 
                document.querySelector(selector) !== null
            );
            
            if (allExist) {
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('Some DOM elements not found after waiting');
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

    async loadTemplates() {
        try {
            this.templates = await this.templateRepo.getAll();
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.templates = [];
        }
    }

    initializeEventListeners() {
        // Check if elements exist before adding listeners
        const addListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element ${id} not found when adding event listener`);
            }
        };

        // Header controls
        addListener('newTemplate', 'click', () => this.createNewTemplate());
        addListener('showPreview', 'click', (e) => this.ui.showPreview(e));
        addListener('importTemplate', 'click', () => this.importExport.importTemplate());
        addListener('exportTemplate', 'click', () => this.importExport.exportTemplates());
        addListener('exportSingle', 'click', () => this.importExport.exportSingleTemplate());
        addListener('exportMultiple', 'click', () => this.importExport.exportMultipleTemplates());
        addListener('fileInput', 'change', (e) => this.importExport.handleFileImport(e));
        addListener('help', 'click', () => this.ui.showHelp());
        addListener('closeHelp', 'click', () => this.ui.closeHelp());
        addListener('settings', 'click', () => this.settingsManager.showSettings());
        addListener('mobileClose', 'click', () => this.ui.closeCurrentTemplate());

        // Form controls
        addListener('mobileSave', 'click', () => this.saveCurrentTemplate());
        addListener('duplicateTemplate', 'click', () => this.duplicateCurrentTemplate());

        // Selection controls
        addListener('selectAllTemplates', 'click', () => this.ui.selectAllTemplates());
        addListener('deselectAll', 'click', () => this.ui.deselectAllTemplates());
        addListener('deleteSelected', 'click', () => this.deleteSelectedTemplates());

        // Custom properties
        addListener('addCustomProp', 'click', () => this.ui.addCustomProperty());

        // Equipment section toggle
        addListener('isEquippable', 'change', (e) => {
            const equipmentSection = document.getElementById('equipmentSection');
            if (equipmentSection) {
                equipmentSection.style.display = e.target.checked ? 'block' : 'none';
            }
        });

        // Stackable toggle
        addListener('isStackable', 'change', (e) => {
            const maxStackSize = document.getElementById('maxStackSize');
            if (maxStackSize) {
                if (e.target.checked) {
                    maxStackSize.min = '1';
                    maxStackSize.value = Math.max(1, maxStackSize.value);
                } else {
                    maxStackSize.value = '1';
                }
            }
        });

        // Preview and settings panels
        addListener('closePreview', 'click', () => this.ui.closePreview());
        addListener('closeSettings', 'click', () => this.settingsManager.closeSettings());
        addListener('saveSettings', 'click', () => this.settingsManager.saveSettingsData());
        addListener('addCategory', 'click', () => this.settingsManager.addCategory());
        addListener('addRarity', 'click', () => this.settingsManager.addRarity());
        addListener('addEquipmentSlot', 'click', () => this.settingsManager.addEquipmentSlot());

        // Auto-save on form changes
        const templateForm = document.getElementById('templateForm');
        if (templateForm) {
            templateForm.addEventListener('input', () => {
                if (this.currentTemplate) {
                    this.ui.updatePreview();
                }
            });
        }

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
                    case 't':
                        e.preventDefault();
                        if (this.themeManager) {
                            this.themeManager.toggleTheme();
                        }
                        break;
                }
            }

            if (e.key === 'Escape') {
                const previewPanel = document.getElementById('previewPanel');
                const helpModal = document.getElementById('helpModal');
                const settingsModal = document.getElementById('settingsModal');
                
                if (previewPanel && previewPanel.classList.contains('show')) {
                    this.ui.closePreview();
                } else if (this.currentTemplate) {
                    this.ui.closeCurrentTemplate();
                } else if (helpModal && helpModal.classList.contains('show')) {
                    this.ui.closeHelp();
                } else if (settingsModal && settingsModal.classList.contains('show')) {
                    this.settingsManager.closeSettings();
                }
            }

            if (e.key === 'F1') {
                e.preventDefault();
                this.ui.showHelp();
            }
        });
    }

    addGenerateGuidButton() {
        const itemIdInput = document.getElementById('itemID');
        if (!itemIdInput) return;
        
        const itemIdGroup = itemIdInput.closest('.form-group');
        if (!itemIdGroup) return;
        
        const generateBtn = document.createElement('button');
        generateBtn.type = 'button';
        generateBtn.className = 'btn btn-secondary generate-guid-btn';
        generateBtn.textContent = 'Generate New GUID';
        generateBtn.style.marginTop = 'var(--spacing-xs)';
        generateBtn.style.alignSelf = 'flex-start';

        generateBtn.addEventListener('click', () => {
            itemIdInput.value = Helpers.generateGUID();
            this.validation.clearFieldError('itemID');
            if (this.currentTemplate) {
                this.ui.updatePreview();
            }
        });

        itemIdGroup.appendChild(generateBtn);
    }

    async createNewTemplate() {
        // Check current form validation if template exists
        if (!this.validation.validateForm().isValid) {
            this.notifications.show('Please fill required data first', 'error');
            return;
        }

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
            this.notifications.show('Please fill required data first', 'error');
            return;
        }
        
        const formData = this.ui.getFormData();
        
        if (!this.currentTemplate) {
            // Create template using form's itemID, not a new GUID
            this.currentTemplate = {
                id: formData.itemID,
                ...formData
            };
            this.templates.unshift(this.currentTemplate);
        } else {
            // Update existing template and sync both IDs
            formData.id = formData.itemID;
            Object.assign(this.currentTemplate, formData);
        }
        
        await this.templateRepo.save(this.currentTemplate);
        this.ui.renderTemplatesList();
        this.ui.selectTemplateInList(this.currentTemplate.id);
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