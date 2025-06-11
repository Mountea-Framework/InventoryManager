export class ValidationManager {
    constructor(editor) {
        this.editor = editor;
        this.validationRules = new Map();
        this.setupDefaultRules();
    }

    setupDefaultRules() {
        this.addRule('itemName', {
            required: true,
            maxLength: 24,
            pattern: /^[a-zA-Z_]+$/,
            custom: (value) => {
                if (/\s/.test(value)) return 'Item Name cannot contain whitespace';
                return null;
            }
        });

        this.addRule('displayName', { required: true });
        
        this.addRule('itemID', {
            required: true,
            custom: (value) => {
                if (!this.isValidUUID(value)) return 'Item ID must be a valid UUID format';
                return null;
            }
        });

        this.addRule('maxStackSize', {
            required: true,
            min: 1,
            type: 'number'
        });

        this.addRule('weight', {
            required: true,
            min: 0,
            type: 'number'
        });

        this.addRule('value', {
            required: true,
            min: 0,
            type: 'number'
        });

        this.addRule('durability', {
            required: true,
            min: 0,
            max: 100,
            type: 'number'
        });
    }

    addRule(fieldId, rule) {
        this.validationRules.set(fieldId, rule);
    }

    removeRule(fieldId) {
        this.validationRules.delete(fieldId);
    }

    setupFormValidation() {
        const form = document.getElementById('templateForm');
        const fields = form.querySelectorAll('input, select, textarea');

        fields.forEach(field => {
            field.addEventListener('blur', () => this.validateField(field.id || field.name));
            field.addEventListener('input', () => this.clearFieldError(field.id || field.name));
        });
    }

    validateField(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return true;

        const rule = this.validationRules.get(fieldId);
        if (!rule) return true;

        const value = field.type === 'checkbox' ? field.checked : field.value.trim();
        const error = this.checkRule(value, rule);

        if (error) {
            this.showFieldError(field, error);
            return false;
        }

        this.clearFieldError(fieldId);
        return true;
    }

    checkRule(value, rule) {
        // Required check
        if (rule.required && (!value || value === '')) {
            return 'This field is required';
        }

        // Skip other checks if value is empty and not required
        if (!value && !rule.required) return null;

        // Type conversion for numbers
        if (rule.type === 'number') {
            const num = parseFloat(value);
            if (isNaN(num)) return 'Must be a valid number';
            value = num;
        }

        // Min/Max checks
        if (rule.min !== undefined && value < rule.min) {
            return `Value must be at least ${rule.min}`;
        }

        if (rule.max !== undefined && value > rule.max) {
            return `Value must be no more than ${rule.max}`;
        }

        // Length checks
        if (rule.minLength !== undefined && value.length < rule.minLength) {
            return `Must be at least ${rule.minLength} characters`;
        }

        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
            return `Must be no more than ${rule.maxLength} characters`;
        }

        // Pattern check
        if (rule.pattern && !rule.pattern.test(value)) {
            return rule.patternMessage || 'Invalid format';
        }

        // Custom validation
        if (rule.custom) {
            const customError = rule.custom(value);
            if (customError) return customError;
        }

        return null;
    }

    validateForm() {
        const form = document.getElementById('templateForm');
        let isValid = true;
        const errors = [];

        // Validate all fields with rules
        for (const fieldId of this.validationRules.keys()) {
            if (!this.validateField(fieldId)) {
                isValid = false;
                const field = document.getElementById(fieldId);
                const group = field?.closest('.form-group');
                const errorDiv = group?.querySelector('.field-error');
                if (errorDiv) {
                    errors.push({
                        field: fieldId,
                        message: errorDiv.textContent
                    });
                }
            }
        }

        return { isValid, errors };
    }

    showFieldError(field, message) {
        this.clearFieldError(field.id || field.name);

        const group = field.closest('.form-group');
        group.classList.add('error');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = 'var(--danger-color)';
        errorDiv.style.fontSize = 'var(--font-size-sm)';
        errorDiv.style.marginTop = 'var(--spacing-xs)';

        group.appendChild(errorDiv);
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        const group = field.closest('.form-group');
        group.classList.remove('error');

        const errorDiv = group.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    clearAllFormErrors() {
        const form = document.getElementById('templateForm');
        const allFormGroups = form.querySelectorAll('.form-group');

        allFormGroups.forEach(group => {
            group.classList.remove('error');
            const errorDiv = group.querySelector('.field-error');
            if (errorDiv) {
                errorDiv.remove();
            }
        });
    }

    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    validateTemplate(template) {
        const errors = [];
        
        // Check each field against its rules
        for (const [fieldId, rule] of this.validationRules.entries()) {
            const value = template[fieldId];
            const error = this.checkRule(value, rule);
            if (error) {
                errors.push({
                    field: fieldId,
                    message: error
                });
            }
        }

        // Additional template-specific validations
        if (template.isStackable && template.maxStackSize <= 1) {
            errors.push({
                field: 'maxStackSize',
                message: 'Stackable items must have max stack size greater than 1'
            });
        }

        if (template.isEquippable && template.equipSlot === 'None') {
            errors.push({
                field: 'equipSlot',
                message: 'Equippable items must have a valid equipment slot'
            });
        }

        // Custom properties validation
        if (template.customProperties) {
            template.customProperties.forEach((prop, index) => {
                if (!prop.name || !prop.value) {
                    errors.push({
                        field: 'customProperties',
                        message: `Custom property ${index + 1} must have both name and value`
                    });
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    getValidationSummary() {
        const validation = this.validateForm();
        const summary = {
            isValid: validation.isValid,
            errorCount: validation.errors.length,
            errors: validation.errors,
            fieldErrors: {}
        };

        validation.errors.forEach(error => {
            summary.fieldErrors[error.field] = error.message;
        });

        return summary;
    }

    highlightInvalidFields() {
        const validation = this.validateForm();
        
        validation.errors.forEach(error => {
            const field = document.getElementById(error.field);
            if (field) {
                field.style.animation = 'shake 0.5s';
                setTimeout(() => {
                    field.style.animation = '';
                }, 500);
            }
        });

        return validation.isValid;
    }

    addCustomValidation(fieldId, validatorFunction, errorMessage) {
        const existingRule = this.validationRules.get(fieldId) || {};
        existingRule.custom = (value) => {
            if (!validatorFunction(value)) {
                return errorMessage;
            }
            return null;
        };
        this.validationRules.set(fieldId, existingRule);
    }

    removeCustomValidation(fieldId) {
        const rule = this.validationRules.get(fieldId);
        if (rule && rule.custom) {
            delete rule.custom;
            this.validationRules.set(fieldId, rule);
        }
    }

    validateOnSubmit(form) {
        const validation = this.validateForm();
        
        if (!validation.isValid) {
            // Focus on first error
            const firstError = validation.errors[0];
            if (firstError) {
                const field = document.getElementById(firstError.field);
                if (field) {
                    field.focus();
                    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            
            // Show summary of errors
            this.showValidationSummary(validation.errors);
        }

        return validation.isValid;
    }

    showValidationSummary(errors) {
        // Create or update validation summary element
        let summary = document.getElementById('validation-summary');
        
        if (!summary) {
            summary = document.createElement('div');
            summary.id = 'validation-summary';
            summary.className = 'validation-summary';
            summary.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--danger-color);
                color: white;
                padding: var(--spacing-md);
                border-radius: var(--border-radius-md);
                max-width: 300px;
                z-index: 9999;
                box-shadow: var(--shadow-lg);
            `;
            document.body.appendChild(summary);
        }

        summary.innerHTML = `
            <h4 style="margin: 0 0 var(--spacing-sm) 0;">Validation Errors</h4>
            <ul style="margin: 0; padding-left: var(--spacing-md);">
                ${errors.map(error => `<li>${error.message}</li>`).join('')}
            </ul>
        `;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (summary.parentNode) {
                summary.parentNode.removeChild(summary);
            }
        }, 5000);
    }

    enableRealTimeValidation() {
        const form = document.getElementById('templateForm');
        
        form.addEventListener('input', (e) => {
            if (e.target.matches('input, select, textarea')) {
                // Debounce validation
                clearTimeout(e.target.validationTimeout);
                e.target.validationTimeout = setTimeout(() => {
                    this.validateField(e.target.id || e.target.name);
                }, 300);
            }
        });
    }

    disableRealTimeValidation() {
        const form = document.getElementById('templateForm');
        const fields = form.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            clearTimeout(field.validationTimeout);
        });
    }

    validateUniqueness(items, getValueFn, itemTypeName) {
        const values = items.map(getValueFn).filter(val => val.trim());
        const duplicates = values.filter((val, index) => 
            values.findIndex(v => v.toLowerCase() === val.toLowerCase()) !== index
        );
        
        if (duplicates.length > 0) {
            const uniqueDuplicates = [...new Set(duplicates)];
            return {
                isValid: false,
                message: `Duplicate ${itemTypeName}${uniqueDuplicates.length > 1 ? 's' : ''}: ${uniqueDuplicates.join(', ')}`
            };
        }
        
        return { isValid: true };
    }
}