// Theme Toggle
const themeToggle = document.querySelector('.theme-toggle');
const body = document.body;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    body.classList.add(savedTheme);
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    const currentTheme = body.classList.contains('dark-theme') ? 'dark-theme' : '';
    localStorage.setItem('theme', currentTheme);
});

// Language Toggle
const languageToggle = document.querySelector('.language-toggle');
const translations = {
    'pt': {
        'Gerenciador de invetário': 'Gerenciador de invetário',
        'Dashboard': 'Painel',
        'Stock': 'Estoque',
        'Parts': 'Peças',
        'Orders': 'Pedidos',
        'Settings': 'Configurações',
        'Welcome to Gerenciador de invetário': 'Bem-vindo ao Gerenciador de invetário',
        'Total Stock': 'Estoque Total',
        'Parts': 'Peças',
        'Pending Orders': 'Pedidos Pendentes',
        'Total Value': 'Valor Total',
        'Suppliers': 'Fornecedores',
        'Customers': 'Clientes',
        'Settings': 'Configurações',
        'Users': 'Usuários',
        'Name': 'Nome',
        'Email': 'Email',
        'Actions': 'Ações',
        'Add User': 'Adicionar Usuário',
        'Edit': 'Editar',
        'Delete': 'Excluir',
        'Confirm Delete': 'Tem certeza que deseja excluir?',
        'Saving...': 'Salvando...',
        'Deleting...': 'Excluindo...',
        'Error': 'Erro',
        'Error loading users': 'Erro ao carregar usuários',
        'Error saving user': 'Erro ao salvar usuário',
        'Error deleting user': 'Erro ao excluir usuário',
        'Try Again': 'Tentar Novamente',
        'Previous': 'Anterior',
        'Next': 'Próximo',
        'Search': 'Pesquisar'
    },
    'en': {
        'Gerenciador de invetário': 'Gerenciador de invetário',
        'Dashboard': 'Dashboard',
        'Stock': 'Stock',
        'Parts': 'Parts',
        'Orders': 'Orders',
        'Settings': 'Settings',
        'Welcome to Gerenciador de invetário': 'Welcome to Gerenciador de invetário',
        'Total Stock': 'Total Stock',
        'Parts': 'Parts',
        'Pending Orders': 'Pending Orders',
        'Total Value': 'Total Value',
        'Suppliers': 'Suppliers',
        'Customers': 'Customers',
        'Settings': 'Settings',
        'Users': 'Users',
        'Name': 'Name',
        'Email': 'Email',
        'Actions': 'Actions',
        'Add User': 'Add User',
        'Edit': 'Edit',
        'Delete': 'Delete',
        'Confirm Delete': 'Are you sure you want to delete?',
        'Saving...': 'Saving...',
        'Deleting...': 'Deleting...',
        'Error': 'Error',
        'Error loading users': 'Error loading users',
        'Error saving user': 'Error saving user',
        'Error deleting user': 'Error deleting user',
        'Try Again': 'Try Again',
        'Previous': 'Previous',
        'Next': 'Next',
        'Search': 'Search'
    }
};

// Set initial language
const savedLanguage = localStorage.getItem('language') || 'pt';
languageToggle.textContent = savedLanguage.toUpperCase();

function updateTranslations(lang) {
    // Update navigation
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        const text = link.textContent.trim();
        if (translations[lang][text]) {
            link.textContent = translations[lang][text];
        }
    });

    // Update sidebar
    const sidebarLinks = document.querySelectorAll('.sidebar-links a');
    sidebarLinks.forEach(link => {
        const text = link.textContent.trim();
        if (translations[lang][text]) {
            link.textContent = translations[lang][text];
        }
    });

    // Update dashboard cards
    const cards = document.querySelectorAll('.card h3');
    cards.forEach(card => {
        const text = card.textContent.trim();
        if (translations[lang][text]) {
            card.textContent = translations[lang][text];
        }
    });

    // Update main heading
    const mainHeading = document.querySelector('.content h1');
    if (mainHeading) {
        mainHeading.textContent = translations[lang]['Welcome to Gerenciador de invetário'];
    }

    // Update user interface elements
    const userElements = document.querySelectorAll('.user-name, .user-email, .user-actions');
    userElements.forEach(element => {
        const text = element.textContent.trim();
        if (translations[lang][text]) {
            element.textContent = translations[lang][text];
        }
    });
}

// Initial translation
updateTranslations(savedLanguage);

languageToggle.addEventListener('click', () => {
    const currentLang = languageToggle.textContent.toLowerCase();
    const newLang = currentLang === 'pt' ? 'en' : 'pt';
    languageToggle.textContent = newLang.toUpperCase();
    updateTranslations(newLang);
});

// Import API service
import ApiService from './api.js';
import PartsApiService from './partsApi.js';

// User Management
let isLoading = false;

const itemsPerPage = 10;
let currentPage = 1;

let searchQuery = '';

async function fetchUsers(page = 1) {
    if (isLoading) return;
    
    isLoading = true;
    currentPage = page;
    
    try {
        const content = document.querySelector('.content');
        content.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Carregando...</p>
            </div>
        `;
        
        const users = await ApiService.getUsers();
        const filteredUsers = searchQuery 
            ? users.filter(user => 
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : users;
        
        displayUsers(filteredUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        showError('Erro ao carregar usuários');
    } finally {
        isLoading = false;
    }
}

function initSearch() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input type="text" id="search-input" placeholder="${translations[savedLanguage]['Search']}..." />
        <button id="search-btn" class="search-btn">
            <i class="fas fa-search"></i>
        </button>
    `;
    
    document.querySelector('.content').insertBefore(searchContainer, document.querySelector('.content').firstChild);
    
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        fetchUsers(1);
    });
    
    searchBtn.addEventListener('click', () => {
        searchInput.focus();
    });
}

function displayUsers(users) {
    const content = document.querySelector('.content');
    
    // Calculate pagination
    const totalPages = Math.ceil(users.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedUsers = users.slice(startIdx, endIdx);
    
    content.innerHTML = `
        <div class="user-list">
            <table class="users-table">
                <thead>
                    <tr>
                        <th>${translations[savedLanguage]['Name']}</th>
                        <th>${translations[savedLanguage]['Email']}</th>
                        <th>${translations[savedLanguage]['Actions']}</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedUsers.map(user => `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>
                                <button onclick="openUserModal('edit', '${user._id}')" class="edit-btn">
                                    ${translations[savedLanguage]['Edit']}
                                </button>
                                <button onclick="deleteUser('${user._id}')" class="delete-btn">
                                    ${translations[savedLanguage]['Delete']}
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${createPagination(totalPages)}
        </div>
    `;
}

function createPagination(totalPages) {
    if (totalPages <= 1) return '';
    
    const pagesToShow = 5;
    const startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + pagesToShow - 1);
    
    return `
        <div class="pagination">
            <button onclick="fetchUsers(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                ${translations[savedLanguage]['Previous']}
            </button>
            ${Array.from({ length: endPage - startPage + 1 }, (_, i) => 
                `<button onclick="fetchUsers(${startPage + i})" ${startPage + i === currentPage ? 'class="active"' : ''}>
                    ${startPage + i}
                </button>`
            ).join('')}
            <button onclick="fetchUsers(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                ${translations[savedLanguage]['Next']}
            </button>
        </div>
    `;
}

function showError(message) {
    const content = document.querySelector('.content');
    content.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <button onclick="fetchUsers()">Tentar Novamente</button>
        </div>
    `;
}

function displayUsers(users) {
    const content = document.querySelector('.content');
    content.innerHTML = `
        <h2>${translations[savedLanguage]['Users']}</h2>
        <button onclick="openUserModal('add')" class="add-user-btn">${translations[savedLanguage]['Add User']}</button>
        <table class="users-table">
            <thead>
                <tr>
                    <th>${translations[savedLanguage]['Name']}</th>
                    <th>${translations[savedLanguage]['Email']}</th>
                    <th>${translations[savedLanguage]['Actions']}</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>
                            <button onclick="openUserModal('edit', '${user._id}')" class="edit-btn">${translations[savedLanguage]['Edit']}</button>
                            <button onclick="deleteUser('${user._id}')" class="delete-btn">${translations[savedLanguage]['Delete']}</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function openUserModal(action, userId) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'user-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>${action === 'add' ? translations[savedLanguage]['Add User'] : translations[savedLanguage]['Edit User']}</h3>
            <form id="user-form">
                <input type="hidden" name="id" value="${userId || ''}">
                <label for="name">${translations[savedLanguage]['Name']}</label>
                <input type="text" id="name" name="name" required>
                <label for="email">${translations[savedLanguage]['Email']}</label>
                <input type="email" id="email" name="email" required>
                <div class="modal-buttons">
                    <button type="submit" class="submit-btn">${translations[savedLanguage][action === 'add' ? 'Add' : 'Save']}</button>
                    <button type="button" class="cancel-btn" onclick="closeModal(this)">${translations[savedLanguage]['Cancel']}</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Fill form if editing
    if (action === 'edit' && userId) {
        ApiService.getUser(userId).then(user => {
            document.getElementById('name').value = user.name;
            document.getElementById('email').value = user.email;
        });
    }

    // Handle form submission
    document.getElementById('user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData);

        try {
            const submitBtn = modal.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = translations[savedLanguage]['Saving...'];
            
            if (action === 'add') {
                await ApiService.createUser(userData);
            } else {
                await ApiService.updateUser(userId, userData);
            }
            
            closeModal(modal);
            fetchUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            showError('Erro ao salvar usuário');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = translations[savedLanguage][action === 'add' ? 'Add' : 'Save'];
        }
    });
}

function deleteUser(userId) {
    if (confirm(translations[savedLanguage]['Confirm Delete'])) {
        try {
            const deleteBtn = document.querySelector(`button[onclick*="deleteUser('${userId}')"]`);
            deleteBtn.disabled = true;
            deleteBtn.textContent = translations[savedLanguage]['Deleting...'];
            
            ApiService.deleteUser(userId)
                .then(() => fetchUsers())
                .catch(error => {
                    console.error('Error deleting user:', error);
                    showError('Erro ao excluir usuário');
                })
                .finally(() => {
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = translations[savedLanguage]['Delete'];
                });
        } catch (error) {
            console.error('Error deleting user:', error);
            showError('Erro ao excluir usuário');
        }
    }
}

function closeModal(modal) {
    modal.remove();
}

// Navigation System
function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-links .nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            try {
                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                
                // Add active class to clicked link
                link.classList.add('active');
                
                // Get section from data attribute
                const section = link.getAttribute('data-section');
                
                if (section) {
                    // Navigate to section
                    navigateToSection(section);
                } else {
                    console.error('No data-section attribute found on navigation link');
                }
            } catch (error) {
                console.error('Error handling navigation click:', error);
            }
        });
    });
    
    // Also handle initial page load from URL hash
    window.addEventListener('popstate', handlePopState);
    
    // Check for hash on initial load
    if (window.location.hash) {
        const section = window.location.hash.substring(1);
        if (section) {
            navigateToSection(section);
        }
    }
}

function handlePopState() {
    if (window.location.hash) {
        const section = window.location.hash.substring(1);
        if (section) {
            navigateToSection(section);
            
            // Update active link
            document.querySelectorAll('.sidebar-links .nav-link').forEach(link => {
                if (link.getAttribute('data-section') === section) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    }
}

function navigateToSection(section) {
    try {
        // Update URL hash for bookmarking
        window.history.pushState({}, '', `#${section}`);
        
        const content = document.querySelector('.content');
        if (!content) {
            console.error('Content container not found');
            return;
        }
        
        // Show loading state
        content.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Carregando ${section}...</p>
            </div>
        `;
        
        // Use a small timeout to allow the UI to update before loading the section
        setTimeout(() => {
            switch(section) {
                case 'dashboard':
                    showDashboard();
                    break;
                case 'stock':
                    showStock();
                    break;
                case 'parts':
                    showParts();
                    break;
                case 'users':
                    showUsers();
                    break;
                case 'settings':
                    showSettings();
                    break;
                default:
                    console.warn(`Unknown section: ${section}, showing dashboard`);
                    showDashboard();
            }
        }, 50);
    } catch (error) {
        console.error('Error navigating to section:', error);
        const content = document.querySelector('.content');
        if (content) {
            content.innerHTML = `
                <div class="error-message">
                    <h2>Erro ao carregar a página</h2>
                    <p>Ocorreu um erro ao tentar carregar a seção solicitada.</p>
                    <button onclick="navigateToSection('dashboard')" class="btn">Voltar ao Início</button>
                </div>
            `;
        }
    }
}

function showDashboard() {
    const content = document.querySelector('.content');
    content.innerHTML = `
        <h1>${translations[savedLanguage]['Welcome to Gerenciador de invetário']}</h1>
        <div class="dashboard-cards">
            <div class="card">
                <h3>Total de Peças</h3>
                <p class="number">89</p>
            </div>
            <div class="card">
                <h3>Peças em Estoque</h3>
                <p class="number">67</p>
            </div>
            <div class="card">
                <h3>Estoque Baixo</h3>
                <p class="number">8</p>
            </div>
            <div class="card">
                <h3>Categorias</h3>
                <p class="number">12</p>
            </div>
        </div>
        <div class="recent-activity">
            <h2>Atividade Recente</h2>
            <ul>
                <li>Peça "Motor DC 12V" adicionada</li>
                <li>Estoque de "Resistor 10kΩ" atualizado</li>
                <li>Nova categoria "Sensores" criada</li>
                <li>Peça "Capacitor 100uF" removida</li>
            </ul>
        </div>
    `;
}

async function showStock() {
    if (isLoading) return;
    
    isLoading = true;
    const content = document.querySelector('.content');
    
    try {
        content.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Carregando estoque...</p>
            </div>
        `;
        
        const parts = await PartsApiService.getParts();
        displayStock(parts);
    } catch (error) {
        console.error('Error fetching stock:', error);
        showError('Erro ao carregar estoque');
    } finally {
        isLoading = false;
    }
}

function displayStock(parts) {
    const content = document.querySelector('.content');
    
    content.innerHTML = `
        <h1>Estoque de Peças</h1>
        <div class="section-content">
            <div class="section-header">
                <button class="add-btn" onclick="openPartModal('add')">Adicionar Peça</button>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nome da Peça</th>
                        <th>Descrição</th>
                        <th>Quantidade</th>
                        <th>Categoria</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${parts.map(part => `
                        <tr>
                            <td>${part.name}</td>
                            <td>${part.description}</td>
                            <td>${part.quantity}</td>
                            <td>${part.category}</td>
                            <td><span class="${part.quantity > 10 ? 'status-ok' : part.quantity > 0 ? 'status-low' : 'status-out'}">
                                ${part.quantity > 10 ? 'Em Estoque' : part.quantity > 0 ? 'Estoque Baixo' : 'Sem Estoque'}
                            </span></td>
                            <td>
                                <button onclick="openPartModal('edit', '${part._id}')" class="edit-btn">Editar</button>
                                <button onclick="deletePart('${part._id}')" class="delete-btn">Excluir</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function showParts() {
    if (isLoading) return;
    
    isLoading = true;
    const content = document.querySelector('.content');
    
    try {
        content.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Carregando catálogo...</p>
            </div>
        `;
        
        const parts = await PartsApiService.getParts();
        displayPartsCatalog(parts);
    } catch (error) {
        console.error('Error fetching parts:', error);
        showError('Erro ao carregar catálogo');
    } finally {
        isLoading = false;
    }
}

function displayPartsCatalog(parts) {
    const content = document.querySelector('.content');
    
    content.innerHTML = `
        <h1>Catálogo de Peças</h1>
        <div class="section-content">
            <div class="section-header">
                <button class="add-btn" onclick="openPartModal('add')">Adicionar Peça</button>
            </div>
            <div class="parts-grid">
                ${parts.map(part => `
                    <div class="part-card">
                        <h3>${part.name}</h3>
                        <p><strong>Descrição:</strong> ${part.description}</p>
                        <p><strong>Categoria:</strong> ${part.category}</p>
                        <p><strong>Quantidade:</strong> ${part.quantity} unidades</p>
                        <div class="part-actions">
                            <button class="view-btn" onclick="openPartModal('view', '${part._id}')">Ver Detalhes</button>
                            <button class="edit-btn" onclick="openPartModal('edit', '${part._id}')">Editar</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}



// Parts Management Functions
function openPartModal(action, partId) {
    const modal = document.createElement('div');
    modal.className = 'user-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>${action === 'add' ? 'Adicionar Peça' : action === 'edit' ? 'Editar Peça' : 'Detalhes da Peça'}</h3>
            <form id="part-form">
                <input type="hidden" name="id" value="${partId || ''}">
                <label for="part-name">Nome da Peça:</label>
                <input type="text" id="part-name" name="name" required ${action === 'view' ? 'readonly' : ''}>
                
                <label for="part-description">Descrição:</label>
                <textarea id="part-description" name="description" rows="3" required ${action === 'view' ? 'readonly' : ''}></textarea>
                
                <label for="part-quantity">Quantidade:</label>
                <input type="number" id="part-quantity" name="quantity" min="0" required ${action === 'view' ? 'readonly' : ''}>
                
                <label for="part-category">Categoria:</label>
                <select id="part-category" name="category" ${action === 'view' ? 'disabled' : ''}>
                    <option value="Geral">Geral</option>
                    <option value="Motores">Motores</option>
                    <option value="Sensores">Sensores</option>
                    <option value="Resistores">Resistores</option>
                    <option value="Capacitores">Capacitores</option>
                    <option value="Microcontroladores">Microcontroladores</option>
                    <option value="Conectores">Conectores</option>
                </select>
                
                <div class="modal-buttons">
                    ${action !== 'view' ? `<button type="submit" class="submit-btn">${action === 'add' ? 'Adicionar' : 'Salvar'}</button>` : ''}
                    <button type="button" class="cancel-btn" onclick="closeModal(this.closest('.user-modal'))">Fechar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Fill form if editing or viewing
    if ((action === 'edit' || action === 'view') && partId) {
        PartsApiService.getPart(partId).then(part => {
            document.getElementById('part-name').value = part.name;
            document.getElementById('part-description').value = part.description;
            document.getElementById('part-quantity').value = part.quantity;
            document.getElementById('part-category').value = part.category;
        }).catch(error => {
            console.error('Error loading part:', error);
            showError('Erro ao carregar peça');
        });
    }

    // Handle form submission
    if (action !== 'view') {
        document.getElementById('part-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const partData = Object.fromEntries(formData);

            try {
                const submitBtn = modal.querySelector('.submit-btn');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Salvando...';
                
                if (action === 'add') {
                    await PartsApiService.createPart(partData);
                } else {
                    await PartsApiService.updatePart(partId, partData);
                }
                
                closeModal(modal);
                // Refresh current view
                const activeSection = document.querySelector('.nav-link.active').getAttribute('data-section');
                if (activeSection === 'stock') {
                    showStock();
                } else if (activeSection === 'parts') {
                    showParts();
                }
            } catch (error) {
                console.error('Error saving part:', error);
                showError('Erro ao salvar peça');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = action === 'add' ? 'Adicionar' : 'Salvar';
            }
        });
    }
}

function deletePart(partId) {
    if (confirm('Tem certeza que deseja excluir esta peça?')) {
        try {
            PartsApiService.deletePart(partId)
                .then(() => {
                    // Refresh current view
                    const activeSection = document.querySelector('.nav-link.active').getAttribute('data-section');
                    if (activeSection === 'stock') {
                        showStock();
                    } else if (activeSection === 'parts') {
                        showParts();
                    }
                })
                .catch(error => {
                    console.error('Error deleting part:', error);
                    showError('Erro ao excluir peça');
                });
        } catch (error) {
            console.error('Error deleting part:', error);
            showError('Erro ao excluir peça');
        }
    }
}

function showUsers() {
    fetchUsers();
}

function showSettings() {
    const content = document.querySelector('.content');
    content.innerHTML = `
        <h1>${translations[savedLanguage]['Settings']}</h1>
        <div class="section-content">
            <div class="settings-section">
                <h2>Configurações Gerais</h2>
                <div class="setting-item">
                    <label>Nome da Empresa:</label>
                    <input type="text" value="Gerenciador de invetário Corp" />
                </div>
                <div class="setting-item">
                    <label>Moeda Padrão:</label>
                    <select>
                        <option value="BRL">Real (R$)</option>
                        <option value="USD">Dólar ($)</option>
                        <option value="EUR">Euro (€)</option>
                    </select>
                </div>
                <div class="setting-item">
                    <label>Idioma:</label>
                    <select>
                        <option value="pt">Português</option>
                        <option value="en">English</option>
                    </select>
                </div>
                <button class="save-btn">Salvar Configurações</button>
            </div>
        </div>
    `;
}

// Initialize navigation and show dashboard by default
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    showDashboard();
});

// User Profile Menu
const userProfile = document.querySelector('.user-profile');
userProfile.addEventListener('click', () => {
    alert('Função de perfil ainda não implementada');
});

// Initialize dashboard data
const dashboardData = {
    totalStock: 1500,
    parts: 250,
    pendingOrders: 12,
    totalValue: 125000
};

// Update dashboard cards with mock data
function updateDashboardCards() {
    const cards = document.querySelectorAll('.card .number');
    const values = Object.values(dashboardData);
    cards.forEach((card, index) => {
        const value = values[index];
        if (index === 3) { // Format currency for total value
            card.textContent = `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        } else {
            card.textContent = value.toLocaleString('pt-BR');
        }
    });
}

// Call update function to initialize dashboard
updateDashboardCards();
