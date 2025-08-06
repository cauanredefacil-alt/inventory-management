class Navbar {
    constructor() {
        this.navbarHtml = '';
    }

    async init() {
        try {
            const response = await fetch('../../components/navbar.html');
            this.navbarHtml = await response.text();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error loading navbar:', error);
        }
    }

    setupEventListeners() {
        // You can add any event listeners for the navbar here
    }

    render() {
        // Get the current page to set active state
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';
        
        // Map of page paths to their corresponding nav item IDs
        const navItems = {
            '/': 'nav-dashboard',
            '/index.html': 'nav-dashboard',
            '/pages/estoque.html': 'nav-estoque',
            '/pages/catalogo.html': 'nav-numeros',
            '/pages/usuarios.html': 'nav-usuarios',
            '/pages/configuracoes.html': 'nav-configuracoes'
        };

        // Create a temporary container to manipulate the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.navbarHtml;

        // Update all links to use absolute paths
        const navLinks = tempDiv.querySelectorAll('.nav-links a[href^=""]');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            // Only update if it's not already an absolute path
            if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#')) {
                if (href === 'index.html' || href === '/') {
                    link.setAttribute('href', '/');
                } else {
                    link.setAttribute('href', `/${href}`);
                }
            }
        });

        // Remove active class from all nav items
        Object.values(navItems).forEach(id => {
            const element = tempDiv.querySelector(`#${id}`);
            if (element) {
                element.classList.remove('active');
            }
        });

        // Add active class to current nav item
        const currentNavItem = navItems[currentPath] || navItems[`/${currentPage}`];
        if (currentNavItem) {
            const activeElement = tempDiv.querySelector(`#${currentNavItem}`);
            if (activeElement) {
                activeElement.classList.add('active');
            }
        }

        return tempDiv.innerHTML;
    }
}

// Export the Navbar class
export { Navbar };
