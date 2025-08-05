// Load the navbar component into the header
document.addEventListener('DOMContentLoaded', function() {
    // Load the navbar
    fetch('../components/navbar.html')
        .then(response => response.text())
        .then(data => {
            // Insert the navbar into the header
            const header = document.querySelector('header.app-header');
            if (header) {
                header.innerHTML = data;
                
                // Highlight the active page in the navbar
                const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                const navItems = {
                    'dashboard.html': 'nav-dashboard',
                    'estoque.html': 'nav-estoque',
                    'catalogo.html': 'nav-catalogo',
                    'usuarios.html': 'nav-usuarios',
                    'configuracoes.html': 'nav-configuracoes'
                };

                // Remove active class from all nav items
                Object.values(navItems).forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.classList.remove('active');
                    }
                });

                // Add active class to current page nav item
                const currentNavItem = navItems[currentPage];
                if (currentNavItem) {
                    const activeElement = document.getElementById(currentNavItem);
                    if (activeElement) {
                        activeElement.classList.add('active');
                    }
                }
            }
        })
        .catch(error => console.error('Error loading navbar:', error));
});
