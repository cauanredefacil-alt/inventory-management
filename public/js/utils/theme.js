class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('themeToggle');
        this.themeIcon = document.getElementById('themeIcon');
        this.init();
    }

    init() {

        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        

        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            this.setTheme(systemPrefersDark ? 'dark' : 'light');
        }


        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }


        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(theme) {

        document.documentElement.setAttribute('data-theme', theme);
        
        // Update the icon
        if (this.themeIcon) {
            this.themeIcon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
        }
        

        localStorage.setItem('theme', theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
});
