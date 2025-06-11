import { InventoryEditor } from './core/InventoryEditor.js';

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InventoryEditor();
});

// Prevent right-click context menu
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

// Adjust main content padding for responsive design
function adjustMainContentPadding() {
    const header = document.querySelector('header');
    const mainContent = document.querySelector('.main-content');
    const headerHeight = header.offsetHeight;
    mainContent.style.paddingTop = `${headerHeight}px`;
}

window.addEventListener('load', adjustMainContentPadding);
window.addEventListener('resize', adjustMainContentPadding);