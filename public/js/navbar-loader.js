// Load the navbar component
async function loadNavbar() {
    try {
        // Import the navbar component
        const { Navbar } = await import('/public/js/components/navbar.js');
        
        // Create and initialize the navbar
        const navbar = new Navbar();
        await navbar.init();
        
        // Insert the navbar into the container
        const navbarContainer = document.getElementById('navbar-container');
        if (navbarContainer) {
            navbarContainer.innerHTML = navbar.render();
            
            // Add header element if it doesn't exist
            if (!document.querySelector('header.app-header')) {
                const header = document.createElement('header');
                header.className = 'app-header';
                navbarContainer.prepend(header);
            }
        } else {
            console.error('Navbar container not found');
        }
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

// Load the navbar when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadNavbar);
