export class FormManager {
    constructor(editor) {
        this.editor = editor;
    }

    serializeForm() {
        return this.editor.ui.getFormData();
    }

    async populateForm(template) {
        await this.editor.ui.loadTemplateToForm(template);
    }

    clearForm() {
        this.editor.ui.clearForm();
    }

    getFormErrors() {
        const form = document.getElementById('templateForm');
        const errorGroups = form.querySelectorAll('.form-group.error');
        
        return Array.from(errorGroups).map(group => {
            const label = group.querySelector('label')?.textContent || 'Unknown field';
            const errorDiv = group.querySelector('.field-error');
            const message = errorDiv?.textContent || 'Invalid value';
            return { field: label, message };
        });
    }

    hasFormErrors() {
        const form = document.getElementById('templateForm');
        return form.querySelectorAll('.form-group.error').length > 0;
    }

    focusFirstError() {
        const form = document.getElementById('templateForm');
        const firstErrorGroup = form.querySelector('.form-group.error');
        
        if (firstErrorGroup) {
            const input = firstErrorGroup.querySelector('input, select, textarea');
            if (input) {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    setFormField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (!field) return false;

        if (field.type === 'checkbox') {
            field.checked = Boolean(value);
        } else {
            field.value = value;
        }

        // Trigger input event for validation and preview update
        field.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }

    getFormField(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return null;

        if (field.type === 'checkbox') {
            return field.checked;
        }
        return field.value;
    }

    resetFormField(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return false;

        if (field.type === 'checkbox') {
            field.checked = false;
        } else if (field.type === 'number') {
            field.value = field.defaultValue || '0';
        } else {
            field.value = field.defaultValue || '';
        }

        field.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }

    populateDropdown(selectId, options, valueKey = null, textKey = null) {
        const select = document.getElementById(selectId);
        if (!select) return false;

        select.innerHTML = '';

        options.forEach(option => {
            const optionElement = document.createElement('option');
            
            if (typeof option === 'string') {
                optionElement.value = option;
                optionElement.textContent = option;
            } else {
                optionElement.value = valueKey ? option[valueKey] : option.value;
                optionElement.textContent = textKey ? option[textKey] : option.text || option.name;
                
                if (option.color) {
                    optionElement.style.color = option.color;
                }
            }
            
            select.appendChild(optionElement);
        });

        return true;
    }

    addFormChangeListener(callback) {
        const form = document.getElementById('templateForm');
        
        const handler = (e) => {
            if (e.target.matches('input, select, textarea')) {
                callback(e.target, e);
            }
        };

        form.addEventListener('input', handler);
        form.addEventListener('change', handler);
        
        return () => {
            form.removeEventListener('input', handler);
            form.removeEventListener('change', handler);
        };
    }

    setupConditionalFields() {
        // Equipment section visibility
        const isEquippableField = document.getElementById('isEquippable');
        const equipmentSection = document.getElementById('equipmentSection');
        
        const toggleEquipmentSection = () => {
            equipmentSection.style.display = isEquippableField.checked ? 'block' : 'none';
        };

        isEquippableField.addEventListener('change', toggleEquipmentSection);
        toggleEquipmentSection(); // Initial state

        // Stack size handling
        const isStackableField = document.getElementById('isStackable');
        const maxStackSizeField = document.getElementById('maxStackSize');
        
        const handleStackable = () => {
            if (isStackableField.checked) {
                maxStackSizeField.min = '1';
                if (parseInt(maxStackSizeField.value) < 1) {
                    maxStackSizeField.value = '1';
                }
            } else {
                maxStackSizeField.value = '1';
            }
        };

        isStackableField.addEventListener('change', handleStackable);
        handleStackable(); // Initial state
    }

    createFormSection(title, fields) {
        const section = document.createElement('section');
        section.className = 'form-section';

        const header = document.createElement('h2');
        header.textContent = title;
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'form-grid';

        fields.forEach(field => {
            const formGroup = this.createFormGroup(field);
            grid.appendChild(formGroup);
        });

        section.appendChild(grid);
        return section;
    }

    createFormGroup(fieldConfig) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = fieldConfig.label;
        label.setAttribute('for', fieldConfig.id);
        
        if (fieldConfig.required) {
            label.innerHTML += '<span style="color: red;">*</span>';
        }

        let input;
        
        switch (fieldConfig.type) {
            case 'select':
                input = document.createElement('select');
                if (fieldConfig.options) {
                    fieldConfig.options.forEach(option => {
                        const optElement = document.createElement('option');
                        optElement.value = option.value || option;
                        optElement.textContent = option.text || option;
                        input.appendChild(optElement);
                    });
                }
                break;
                
            case 'textarea':
                input = document.createElement('textarea');
                if (fieldConfig.rows) input.rows = fieldConfig.rows;
                break;
                
            case 'checkbox':
                input = document.createElement('input');
                input.type = 'checkbox';
                if (fieldConfig.checked) input.checked = true;
                break;
                
            default:
                input = document.createElement('input');
                input.type = fieldConfig.type || 'text';
                if (fieldConfig.min !== undefined) input.min = fieldConfig.min;
                if (fieldConfig.max !== undefined) input.max = fieldConfig.max;
                if (fieldConfig.step !== undefined) input.step = fieldConfig.step;
                if (fieldConfig.maxLength) input.maxLength = fieldConfig.maxLength;
                break;
        }

        input.id = fieldConfig.id;
        input.name = fieldConfig.name || fieldConfig.id;
        
        if (fieldConfig.required) input.required = true;
        if (fieldConfig.placeholder) input.placeholder = fieldConfig.placeholder;
        if (fieldConfig.value !== undefined) input.value = fieldConfig.value;

        group.appendChild(label);
        group.appendChild(input);

        if (fieldConfig.help) {
            const helpText = document.createElement('small');
            helpText.className = 'help-text';
            helpText.textContent = fieldConfig.help;
            group.appendChild(helpText);
        }

        return group;
    }

    getFormValues() {
        const form = document.getElementById('templateForm');
        const formData = new FormData(form);
        const values = {};

        for (const [key, value] of formData.entries()) {
            const field = form.querySelector(`[name="${key}"]`);
            
            if (field?.type === 'checkbox') {
                values[key] = field.checked;
            } else if (field?.type === 'number') {
                values[key] = value ? parseFloat(value) : 0;
            } else {
                values[key] = value;
            }
        }

        // Handle unchecked checkboxes
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (!values.hasOwnProperty(checkbox.name)) {
                values[checkbox.name] = false;
            }
        });

        return values;
    }

    setFormValues(values) {
        Object.entries(values).forEach(([key, value]) => {
            this.setFormField(key, value);
        });
    }

    markFieldsAsRequired(fieldIds) {
        fieldIds.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.required = true;
                const label = field.closest('.form-group')?.querySelector('label');
                if (label && !label.innerHTML.includes('*')) {
                    label.innerHTML += '<span style="color: red;">*</span>';
                }
            }
        });
    }

    removeRequiredFromFields(fieldIds) {
        fieldIds.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.required = false;
                const label = field.closest('.form-group')?.querySelector('label');
                if (label) {
                    label.innerHTML = label.innerHTML.replace(/<span[^>]*>\*<\/span>/, '');
                }
            }
        });
    }

    createCustomPropertyRow(name = '', value = '') {
        const propRow = document.createElement('div');
        propRow.className = 'custom-prop-row';
        
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

        const removeBtn = propRow.querySelector('.remove-prop');
        removeBtn.addEventListener('click', () => {
            propRow.remove();
            this.editor.ui.updatePreview();
        });

        const inputs = propRow.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.editor.ui.updatePreview());
        });

        return propRow;
    }

    getCustomProperties() {
        const container = document.getElementById('customPropsContainer');
        const propRows = container.querySelectorAll('.custom-prop-row');
        const properties = [];

        propRows.forEach(row => {
            const name = row.querySelector('.prop-name').value.trim();
            const value = row.querySelector('.prop-value').value.trim();
            if (name && value) {
                properties.push({ name, value });
            }
        });

        return properties;
    }

    setCustomProperties(properties) {
        const container = document.getElementById('customPropsContainer');
        container.innerHTML = '';

        properties.forEach(prop => {
            const row = this.createCustomPropertyRow(prop.name, prop.value);
            container.appendChild(row);
        });
    }

    addCustomProperty(name = '', value = '') {
        const container = document.getElementById('customPropsContainer');
        const row = this.createCustomPropertyRow(name, value);
        container.appendChild(row);
        this.editor.ui.updatePreview();
    }
}