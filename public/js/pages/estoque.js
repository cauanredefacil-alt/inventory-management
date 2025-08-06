// Estoque specific code
class StockManagement {
    constructor() {
        // Extract estoque related code from stockManagement.js
        console.log('Estoque management initialized');
        // Add your estoque specific code here
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('stockTableBody')) {
        window.stockManager = new StockManagement();
    }
});
