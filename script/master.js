class InventoryTemplateEditor {
    constructor() {
        this.templates = [];
        this.currentTemplate = null;
        this.customPropCounter = 0;
        this.selectedTemplates = new Set();
        this.db = null;
        this.settings = {
            categories: [
                "Weapon",
                "Armor",
                "Consumable",
                "Material",
                "Quest",
                "Misc",
            ],
            rarities: [
                { name: "Common", color: "#9CA3AF" },
                { name: "Uncommon", color: "#10B981" },
                { name: "Rare", color: "#3B82F6" },
                { name: "Epic", color: "#8B5CF6" },
                { name: "Legendary", color: "#F59E0B" },
            ],
            equipmentSlots: [
                "none",
                "Hand.Left",
                "Hand.Right",
                "Back",
                "Belt",
                "Helmet",
                "Chest",
                "Shoulder.Left",
                "Shoulder.Right",
                "Leg.Left",
                "Leg.Right",
                "Boots",
                "Gloves",
                "Necklace",
            ],
        };

        this.initializeDatabase().then(() => {
            this.loadSettings().then(() => {
                this.loadTemplates().then(() => {
                    this.initializeEventListeners();
                    this.renderTemplatesList();
                    this.setupFormValidation();
                    this.initializeFileHandlers();
                    this.updateSelectionUI();
                    this.populateDropdowns();
                });
            });
        });
    }

    async loadSettings() {
        try {
            const transaction = this.db.transaction(["settings"], "readonly");
            const store = transaction.objectStore("settings");

            const categoriesRequest = store.get("categories");
            const raritiesRequest = store.get("rarities");
            const equipmentSlotsReuquest = store.get("equipmentSlots");

            return new Promise((resolve) => {
                let completed = 0;

                categoriesRequest.onsuccess = () => {
                    if (categoriesRequest.result) {
                        this.settings.categories = categoriesRequest.result.value;
                    }
                    completed++;
                    if (completed === 2) resolve();
                };

                raritiesRequest.onsuccess = () => {
                    if (raritiesRequest.result) {
                        this.settings.rarities = raritiesRequest.result.value;
                    }
                    completed++;
                    if (completed === 2) resolve();
                };

                equipmentSlotsReuquest.onsuccess = () => {
                    if (equipmentSlotsReuquest.result) {
                        this.settings.equipmentSlots = equipmentSlotsReuquest.result.value;
                    }
                    completed++;
                    if (completed === 2) resolve();
                };

                categoriesRequest.onerror = () => {
                    completed++;
                    if (completed === 2) resolve();
                };

                raritiesRequest.onerror = () => {
                    completed++;
                    if (completed === 2) resolve();
                };

                equipmentSlotsReuquest.onerror = () => {
                    completed++;
                    if (completed === 2) resolve();
                };
            });
        } catch (error) {
            console.error("Failed to load settings:", error);
        }
    }

    async saveSettings() {
        try {
            const transaction = this.db.transaction(["settings"], "readwrite");
            const store = transaction.objectStore("settings");

            await store.put({ key: "categories", value: this.settings.categories });
            await store.put({ key: "rarities", value: this.settings.rarities });
            await store.put({
                key: "equipmentSlots",
                value: this.settings.equipmentSlots,
            });

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error("Failed to save settings:", error);
            throw error;
        }
    }

    populateDropdowns() {
        const itemTypeSelect = document.getElementById("itemType");
        const raritySelect = document.getElementById("rarity");
        const equipmentSlect = document.getElementById("equipSlot");

        itemTypeSelect.innerHTML = "";
        this.settings.categories.forEach((category) => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            itemTypeSelect.appendChild(option);
        });

        equipmentSlect.innerHTML = "";
        this.settings.equipmentSlots.forEach((equipmentSlot) => {
            const option = document.createElement("option");
            option.value = equipmentSlot;
            option.textContent = equipmentSlot;
            equipmentSlect.appendChild(option);
        });

        raritySelect.innerHTML = "";
        this.settings.rarities.forEach((rarity) => {
            const option = document.createElement("option");
            option.value = rarity.name;
            option.textContent = rarity.name;
            option.style.color = rarity.color;
            raritySelect.appendChild(option);
        });
    }

    // IndexedDB initialization
    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("InventoryTemplateDB", 2);

            request.onerror = () => {
                console.error("Database failed to open");
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log("Database opened successfully");
                resolve();
            };

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;

                if (!this.db.objectStoreNames.contains("templates")) {
                    const templatesStore = this.db.createObjectStore("templates", {
                        keyPath: "id",
                    });
                    templatesStore.createIndex("itemName", "itemName", { unique: false });
                }

                if (!this.db.objectStoreNames.contains("files")) {
                    const filesStore = this.db.createObjectStore("files", {
                        keyPath: "id",
                    });
                    filesStore.createIndex("templateId", "templateId", { unique: false });
                    filesStore.createIndex("type", "type", { unique: false });
                }

                if (!this.db.objectStoreNames.contains("settings")) {
                    const settingsStore = this.db.createObjectStore("settings", {
                        keyPath: "key",
                    });
                }
            };
        });
    }

    // Find template by ID
    async findTemplate(templateId) {
        await this.loadTemplates();
        return this.templates.find((t) => t.id === templateId) != null;
    }

    // Template operations
    async loadTemplates() {
        try {
            const transaction = this.db.transaction(["templates"], "readonly");
            const store = transaction.objectStore("templates");
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    this.templates = request.result || [];
                    resolve();
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("Failed to load templates:", error);
            this.templates = [];
        }
    }

    async saveTemplate(template) {
        try {
            const transaction = this.db.transaction(["templates"], "readwrite");
            const store = transaction.objectStore("templates");
            await store.put(template);

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error("Failed to save template:", error);
            throw error;
        }
    }

    async deleteTemplate(templateId) {
        try {
            const transaction = this.db.transaction(
                ["templates", "files"],
                "readwrite"
            );

            // Delete template
            const templatesStore = transaction.objectStore("templates");
            await templatesStore.delete(templateId);

            // Delete associated files
            const filesStore = transaction.objectStore("files");
            const index = filesStore.index("templateId");
            const range = IDBKeyRange.only(templateId);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error("Failed to delete template:", error);
            throw error;
        }
    }

    // File operations
    async storeFile(templateId, file, type) {
        try {
            const fileData = {
                id: templateId,
                templateId: templateId,
                type: type,
                fileName: file.name,
                fileType: file.type,
                size: file.size,
                lastModified: file.lastModified,
                data: file,
            };

            const transaction = this.db.transaction(["files"], "readwrite");
            const store = transaction.objectStore("files");
            await store.put(fileData);

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve(fileId);
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error("Failed to store file:", error);
            throw error;
        }
    }

    async getFile(fileId) {
        try {
            const transaction = this.db.transaction(["files"], "readonly");
            const store = transaction.objectStore("files");
            const request = store.get(fileId);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("Failed to get file:", error);
            return null;
        }
    }

    async deleteFile(fileId) {
        try {
            const transaction = this.db.transaction(["files"], "readwrite");
            const store = transaction.objectStore("files");
            await store.delete(fileId);

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error("Failed to delete file:", error);
        }
    }

    // Generate file preview URL
    async getFilePreviewUrl(fileId) {
        const fileData = await this.getFile(fileId);
        if (!fileData) return null;

        return URL.createObjectURL(fileData.data);
    }

    // Selection methods
    toggleTemplateSelection(templateId, isSelected) {
        if (isSelected) {
            this.selectedTemplates.add(templateId);
        } else {
            this.selectedTemplates.delete(templateId);
        }
        this.updateSelectionUI();
    }

    selectAllTemplates() {
        this.selectedTemplates.clear();
        this.templates.forEach((template) => {
            this.selectedTemplates.add(template.id);
        });
        this.updateSelectionUI();
        this.renderTemplatesList();
    }

    deselectAllTemplates() {
        this.selectedTemplates.clear();
        this.updateSelectionUI();
        this.renderTemplatesList();
    }

    updateSelectionUI() {
        const count = this.selectedTemplates.size;
        const total = this.templates.length;

        // Update selection count
        const selectionCount = document.getElementById("selectionCount");
        selectionCount.textContent = `${count} of ${total} selected`;

        // Update select all checkbox
        const selectAllCheckbox = document.getElementById("selectAllTemplates");
        if (count === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (count === total) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }

        // Update export button text
        const exportButton = document.getElementById("exportMultiple");
        const exportTitle = document.getElementById("exportMultipleTitle");
        if (count === 0) {
            exportTitle.textContent = "Export All Items";
            exportButton.title = "Exports all Templates to Unreal .mnteaitems file";
        } else {
            exportTitle.textContent = `Export Items (${count})`;
            exportButton.title = `Exports ${count} selected Templates to Unreal .mnteaitems file`;
        }
    }

    async deleteSelectedTemplates() {
        if (this.selectedTemplates.size === 0) {
            this.showNotification("No templates selected", "error");
            return;
        }

        const count = this.selectedTemplates.size;
        if (
            confirm(`Are you sure you want to delete ${count} selected template(s)?`)
        ) {
            try {
                // Delete each selected template
                for (const templateId of this.selectedTemplates) {
                    await this.deleteTemplate(templateId);
                }

                // Remove from templates array
                this.templates = this.templates.filter(
                    (t) => !this.selectedTemplates.has(t.id)
                );

                // Clear selection if current template was deleted
                if (
                    this.currentTemplate &&
                    this.selectedTemplates.has(this.currentTemplate.id)
                ) {
                    this.clearForm();
                    this.currentTemplate = null;
                }

                // Clear selection
                this.selectedTemplates.clear();

                this.renderTemplatesList();
                this.updateSelectionUI();
                this.showNotification(
                    `${count} template(s) deleted successfully`,
                    "success"
                );
            } catch (error) {
                console.error("Failed to delete templates:", error);
                this.showNotification("Failed to delete some templates", "error");
            }
        }
    }

    initializeEventListeners() {
        // Header controls
        document
            .getElementById("newTemplate")
            .addEventListener("click", () => this.createNewTemplate());
        document
            .getElementById("showPreview")
            .addEventListener("click", (e) => this.showPreview(e));
        document
            .getElementById("importTemplate")
            .addEventListener("click", () => this.importTemplate());
        document
            .getElementById("exportTemplate")
            .addEventListener("click", () => this.exportTemplates());
        document
            .getElementById("exportSingle")
            .addEventListener("click", () => this.exportSingleTemplate());
        document
            .getElementById("exportMultiple")
            .addEventListener("click", () => this.exportMultipleTemplates());
        document
            .getElementById("fileInput")
            .addEventListener("change", (e) => this.handleFileImport(e));
        document
            .getElementById("help")
            .addEventListener("click", () => this.showHelp());
        document
            .getElementById("closeHelp")
            .addEventListener("click", () => this.closeHelp());
        document
            .getElementById("settings")
            .addEventListener("click", () => this.showSettings());
        document
            .getElementById("mobileClose")
            .addEventListener("click", () => this.closeCurrentTemplate());

        // Form controls
        document
            .getElementById("mobileSave")
            .addEventListener("click", () => this.saveCurrentTemplate());
        document
            .getElementById("duplicateTemplate")
            .addEventListener("click", () => this.duplicateCurrentTemplate());

        // Selection controls
        document
            .getElementById("selectAllTemplates")
            .addEventListener("click", () => this.selectAllTemplates());
        document
            .getElementById("deselectAll")
            .addEventListener("click", () => this.deselectAllTemplates());
        document
            .getElementById("deleteSelected")
            .addEventListener("click", () => this.deleteSelectedTemplates());

        // Custom properties
        document
            .getElementById("addCustomProp")
            .addEventListener("click", () => this.addCustomProperty());

        // Equipment section toggle
        document.getElementById("isEquippable").addEventListener("change", (e) => {
            const equipmentSection = document.getElementById("equipmentSection");
            equipmentSection.style.display = e.target.checked ? "block" : "none";
        });

        // Stackable toggle
        document.getElementById("isStackable").addEventListener("change", (e) => {
            const maxStackSize = document.getElementById("maxStackSize");
            if (e.target.checked) {
                maxStackSize.min = "1";
                maxStackSize.value = Math.max(1, maxStackSize.value);
            } else {
                maxStackSize.value = "1";
            }
        });

        // Preview panel
        document
            .getElementById("closePreview")
            .addEventListener("click", () => this.closePreview());
        document
            .getElementById("closeSettings")
            .addEventListener("click", () => this.closeSettings());
        document
            .getElementById("saveSettings")
            .addEventListener("click", () => this.saveSettingsData());
        document
            .getElementById("addCategory")
            .addEventListener("click", () => this.addCategory());
        document
            .getElementById("addRarity")
            .addEventListener("click", () => this.addRarity());
        document
            .getElementById("addEquipmentSlot")
            .addEventListener("click", () => this.addEquipmentSlot());

        // Auto-save on form changes
        document.getElementById("templateForm").addEventListener("input", () => {
            if (this.currentTemplate) {
                this.updatePreview();
            }
        });

        // Generate new GUID button functionality
        this.addGenerateGuidButton();
    }

    addGenerateGuidButton() {
        const itemIdGroup = document
            .getElementById("itemID")
            .closest(".form-group");
        const generateBtn = document.createElement("button");
        generateBtn.type = "button";
        generateBtn.className = "btn btn btn-secondary generate-guid-btn";
        generateBtn.textContent = "Generate New GUID";
        generateBtn.style.marginTop = "var(--spacing-xs)";
        generateBtn.style.alignSelf = "flex-start";

        generateBtn.addEventListener("click", () => {
            document.getElementById("itemID").value = this.generateGUID();
            this.clearFieldError(document.getElementById("itemID"));
            if (this.currentTemplate) {
                this.updatePreview();
            }
        });

        itemIdGroup.appendChild(generateBtn);
    }

    generateGUID() {
        return "xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
                const r = (Math.random() * 16) | 0;
                const v = c == "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            }
        );
    }

    setupFormValidation() {
        const form = document.getElementById("templateForm");
        const requiredFields = form.querySelectorAll("[required]");

        requiredFields.forEach((field) => {
            field.addEventListener("blur", () => this.validateField(field));
            field.addEventListener("input", () => this.clearFieldError(field));
        });

        const itemIdField = document.getElementById("itemID");
        itemIdField.addEventListener("blur", () =>
            this.validateItemId(itemIdField)
        );
        itemIdField.addEventListener("input", () =>
            this.clearFieldError(itemIdField)
        );

        const itemNameField = document.getElementById("itemName");
        itemNameField.addEventListener("blur", () =>
            this.validateItemName(itemNameField)
        );
        itemNameField.addEventListener("input", () =>
            this.clearFieldError(itemNameField)
        );
    }

    validateField(field) {
        const group = field.closest(".form-group");
        if (!field.value.trim()) {
            group.classList.add("error");
            return false;
        }        

        group.classList.remove("error");
        this.clearFieldError(field);
        return true;
    }

    validateItemId(field) {
        const group = field.closest(".form-group");
        const value = field.value.trim();

        if (!value) {
            group.classList.add("error");
            this.showFieldError(field, "Item ID is required");
            return false;
        }

        if (!this.isValidUUID(value)) {
            group.classList.add("error");
            this.showFieldError(field, "Item ID must be a valid UUID format");
            return false;
        }
        
        group.classList.remove("error");
        this.clearFieldError(field);
        return true;
    }

    validateItemName(field) {
        const group = field.closest(".form-group");
        const value = field.value.trim();

        if (!value) {
            group.classList.add("error");
            this.showFieldError(field, "Item Name is required");
            return false;
        }

        if (value.length > 24) {
            group.classList.add("error");
            this.showFieldError(field, "Item Name must be 24 characters or less");
            return false;
        }

        if (/\s/.test(value)) {
            group.classList.add("error");
            this.showFieldError(field, "Item Name cannot contain whitespace");
            return false;
        }

        if (/[^a-zA-Z_]/.test(value)) {
            group.classList.add("error");
            this.showFieldError(
                field,
                "Item Name can only contain letters and underscores"
            );
            return false;
        }

        group.classList.remove("error");
        this.clearFieldError(field);
        return true;
    }

    validateStackSize(field) {
        const group = field.closest(".form-group");
        const value = field.value.trim();

        if (!value) {
            group.classList.add("error");
            this.showFieldError(field, "Stack Size cannot be null");
            return false;
        }

        if (value <= 0) {
            group.classList.add("error");
            this.showFieldError(field, "Stack Size must be larger than 0");
            return false;
        }
        
        group.classList.remove("error");
        this.clearFieldError(field);
        return true;
    }

    validateNonNullNumber(field) {
        const group = field.closest(".form-group");
        const value = field.value.trim();        

        if (!value) {
            group.classList.add("error");
            this.showFieldError(field, "Value is required");
            return false;
        }

        if (value <= 0) {
            group.classList.add("error");
            this.showFieldError(field, "Value must be larger than 0");
            return false;
        }

        group.classList.remove("error");
        this.clearFieldError(field);
        return true;
    }

    validateZeroNumber(field) {
        const group = field.closest(".form-group");
        const value = field.value.trim();        

        if (!value) {
            group.classList.add("error");
            this.showFieldError(field, "Value is required");
            return false;
        }

        if (value < -0.001) {
            group.classList.add("error");
            this.showFieldError(field, "Value must be larger or equal to 0");
            return false;
        }

        group.classList.remove("error");
        this.clearFieldError(field);
        return true;
    }

    isValidUUID(uuid) {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    showFieldError(field, message) {
        this.clearFieldError(field);

        const errorDiv = document.createElement("div");
        errorDiv.className = "field-error";
        errorDiv.textContent = message;
        errorDiv.style.color = "var(--danger-color)";
        errorDiv.style.fontSize = "var(--font-size-sm)";
        errorDiv.style.marginTop = "var(--spacing-xs)";

        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        const group = field.closest(".form-group");
        group.classList.remove("error");

        const errorDiv = group.querySelector(".field-error");
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    clearAllFormErrors() {
        const form = document.getElementById("templateForm");
        const allFormGroups = form.querySelectorAll(".form-group");

        allFormGroups.forEach((group) => {
            group.classList.remove("error");
            const errorDiv = group.querySelector(".field-error");
            if (errorDiv) {
                errorDiv.remove();
            }
        });
    }

    async createNewTemplate() {
        if (this.currentTemplate != null) {
            if (this.findTemplate(this.currentTemplate) == false) {
                this.showNotification(
                    `You cannot create new dummy template`,
                    "error"
                );
                return;
            }
        }

        if (this.validateForm() == false) {
            this.showNotification(
                    `Please fill required data first`,
                    "error"
                );
                return;
        }

        const itemID = this.generateGUID();
        const template = {
            itemName: "",
            itemID: itemID,
            id: itemID,
            displayName: "",
            thumbnailDescription: "",
            description: "",
            itemType: "Misc",
            rarity: "Common",
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
            meshPath: "",
            materialPath: "",
            equipSlot: "None",
            customProperties: [],
        };

        this.templates.unshift(template);
        this.currentTemplate = template;
        await this.saveTemplate(template);
        this.renderTemplatesList();
        this.loadTemplateToForm(template);
        this.selectTemplateInList(template.id);
        this.updateSelectionUI();
    }

    async saveCurrentTemplate() {
        if (!this.validateForm()) {
            this.showNotification("Please fill in all required fields", "error");
            return;
        }

        const formData = this.getFormData();

        if (this.currentTemplate) {
            Object.assign(this.currentTemplate, formData);
            await this.saveTemplate(this.currentTemplate);
        } else {
            const template = {
                id: formData.itemID,
                ...formData,
            };
            this.templates.push(template);
            this.currentTemplate = template;
            await this.saveTemplate(template);
        }

        this.renderTemplatesList();
        this.selectTemplateInList(this.currentTemplate.id);
        this.showNotification("Template saved successfully", "success");
    }

    validateForm() {
        const form = document.getElementById("templateForm");

        const maxStackSize = document.getElementById("maxStackSize");
        const weight = document.getElementById("weight");
        const templateValue = document.getElementById("value");
        const durability = document.getElementById("durability");

        const requiredFields = form.querySelectorAll("[required]");
        const itemIdField = document.getElementById("itemID");
        const itemNameField = document.getElementById("itemName");
        let isValid = true;

        if (!this.validateItemId(itemIdField)) {
            isValid = false;
        }

        if (!this.validateItemName(itemNameField)) {
            isValid = false;
        }

        if (!this.validateStackSize(maxStackSize)) {
            const group = maxStackSize.closest(".form-group");            
            group.classList.add("error");
            isValid = false;
        }
        else {
            const group = maxStackSize.closest(".form-group");            
            group.classList.remove("error");
            this.clearFieldError(maxStackSize);
        }

        if (!this.validateZeroNumber(weight)) {
            const group = weight.closest(".form-group");            
            group.classList.add("error");
            isValid = false;
        }
        else {
            const group = weight.closest(".form-group");            
            group.classList.remove("error");
            this.clearFieldError(weight);
        }

        if (!this.validateZeroNumber(templateValue)) {
            const group = templateValue.closest(".form-group");            
            group.classList.add("error");
            isValid = false;
        }
        else {
            const group = templateValue.closest(".form-group");            
            group.classList.remove("error");
            this.clearFieldError(templateValue);
        }

        if (!this.validateZeroNumber(durability)) {
            const group = durability.closest(".form-group");            
            group.classList.add("error");
            isValid = false;
        }
        else {
            const group = durability.closest(".form-group");            
            group.classList.remove("error");
            this.clearFieldError(durability);
        }

        requiredFields.forEach((field) => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    getFormData() {
        const customProps = [];
        const customPropsContainer = document.getElementById(
            "customPropsContainer"
        );
        const propRows = customPropsContainer.querySelectorAll(".custom-prop-row");

        propRows.forEach((row) => {
            const name = row.querySelector(".prop-name").value;
            const value = row.querySelector(".prop-value").value;
            if (name && value) {
                customProps.push({ name, value });
            }
        });

        return {
            itemName: document.getElementById("itemName").value,
            itemID: document.getElementById("itemID").value,
            displayName: document.getElementById("displayName").value,
            thumbnailDescription: document.getElementById("short-description").value,
            description: document.getElementById("description").value,
            itemType: document.getElementById("itemType").value,
            rarity: document.getElementById("rarity").value,
            maxStackSize: parseInt(document.getElementById("maxStackSize").value),
            weight: parseFloat(document.getElementById("weight").value),
            value: parseInt(document.getElementById("value").value),
            durability: parseInt(document.getElementById("durability").value),
            isStackable: document.getElementById("isStackable").checked,
            isDroppable: document.getElementById("isDroppable").checked,
            isUsable: document.getElementById("isUsable").checked,
            isEquippable: document.getElementById("isEquippable").checked,
            isTradeable: document.getElementById("isTradeable").checked,
            isQuestItem: document.getElementById("isQuestItem").checked,
            iconFileId: this.currentTemplate?.iconFileId || null,
            meshFileId: this.currentTemplate?.meshFileId || null,
            meshPath: document.getElementById("meshPath").value,
            materialPath: document.getElementById("materialPath").value,
            equipSlot: document.getElementById("equipSlot").value,
            customProperties: customProps,
        };
    }

    async loadTemplateToForm(template) {
        this.clearAllFormErrors();

        document.getElementById("itemName").value = template.itemName || "";
        document.getElementById("itemID").value = template.itemID || "";
        document.getElementById("displayName").value = template.displayName || "";
        document.getElementById("short-description").value =
            template.thumbnailDescription || "";
        document.getElementById("description").value = template.description || "";
        document.getElementById("itemType").value = template.itemType || "Misc";
        document.getElementById("rarity").value = template.rarity || "Common";
        document.getElementById("maxStackSize").value = template.maxStackSize || 1;
        document.getElementById("weight").value = template.weight || 0;
        document.getElementById("value").value = template.value || 0;
        document.getElementById("durability").value = template.durability || 100;

        document.getElementById("isStackable").checked =
            template.isStackable || false;
        document.getElementById("isDroppable").checked =
            template.isDroppable || false;
        document.getElementById("isUsable").checked = template.isUsable || false;
        document.getElementById("isEquippable").checked =
            template.isEquippable || false;
        document.getElementById("isTradeable").checked =
            template.isTradeable || false;
        document.getElementById("isQuestItem").checked =
            template.isQuestItem || false;

        // Clear file inputs
        document.getElementById("iconPath").value = "";
        document.getElementById("meshPath").value = "";

        // Clear existing file info displays
        this.clearFileInfoDisplays();

        // Show file info for stored files
        await this.showFileInfo(template, "icon");
        await this.showFileInfo(template, "mesh");

        document.getElementById("materialPath").value = template.materialPath || "";
        document.getElementById("equipSlot").value = template.equipSlot || "None";

        // Load custom properties
        this.loadCustomProperties(template.customProperties || []);

        // Show/hide equipment section
        const equipmentSection = document.getElementById("equipmentSection");
        equipmentSection.style.display = template.isEquippable ? "block" : "none";

        this.updatePreview();
    }

    clearFileInfoDisplays() {
        // Clear icon file info
        const iconGroup = document
            .getElementById("iconPath")
            .closest(".form-group");
        const iconInfo = iconGroup.querySelector(".file-info-display");
        if (iconInfo) iconInfo.remove();

        // Clear mesh file info
        const meshGroup = document
            .getElementById("meshPath")
            .closest(".form-group");
        const meshInfo = meshGroup.querySelector(".file-info-display");
        if (meshInfo) meshInfo.remove();
    }

    async showFileInfo(template, fileType) {
        const fileId =
            fileType === "icon" ? template.iconFileId : template.meshFileId;
        if (!fileId) return;

        const fileData = await this.getFile(fileId);
        if (!fileData) return;

        const inputId = fileType === "icon" ? "iconPath" : "meshPath";
        const fileGroup = document.getElementById(inputId).closest(".form-group");

        // Remove existing file info display
        const existingInfo = fileGroup.querySelector(".file-info-display");
        if (existingInfo) existingInfo.remove();

        // Create file info display
        const fileInfoDiv = document.createElement("div");
        fileInfoDiv.className = "file-info-display";

        const statusColor = "var(--success-color)";
        const statusIcon = fileType === "icon" ? "🖼️" : "🎨";

        fileInfoDiv.style.cssText = `
            margin-top: var(--spacing-xs);
            padding: var(--spacing-sm);
            background: var(--bg-light);
            border-radius: var(--border-radius-sm);
            border-left: 3px solid ${statusColor};
            font-size: var(--font-size-sm);
            position: relative;
        `;

        let infoText = `${statusIcon} Stored ${fileType}: ${fileData.fileName}`;
        infoText += `\n📊 Size: ${(fileData.size / 1024).toFixed(1)} KB`;
        infoText += `\n✨ Ready for export!`;

        // Add preview for images
        if (fileType === "icon" && fileData.fileType.startsWith("image/")) {
            const preview = document.createElement("img");
            const previewUrl = await this.getFilePreviewUrl(fileId);
            if (previewUrl) {
                preview.src = previewUrl;
                preview.style.cssText = `
                    width: 32px;
                    height: 32px;
                    object-fit: cover;
                    border-radius: var(--border-radius-sm);
                    float: right;
                    margin-left: var(--spacing-sm);
                `;
                fileInfoDiv.appendChild(preview);
            }
        }

        fileInfoDiv.appendChild(document.createTextNode(infoText));
        fileInfoDiv.style.whiteSpace = "pre-line";
        fileGroup.appendChild(fileInfoDiv);
    }

    loadCustomProperties(properties) {
        const container = document.getElementById("customPropsContainer");
        container.innerHTML = "";
        this.customPropCounter = 0;

        properties.forEach((prop) => {
            this.addCustomProperty(prop.name, prop.value);
        });
    }

    addCustomProperty(name = "", value = "") {
        const container = document.getElementById("customPropsContainer");
        const propId = this.customPropCounter++;

        const propRow = document.createElement("div");
        propRow.className = "custom-prop-row";
        propRow.innerHTML = `
            <div class="properties">
                <div class="form-group property">
                    <label>Property Name</label>
                    <input type="text" class="prop-name" value="${name}" placeholder="Property name">
                </div>
                <div class="form-group property">
                    <label>Value</label>
                    <input type="text" class="prop-value" value="${value}" placeholder="Property value">
                </div> 
            </div>
            <button type="button" class="btn btn-danger btn-small remove-prop close-small">✖</button>           
        `;

        propRow.querySelector(".remove-prop").addEventListener("click", () => {
            propRow.remove();
            this.updatePreview();
        });

        propRow.querySelectorAll("input").forEach((input) => {
            input.addEventListener("input", () => this.updatePreview());
        });

        container.appendChild(propRow);
        this.updatePreview();
    }

    closeCurrentTemplate() {
        if (!this.currentTemplate) {
            return;
        }

        this.clearForm();
        this.currentTemplate = null;
        this.clearTemplateSelection();
        this.updatePreview();
    }

    async deleteCurrentTemplate() {
        if (!this.currentTemplate) {
            this.showNotification("No template selected", "error");
            return;
        }

        if (confirm("Are you sure you want to delete this template?")) {
            await this.deleteTemplate(this.currentTemplate.id);
            this.templates = this.templates.filter(
                (t) => t.id !== this.currentTemplate.id
            );

            // Remove from selection if it was selected - ADDED
            this.selectedTemplates.delete(this.currentTemplate.id);

            this.clearForm();
            this.currentTemplate = null;
            this.renderTemplatesList();
            this.updateSelectionUI();
            this.showNotification("Template deleted successfully", "success");
        }
    }

    async duplicateCurrentTemplate() {
        if (!this.currentTemplate) {
            this.showNotification("No template selected", "error");
            return;
        }

        const newItemId = this.generateGUID();
        const duplicate = {
            ...JSON.parse(JSON.stringify(this.currentTemplate)),
            id: newItemId,
            itemName: this.currentTemplate.itemName + "_Copy",
            itemID: newItemId,
            iconFileId: this.currentTemplate.iconFileId,
            meshFileId: this.currentTemplate.meshFileId,
        };

        this.templates.unshift(duplicate);
        this.currentTemplate = duplicate;
        await this.saveTemplate(duplicate);
        this.renderTemplatesList();
        this.loadTemplateToForm(duplicate);
        this.selectTemplateInList(duplicate.id);
        this.updateSelectionUI();
        this.showNotification("Template duplicated successfully", "success");
    }

    clearForm() {
        document.getElementById("templateForm").reset();
        document.getElementById("customPropsContainer").innerHTML = "";
        document.getElementById("equipmentSection").style.display = "none";

        this.clearFileInfoDisplays();

        this.currentTemplate = null;
        this.customPropCounter = 0;
        this.clearTemplateSelection();
        this.closePreview();
    }

    renderTemplatesList() {
        const list = document.getElementById("templatesList");
        list.innerHTML = "";

        this.templates.forEach((template) => {
            // Create container with checkbox and button
            const container = document.createElement("div");
            container.className = "template-item-container";

            // Add checkbox
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "template-checkbox";
            checkbox.checked = this.selectedTemplates.has(template.id);
            checkbox.addEventListener("click", (e) => {
                e.stopPropagation();
            });
            checkbox.addEventListener("change", (e) => {
                e.stopPropagation();
                this.toggleTemplateSelection(template.id, e.target.checked);
                container.classList.toggle("selected", e.target.checked);
            });

            const button = document.createElement("button");

            const name = template.itemName || "Unnamed Template";
            const abbr = document.createElement("abbr");
            abbr.title = name || "Unnamed Template";
            abbr.textContent = name.length > 18 ? name.slice(0, 15) + "..." : name;

            button.className = "template-item";
            button.dataset.templateId = template.id;
            button.addEventListener("click", () => this.selectTemplate(template.id));

            // Update container selection state
            if (this.selectedTemplates.has(template.id)) {
                container.classList.add("selected");
            }
            button.appendChild(abbr);
            button.appendChild(checkbox);
            container.appendChild(button);
            list.appendChild(container);
        });

        this.updateSelectionUI();
    }

    selectTemplate(templateId) {
        const template = this.templates.find((t) => t.id === templateId);
        if (template) {
            if (this.currentTemplate != null && this.currentTemplate.id === templateId) {
                this.closeCurrentTemplate();
                return;
            }
            this.currentTemplate = template;
            this.loadTemplateToForm(template);
            this.selectTemplateInList(templateId);
            this.toggleSelectionBaseButtons(true);
        } else {
            this.toggleSelectionBaseButtons(false);
        }
    }

    selectTemplateInList(templateId) {
        const buttons = document.querySelectorAll(".template-item");
        buttons.forEach((btn) => btn.classList.remove("active"));

        const activeButton = document.querySelector(
            `[data-template-id="${templateId}"]`
        );
        if (activeButton) {
            activeButton.classList.add("active");
        }
        const template = this.templates.find((t) => t.id === templateId);
        if (template) {
            this.currentTemplate = template;
        }
        this.toggleSelectionBaseButtons(true);
    }

    clearTemplateSelection() {
        const buttons = document.querySelectorAll(".template-item");
        buttons.forEach((btn) => btn.classList.remove("active"));
        this.toggleSelectionBaseButtons(false);
    }

    toggleSelectionBaseButtons(isVisible) {
        const buttons = document.querySelectorAll(".selection");
        buttons.forEach((btn) => btn.classList.toggle("hidden", !isVisible));
    }

    showHelp() {
        document.getElementById("helpModal").classList.add("show");
    }

    closeHelp() {
        document.getElementById("helpModal").classList.remove("show");
    }

    updatePreview() {
        if (!this.currentTemplate) {
            document.getElementById("previewContent").textContent =
                "Preview is empty. Select Template to update the Preview.";
            return;
        }

        const previewData = this.getFormData();
        const jsonString = JSON.stringify(previewData, null, 2);
        document.getElementById("previewContent").textContent = jsonString;
    }

    showPreview() {
        if (!document.getElementById("previewPanel").classList.contains("show")) {
            document.getElementById("previewPanel").classList.add("show");
        }
    }

    closePreview() {
        document.getElementById("previewPanel").classList.remove("show");
    }

    showSettings() {
        this.populateSettingsModal();
        document.getElementById("settingsModal").classList.add("show");
    }

    closeSettings() {
        document.getElementById("settingsModal").classList.remove("show");
    }

    populateSettingsModal() {
        const categoriesContainer = document.getElementById("categoriesContainer");
        const raritiesContainer = document.getElementById("raritiesContainer");
        const equipmentSlotsContainer = document.getElementById(
            "equipmentSlotsContainer"
        );

        categoriesContainer.innerHTML = "";
        this.settings.categories.forEach((category, index) => {
            const categoryRow = document.createElement("div");
            categoryRow.className = "settings-row";
            categoryRow.innerHTML = `
                <input type="text" value="${category}" class="category-input">
                <button type="button" class="btn btn-danger btn-small close-small" onclick="this.parentElement.remove()">✖</button>
            `;
            categoriesContainer.appendChild(categoryRow);
        });

        raritiesContainer.innerHTML = "";
        this.settings.rarities.forEach((rarity, index) => {
            const rarityRow = document.createElement("div");
            rarityRow.className = "settings-row";
            rarityRow.innerHTML = `
                <input type="text" value="${rarity.name}" class="rarity-name-input">
                <input type="color" value="${rarity.color}" class="rarity-color-input">
                <button type="button" class="btn btn-danger btn-small close-small" onclick="this.parentElement.remove()">✖</button>
            `;
            raritiesContainer.appendChild(rarityRow);
        });

        equipmentSlotsContainer.innerHTML = "";
        this.settings.equipmentSlots.forEach((equipmentSlot, index) => {
            const equipmentSlotRow = document.createElement("div");
            equipmentSlotRow.className = "settings-row";
            equipmentSlotRow.innerHTML = `
                <input type="text" value="${equipmentSlot}" class="equipment-slot-input">
                <button type="button" class="btn btn-danger btn-small close-small" onclick="this.parentElement.remove()">✖</button>
            `;
            equipmentSlotsContainer.appendChild(equipmentSlotRow);
        });
    }

    addCategory() {
        const categoriesContainer = document.getElementById("categoriesContainer");
        const categoryRow = document.createElement("div");
        categoryRow.className = "settings-row";
        categoryRow.innerHTML = `
            <input type="text" value="" class="category-input" placeholder="New Category">
            <button type="button" class="btn btn-danger btn-small close-small" onclick="this.parentElement.remove()">✖</button>
        `;
        categoriesContainer.appendChild(categoryRow);
    }

    addRarity() {
        const raritiesContainer = document.getElementById("raritiesContainer");
        const rarityRow = document.createElement("div");
        rarityRow.className = "settings-row";
        rarityRow.innerHTML = `
            <input type="text" value="" class="rarity-name-input" placeholder="New Rarity">
            <input type="color" value="#000000" class="rarity-color-input">
            <button type="button" class="btn btn-danger btn-small close-small" onclick="this.parentElement.remove()">✖</button>
        `;
        raritiesContainer.appendChild(rarityRow);
    }

    addEquipmentSlot() {
        const equipmentSlotsContainer = document.getElementById(
            "equipmentSlotsContainer"
        );
        const equipmentSlotRow = document.createElement("div");
        equipmentSlotRow.className = "settings-row";
        equipmentSlotRow.innerHTML = `
            <input type="text" value="" class="equipment-slot-input" placeholder="New Equipment Slot">
            <button type="button" class="btn btn-danger btn-small close-small" onclick="this.parentElement.remove()">✖</button>
        `;
        equipmentSlotsContainer.appendChild(equipmentSlotRow);
    }

    async saveSettingsData() {
        const categoriesContainer = document.getElementById("categoriesContainer");
        const raritiesContainer = document.getElementById("raritiesContainer");
        const equipmentSlotsContainer = document.getElementById(
            "equipmentSlotsContainer"
        );

        const categories = Array.from(
            categoriesContainer.querySelectorAll(".category-input")
        )
            .map((input) => input.value.trim())
            .filter((value) => value);

        const rarities = Array.from(
            raritiesContainer.querySelectorAll(".settings-row")
        )
            .map((row) => {
                const name = row.querySelector(".rarity-name-input").value.trim();
                const color = row.querySelector(".rarity-color-input").value;
                return { name, color };
            })
            .filter((rarity) => rarity.name);

        const equipmentSlots = Array.form(
            equipmentSlotsContainer.querySelectorAll(".equipment-slot-input")
        )
            .map((input) => input.value.trim())
            .filter((value) => value);

        if (categories.length === 0) {
            this.showNotification("At least one category is required", "error");
            return;
        }

        if (equipmentSlots.length === 0) {
            this.showNotification("At least one equipment slot is required", "error");
            return;
        }

        if (rarities.length === 0) {
            this.showNotification("At least one rarity is required", "error");
            return;
        }

        this.settings.categories = categories;
        this.settings.rarities = rarities;
        this.settings.equipmentSlots = equipmentSlots;

        try {
            await this.saveSettings();
            this.populateDropdowns();
            this.closeSettings();
            this.showNotification("Settings saved successfully", "success");
        } catch (error) {
            this.showNotification("Failed to save settings", "error");
        }
    }

    importTemplate() {
        document.getElementById("fileInput").click();
    }

    initializeFileHandlers() {
        // Icon file handler
        const iconInput = document.getElementById("iconPath");
        iconInput.addEventListener("change", (e) =>
            this.handleFileSelection(e, "icon")
        );

        // Mesh file handler
        const meshInput = document.getElementById("meshPath");
        meshInput.addEventListener("change", (e) =>
            this.handleFileSelection(e, "mesh")
        );
    }

    async handleFileSelection(event, fileType) {
        const file = event.target.files[0];
        const input = event.target;

        // Remove existing file info display
        const fileGroup = input.closest(".form-group");
        const existingInfo = fileGroup.querySelector(".file-info-display");
        if (existingInfo) existingInfo.remove();

        if (!file) return;

        // Validate file type
        if (fileType === "icon") {
            const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/bmp"];
            if (!validTypes.includes(file.type)) {
                this.showNotification(
                    "Invalid file type. Please select JPG, PNG, or BMP.",
                    "error"
                );
                input.value = "";
                return;
            }

            // 5MB limit for images
            if (file.size > 5 * 1024 * 1024) {
                this.showNotification(
                    "File too large. Please select a file under 5MB.",
                    "error"
                );
                input.value = "";
                return;
            }
        } else if (fileType === "mesh") {
            const validTypes = ["application/octet-stream", "model/obj", "model/fbx"];
            const validExtensions = [".obj", ".fbx"];
            const hasValidExtension = validExtensions.some((ext) =>
                file.name.toLowerCase().endsWith(ext)
            );

            if (!hasValidExtension) {
                this.showNotification(
                    "Invalid file type. Please select OBJ or FBX files.",
                    "error"
                );
                input.value = "";
                return;
            }

            // 50MB limit for mesh files
            if (file.size > 50 * 1024 * 1024) {
                this.showNotification(
                    "File too large. Please select a mesh file under 50MB.",
                    "error"
                );
                input.value = "";
                return;
            }
        }

        if (!this.currentTemplate) {
            this.showNotification(
                "Please create or select a template first",
                "error"
            );
            input.value = "";
            return;
        }

        try {
            // Delete old file if exists
            const oldFileId =
                fileType === "icon"
                    ? this.currentTemplate.iconFileId
                    : this.currentTemplate.meshFileId;
            if (oldFileId) {
                await this.deleteFile(oldFileId);
            }

            // Store new file
            const fileId = await this.storeFile(
                this.currentTemplate.id,
                file,
                fileType
            );

            // Update template reference
            if (fileType === "icon") {
                this.currentTemplate.iconFileId = fileId;
            } else {
                this.currentTemplate.meshFileId = fileId;
            }

            // Save template
            await this.saveTemplate(this.currentTemplate);

            // Update display
            await this.showFileInfo(this.currentTemplate, fileType);
            this.updatePreview();

            this.showNotification(`${fileType} file stored successfully!`, "success");
        } catch (error) {
            console.error("File storage error:", error);
            this.showNotification(`Failed to store ${fileType} file`, "error");
            input.value = "";
        }
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const imported = JSON.parse(e.target.result);

                if (Array.isArray(imported)) {
                    // Import multiple templates
                    for (const template of imported) {
                        template.id = template.itemID;
                        this.templates.unshift(template);
                        await this.saveTemplate(template);
                    }
                    this.showNotification(
                        `Imported ${imported.length} templates`,
                        "success"
                    );
                } else {
                    // Import single template
                    imported.id = imported.itemID;
                    imported.meshFileId = null;
                    this.templates.unshift(imported);
                    this.currentTemplate = imported;
                    await this.saveTemplate(imported);
                    this.loadTemplateToForm(imported);
                    this.selectTemplateInList(imported.id);
                    this.showNotification("Template imported successfully", "success");
                }

                this.renderTemplatesList();
                this.updateSelectionUI();
            } catch (error) {
                this.showNotification("Invalid JSON file", "error");
            }
        };

        reader.readAsText(file);
        event.target.value = "";
    }

    async exportTemplates() {
        if (this.templates.length === 0) {
            this.showNotification("No templates to export", "error");
            return;
        }

        // Create export data without file references
        const exportData = this.templates.map((template) => {
            const { iconFileId, meshFileId, ...exportTemplate } = template;
            return exportTemplate;
        });

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(dataBlob);
        link.download = "inventory_templates.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification("Templates exported successfully", "success");
    }

    async exportSingleTemplate() {
        if (!this.currentTemplate) {
            this.showNotification("No template selected", "error");
            return;
        }

        try {
            const JSZip = await this.loadJSZip();
            const zip = new JSZip();

            // Add the JSON template (without file IDs)
            const { iconFileId, meshFileId, ...exportTemplate } =
                this.currentTemplate;
            const templateData = JSON.stringify(exportTemplate, null, 2);
            zip.file("template.json", templateData);

            // Create folders for assets
            const iconFolder = zip.folder("Icon");
            const meshFolder = zip.folder("Mesh");

            // Add icon file
            await this.addFileToZip(
                iconFolder,
                this.currentTemplate.iconFileId,
                "icon"
            );

            // Add mesh file
            await this.addFileToZip(
                meshFolder,
                this.currentTemplate.meshFileId,
                "mesh"
            );

            // Generate and download the .mnteaitem file
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `${this.currentTemplate.itemID || "template"}.mnteaitem`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification("Single template exported successfully", "success");
        } catch (error) {
            console.error("Export error:", error);
            this.showNotification("Export failed. JSZip library required.", "error");
        }
    }

    async exportMultipleTemplates() {
        if (this.templates.length === 0) {
            this.showNotification("No templates to export", "error");
            return;
        }

        try {
            const JSZip = await this.loadJSZip();
            const zip = new JSZip();

            // Determine which templates to export - MODIFIED
            const templatesToExport =
                this.selectedTemplates.size > 0
                    ? this.templates.filter((t) => this.selectedTemplates.has(t.id))
                    : this.templates;

            if (templatesToExport.length === 0) {
                this.showNotification("No templates to export", "error");
                return;
            }

            // Create a folder for each template based on ItemID
            for (const template of templatesToExport) {
                const itemId = template.itemID || template.id;
                const templateFolder = zip.folder(itemId);

                // Add template JSON (without file IDs)
                const { iconFileId, meshFileId, ...exportTemplate } = template;
                const templateData = JSON.stringify(exportTemplate, null, 2);
                templateFolder.file("template.json", templateData);

                // Create asset folders
                const iconFolder = templateFolder.folder("Icon");
                const meshFolder = templateFolder.folder("Mesh");

                // Add files
                await this.addFileToZip(iconFolder, template.iconFileId, "icon");
                await this.addFileToZip(meshFolder, template.meshFileId, "mesh");
            }

            // Generate and download the .mnteaitems file
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = "inventory_templates.mnteaitems";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            const exportCount = templatesToExport.length;
            const message =
                this.selectedTemplates.size > 0
                    ? `${exportCount} selected templates exported successfully`
                    : `${exportCount} templates exported successfully`;
            this.showNotification(message, "success");
        } catch (error) {
            console.error("Export error:", error);
            this.showNotification("Export failed. JSZip library required.", "error");
        }
    }

    async addFileToZip(folder, fileId, fileType) {
        if (!fileId) {
            const readmeText =
                fileType === "icon"
                    ? "Place your icon image file here (PNG, JPG, BMP)"
                    : "Place your mesh file here (FBX, OBJ, etc.)";
            folder.file("README.txt", readmeText);
            return;
        }

        const fileData = await this.getFile(fileId);
        if (!fileData) {
            const readmeText =
                fileType === "icon"
                    ? "Place your icon image file here (PNG, JPG, BMP)"
                    : "Place your mesh file here (FBX, OBJ, etc.)";
            folder.file("README.txt", readmeText);
            return;
        }

        folder.file(fileData.fileName, fileData.data);
    }

    async loadJSZip() {
        if (window.JSZip) {
            return window.JSZip;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src =
                "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => reject(new Error("Failed to load JSZip"));
            document.head.appendChild(script);
        });
    }

    showNotification(message, type = "info") {
        const notification = document.createElement("div");
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        Object.assign(notification.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "1rem 1.5rem",
            borderRadius: "6px",
            color: "white",
            fontWeight: "500",
            zIndex: "9999",
            transform: "translateX(100%)",
            transition: "transform 0.3s ease",
            maxWidth: "300px",
            wordWrap: "break-word",
        });

        switch (type) {
            case "success":
                notification.style.background = "#28a745";
                break;
            case "error":
                notification.style.background = "#dc3545";
                break;
            case "warning":
                notification.style.background = "#ffc107";
                notification.style.color = "#212529";
                break;
            default:
                notification.style.background = "#17a2b8";
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = "translateX(0)";
        }, 100);

        setTimeout(() => {
            notification.style.transform = "translateX(100%)";
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    exportAsDataTable() {
        if (this.templates.length === 0) {
            this.showNotification("No templates to export", "error");
            return;
        }

        const headers = [
            "Name",
            "ItemID",
            "DisplayName",
            "ThumbnailDescription",
            "Description",
            "ItemType",
            "Rarity",
            "MaxStackSize",
            "Weight",
            "Value",
            "Durability",
            "bIsStackable",
            "bIsDroppable",
            "bIsUsable",
            "bIsEquippable",
            "bIsTradeable",
            "bIsQuestItem",
            "MeshPath",
            "MaterialPath",
            "EquipSlot",
        ];

        let csvContent = headers.join(",") + "\n";

        this.templates.forEach((template) => {
            const row = [
                `"${template.itemName || ""}"`,
                `"${template.itemID || ""}"`,
                `"${template.displayName || ""}"`,
                `"${(template.thumbnailDescription || "").replace(/"/g, '""')}"`,
                `"${(template.description || "").replace(/"/g, '""')}"`,
                `"${template.itemType || "Misc"}"`,
                `"${template.rarity || "Common"}"`,
                template.maxStackSize || 1,
                template.weight || 0,
                template.value || 0,
                template.durability || 100,
                template.isStackable ? "True" : "False",
                template.isDroppable ? "True" : "False",
                template.isUsable ? "True" : "False",
                template.isEquippable ? "True" : "False",
                template.isTradeable ? "True" : "False",
                template.isQuestItem ? "True" : "False",
                `"${template.meshPath || ""}"`,
                `"${template.materialPath || ""}"`,
                `"${template.equipSlot || "None"}"`,
            ];

            csvContent += row.join(",") + "\n";
        });

        const dataBlob = new Blob([csvContent], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(dataBlob);
        link.download = "InventoryItemTemplates.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification("Data table exported successfully", "success");
    }
}

// Initialize the editor when the page loads
document.addEventListener("DOMContentLoaded", () => {
    const editor = new InventoryTemplateEditor();

    // Add keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case "s":
                    e.preventDefault();
                    editor.saveCurrentTemplate();
                    break;
                case "n":
                    e.preventDefault();
                    editor.createNewTemplate();
                    break;
                case "d":
                    e.preventDefault();
                    editor.duplicateCurrentTemplate();
                    break;
            }
        }

        if (e.key === "Escape") {
            if (document.getElementById("previewPanel").classList.contains("show")) {
                editor.closePreview();
            } else if (editor.currentTemplate) {
                editor.closeCurrentTemplate();
            } else if (
                document.getElementById("helpModal").classList.contains("show")
            ) {
                editor.closeHelp();
            } else if (
                document.getElementById("settingsModal").classList.contains("show")
            ) {
                editor.closeSettings();
            }
        }

        if (e.key === "F1") {
            e.preventDefault();
            editor.showHelp();
        }
    });
});

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
});

function adjustMainContentPadding() {
    const header = document.querySelector("header");
    const mainContent = document.querySelector(".main-content");
    const headerHeight = header.offsetHeight;
    mainContent.style.paddingTop = `${headerHeight}px`;
}

window.addEventListener("load", adjustMainContentPadding);
window.addEventListener("resize", adjustMainContentPadding);
