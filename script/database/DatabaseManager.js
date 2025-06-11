export class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbName = 'InventoryTemplateDB';
        this.version = 2;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;
                this.createObjectStores();
            };
        });
    }

    createObjectStores() {
        // Templates store
        if (!this.db.objectStoreNames.contains('templates')) {
            const templatesStore = this.db.createObjectStore('templates', {
                keyPath: 'id'
            });
            templatesStore.createIndex('itemName', 'itemName', { unique: false });
        }

        // Files store
        if (!this.db.objectStoreNames.contains('files')) {
            const filesStore = this.db.createObjectStore('files', {
                keyPath: 'id'
            });
            filesStore.createIndex('templateId', 'templateId', { unique: false });
            filesStore.createIndex('type', 'type', { unique: false });
        }

        // Settings store
        if (!this.db.objectStoreNames.contains('settings')) {
            this.db.createObjectStore('settings', {
                keyPath: 'key'
            });
        }
    }

    async get(storeName, key) {
        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Failed to get item from ${storeName}:`, error);
            throw error;
        }
    }

    async getAll(storeName) {
        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Failed to get all items from ${storeName}:`, error);
            return [];
        }
    }

    async put(storeName, item) {
        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                transaction.oncomplete = () => resolve(request.result);
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error(`Failed to put item in ${storeName}:`, error);
            throw error;
        }
    }

    async delete(storeName, key) {
        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve();
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error(`Failed to delete item from ${storeName}:`, error);
            throw error;
        }
    }

    async deleteByIndex(storeName, indexName, value) {
        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const range = IDBKeyRange.only(value);
            const request = index.openCursor(range);

            return new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error(`Failed to delete items by index from ${storeName}:`, error);
            throw error;
        }
    }

    async getByIndex(storeName, indexName, value) {
        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Failed to get items by index from ${storeName}:`, error);
            return [];
        }
    }

    async count(storeName) {
        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Failed to count items in ${storeName}:`, error);
            return 0;
        }
    }

    async clear(storeName) {
        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve();
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error(`Failed to clear ${storeName}:`, error);
            throw error;
        }
    }

    // Settings-specific methods
    async getSettings() {
        try {
            const settings = {};
            const allSettings = await this.getAll('settings');
            
            allSettings.forEach(setting => {
                settings[setting.key] = setting.value;
            });
            
            return settings;
        } catch (error) {
            console.error('Failed to get settings:', error);
            return {};
        }
    }

    async saveSettings(settingsObject) {
        try {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');

            // Save each setting
            for (const [key, value] of Object.entries(settingsObject)) {
                await store.put({ key, value });
            }

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('Failed to save settings:', error);
            throw error;
        }
    }

    async getSetting(key) {
        try {
            const result = await this.get('settings', key);
            return result ? result.value : null;
        } catch (error) {
            console.error(`Failed to get setting ${key}:`, error);
            return null;
        }
    }

    async setSetting(key, value) {
        try {
            await this.put('settings', { key, value });
        } catch (error) {
            console.error(`Failed to set setting ${key}:`, error);
            throw error;
        }
    }

    // Utility methods
    isOpen() {
        return this.db !== null;
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    async backup() {
        try {
            const backup = {
                version: this.version,
                timestamp: new Date().toISOString(),
                data: {
                    templates: await this.getAll('templates'),
                    settings: await this.getAll('settings')
                }
            };
            return backup;
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }

    async restore(backupData) {
        try {
            // Clear existing data
            await this.clear('templates');
            await this.clear('settings');

            // Restore templates
            if (backupData.data.templates) {
                for (const template of backupData.data.templates) {
                    await this.put('templates', template);
                }
            }

            // Restore settings
            if (backupData.data.settings) {
                for (const setting of backupData.data.settings) {
                    await this.put('settings', setting);
                }
            }

            return true;
        } catch (error) {
            console.error('Failed to restore backup:', error);
            throw error;
        }
    }
}