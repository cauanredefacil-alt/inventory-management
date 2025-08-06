import ChipsApiService from '../services/chipsApi.js';

// Base URL for API requests
const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chipsTableBody = document.getElementById('chipsTableBody');
    const systemsTableBody = document.getElementById('systemsTableBody');
    const totalChipsEl = document.getElementById('totalChips');
    const activeChipsEl = document.getElementById('activeChips');
    const maintenanceChipsEl = document.getElementById('maintenanceChips');
    const totalSystemsEl = document.getElementById('totalSystems');
    
    // Modal Elements
    const chipModal = document.getElementById('chipModal');
    const telSistemaModal = document.getElementById('telSistemaModal');
    const closeModalButtons = document.querySelectorAll('.close-modal, .btn-outline');
    const addChipBtn = document.getElementById('addChipBtn');
    const addSystemBtn = document.getElementById('addSystemBtn');
    const chipForm = document.getElementById('chipForm');
    const telSistemaForm = document.getElementById('telSistemaForm');
    
    // State
    let currentChipId = null;
    let currentTelSistemaId = null;
    let chips = [];
    let telSistemas = [];
    
    // Status colors mapping
    const statusColors = {
        'Ativo': 'badge-ativo',
        'Ativo/Aracaju': 'badge-ativo-aracaju',
        'Aguardando Análise': 'badge-aguardando',
        'Banido': 'badge-banido',
        'Inativo': 'badge-inativo',
        'Maturado': 'badge-maturado',
        'Recarga Pendente': 'badge-recarga',
        'Em Uso': 'badge-ativo',
        'Manutenção': 'badge-banido'
    };
    
    // Load chips data from API
    async function loadChips() {
        try {
            console.log('Loading chips...');
            const response = await fetch(`${API_BASE_URL}/chips`);
            if (!response.ok) {
                throw new Error(`Failed to load chips data: ${response.status}`);
            }
            const result = await response.json();
            console.log('Chips API response:', result);
            
            // Handle different response formats
            let chips = [];
            if (Array.isArray(result)) {
                chips = result;
            } else if (result && Array.isArray(result.data)) {
                chips = result.data;
            } else if (result && result.success && Array.isArray(result.data)) {
                chips = result.data;
            }
            
            console.log(`Rendering ${chips.length} chips`);
            renderChipsTable(chips);
        } catch (error) {
            console.error('Error loading chips:', error);
            showError('Erro ao carregar os chips. Por favor, recarregue a página.');
            renderChipsTable([]);
        }
    }

    // Load telSistemas data from API
    async function loadTelSistemas() {
        try {
            console.log('Loading telSistemas...');
            const response = await fetch(`${API_BASE_URL}/tel-sistemas`);
            if (!response.ok) {
                throw new Error(`Failed to load telSistemas data: ${response.status}`);
            }
            const result = await response.json();
            console.log('TelSistemas API response:', result);
            
            // Handle different response formats
            let telSistemas = [];
            if (Array.isArray(result)) {
                telSistemas = result;
            } else if (result && Array.isArray(result.data)) {
                telSistemas = result.data;
            } else if (result && result.success && Array.isArray(result.data)) {
                telSistemas = result.data;
            }
            
            console.log(`Rendering ${telSistemas.length} telSistemas`);
            renderTelSistemasTable(telSistemas);
        } catch (error) {
            console.error('Error loading telSistemas:', error);
            showError('Erro ao carregar os sistemas telefônicos. Por favor, recarregue a página.');
            renderTelSistemasTable([]);
        }
    }

    // Initialize the page
    function init() {
        loadChips();
        loadTelSistemas();
        setupEventListeners();
        
        // Add event listener for the chip form submission
        if (chipForm) {
            chipForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Manually collect form data since we're not using name attributes
                const chipData = {
                    ip: document.getElementById('chipIp').value.trim() || undefined,
                    numero: document.getElementById('chipNumero').value.trim(),
                    status: document.getElementById('chipStatus').value,
                    operadora: document.getElementById('chipOperadora').value,
                    consultor: document.getElementById('chipConsultor').value.trim() || undefined,
                    observacoes: document.getElementById('chipObservacoes').value.trim()
                };
                
                // Validate required fields
                if (!chipData.numero || !chipData.operadora || !chipData.status) {
                    showError('Por favor, preencha todos os campos obrigatórios.');
                    return;
                }
                
                try {
                    console.log('Sending chip data:', chipData);
                    const response = await fetch(`${API_BASE_URL}/chips`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(chipData)
                    });
                    
                    const responseData = await response.json();
                    console.log('Server response:', responseData);
                    
                    if (response.ok) {
                        loadChips();
                        showSuccess('Chip salvo com sucesso!');
                        closeAllModals();
                    } else {
                        // Handle validation errors
                        if (response.status === 400) {
                            if (responseData.errors) {
                                // Handle express-validator style errors
                                const errorMessages = responseData.errors.map(err => `- ${err.msg || err.message}`).join('\n');
                                throw new Error(`Erro de validação:\n${errorMessages}`);
                            } else if (responseData.message) {
                                // Handle custom error messages
                                throw new Error(responseData.message);
                            } else if (responseData.error) {
                                // Handle mongoose validation errors
                                throw new Error(responseData.error);
                            }
                        }
                        throw new Error(responseData.message || `Erro ao salvar o chip (${response.status})`);
                    }
                } catch (error) {
                    console.error('Error saving chip:', error);
                    showError(error.message || 'Erro ao salvar o chip. Por favor, tente novamente.');
                }
            });
        }
        
        // Add event listener for the telSistema form submission
        if (telSistemaForm) {
            telSistemaForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Manually collect form data
                const telSistemaData = {
                    numero: document.getElementById('telSistemaNumero').value.trim(),
                    // Add other telSistema fields here
                };
                
                // Validate required fields
                if (!telSistemaData.numero) {
                    showError('Por favor, preencha o número do sistema telefônico.');
                    return;
                }
                
                try {
                    const response = await fetch(`${API_BASE_URL}/tel-sistemas`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(telSistemaData)
                    });
                    
                    if (response.ok) {
                        loadTelSistemas();
                        showSuccess('Sistema telefônico salvo com sucesso!');
                        closeAllModals();
                    } else {
                        const data = await response.json();
                        throw new Error(data.message || 'Erro ao salvar o sistema telefônico');
                    }
                } catch (error) {
                    console.error('Error saving telSistema:', error);
                    showError('Erro ao salvar o sistema telefônico. Por favor, tente novamente.');
                }
            });
        }
    }
    
    // Update dashboard statistics
    function updateDashboard() {
        if (!totalChipsEl || !activeChipsEl || !maintenanceChipsEl || !totalSystemsEl) return;
        
        totalChipsEl.textContent = chips.length;
        activeChipsEl.textContent = chips.filter(chip => chip.status === 'Ativo' || chip.status === 'Ativo/Aracaju').length;
        maintenanceChipsEl.textContent = chips.filter(chip => chip.status === 'Recarga Pendente' || chip.status === 'Aguardando Análise').length;
        totalSystemsEl.textContent = telSistemas.length;
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Add buttons - use mousedown instead of click to prevent race conditions
        if (addChipBtn) {
            addChipBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Add a small delay to ensure any previous modal is fully closed
                setTimeout(() => openChipModal(), 50);
            });
        }
        
        if (addSystemBtn) {
            addSystemBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Add a small delay to ensure any previous modal is fully closed
                setTimeout(() => openTelSistemaModal(), 50);
            });
        }
        
        // Close modals - use mousedown for better reliability
        closeModalButtons.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeAllModals();
            });
        });
        
        // Handle modal content clicks - prevent closing when clicking inside
        function handleModalContentClick(e) {
            e.stopPropagation();
        }
        
        // Set up modal content click handlers
        if (chipModal) {
            const chipModalContent = chipModal.querySelector('.modal-content');
            if (chipModalContent) {
                chipModalContent.removeEventListener('click', handleModalContentClick);
                chipModalContent.addEventListener('click', handleModalContentClick);
            }
        }
        
        if (telSistemaModal) {
            const telSistemaModalContent = telSistemaModal.querySelector('.modal-content');
            if (telSistemaModalContent) {
                telSistemaModalContent.removeEventListener('click', handleModalContentClick);
                telSistemaModalContent.addEventListener('click', handleModalContentClick);
            }
        }
        
        // Close modal when clicking on the overlay (outside the modal content)
        function handleOverlayClick(e) {
            if (e.target === chipModal || e.target === telSistemaModal) {
                closeAllModals();
            }
        }
        
        // Add click handlers directly to modals instead of window
        if (chipModal) {
            chipModal.removeEventListener('click', handleOverlayClick);
            chipModal.addEventListener('click', handleOverlayClick);
        }
        
        if (telSistemaModal) {
            telSistemaModal.removeEventListener('click', handleOverlayClick);
            telSistemaModal.addEventListener('click', handleOverlayClick);
        }
        
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = tab.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
    }
    
    // Tab switching function
    function switchTab(tabId) {
        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
        });
        
        // Show corresponding content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });
    }
    
    // Modal functions
    function openChipModal(chip = null) {
        // Don't close all modals here to prevent the immediate close issue
        
        currentChipId = chip ? chip._id : null;
        const modalTitle = document.getElementById('chipModalTitle');
        
        // Set modal content based on whether we're editing or adding
        if (chip) {
            modalTitle.textContent = 'Editar Chip';
            document.getElementById('chipId').value = chip._id;
            document.getElementById('chipIp').value = chip.ip || '';
            document.getElementById('chipNumero').value = chip.numero || '';
            document.getElementById('chipStatus').value = chip.status || 'Aguardando Análise';
            document.getElementById('chipOperadora').value = chip.operadora || '';
            document.getElementById('chipConsultor').value = chip.consultor || '';
            document.getElementById('chipObservacoes').value = chip.observacoes || '';
        } else {
            modalTitle.textContent = 'Adicionar Chip';
            if (chipForm) {
                chipForm.reset();
                document.getElementById('chipStatus').value = 'Aguardando Análise';
            }
        }
        
        // Show the modal
        if (chipModal) {
            // First set display to flex
            chipModal.style.display = 'flex';
            
            // Force reflow/repaint
            void chipModal.offsetWidth;
            
            // Then add active class
            chipModal.classList.add('active');
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '15px';
            
            // Ensure the modal is on top
            chipModal.style.zIndex = '1060';
        }
    }
    
    function openTelSistemaModal(telSistema = null) {
        // Don't close all modals here to prevent the immediate close issue
        
        currentTelSistemaId = telSistema ? telSistema._id : null;
        const modalTitle = document.getElementById('telSistemaModalTitle');
        
        if (telSistema) {
            modalTitle.textContent = 'Editar Sistema Telefônico';
            document.getElementById('telSistemaId').value = telSistema._id;
            document.getElementById('telSistemaNumero').value = telSistema.numero || '';
            document.getElementById('telSistemaTipo').value = telSistema.tipo || 'WhatsApp Business';
            document.getElementById('telSistemaPlataforma').value = telSistema.plataforma || 'Android';
            document.getElementById('telSistemaStatus').value = telSistema.status || 'Ativo';
            
            // Load device info if exists
            if (telSistema.dispositivo) {
                document.getElementById('telSistemaDispositivoTipo').value = telSistema.dispositivo.tipo || '';
                document.getElementById('telSistemaDispositivoModelo').value = telSistema.dispositivo.modelo || '';
                document.getElementById('telSistemaDispositivoImei').value = telSistema.dispositivo.imei || '';
            }
            
            // Load linked chip if exists
            if (telSistema.chipVinculado) {
                // This would be populated after loading chips
                document.getElementById('telSistemaChip').value = telSistema.chipVinculado._id || telSistema.chipVinculado;
            }
        } else {
            modalTitle.textContent = 'Adicionar Sistema Telefônico';
            if (telSistemaForm) {
                telSistemaForm.reset();
                document.getElementById('telSistemaTipo').value = 'WhatsApp Business';
                document.getElementById('telSistemaPlataforma').value = 'Android';
                document.getElementById('telSistemaStatus').value = 'Ativo';
            }
        }
        
        // Load chips for the chip dropdown
        loadChipsForDropdown();
        
        // Show the modal
        if (telSistemaModal) {
            // First set display to flex
            telSistemaModal.style.display = 'flex';
            
            // Force reflow/repaint
            void telSistemaModal.offsetWidth;
            
            // Then add active class
            telSistemaModal.classList.add('active');
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '15px';
            
            // Ensure the modal is on top
            telSistemaModal.style.zIndex = '1060';
        }
    }
    
    function closeAllModals() {
        // Hide modals by removing the 'active' class and setting display to none
        if (chipModal) {
            chipModal.classList.remove('active');
            setTimeout(() => {
                chipModal.style.display = 'none';
            }, 300); // Match this with the CSS transition duration
        }
        
        if (telSistemaModal) {
            telSistemaModal.classList.remove('active');
            setTimeout(() => {
                telSistemaModal.style.display = 'none';
            }, 300); // Match this with the CSS transition duration
        }
        
    }

    async function saveTelSistema(telSistemaData) {
        try {
            let response;

            if (currentTelSistemaId) {
                // Update existing telSistema
                response = await fetch(`${API_BASE_URL}/tel-sistemas/${currentTelSistemaId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(telSistemaData)
                });
            } else {
                // Create new telSistema
                response = await fetch(`${API_BASE_URL}/tel-sistemas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(telSistemaData)
                });
            }

            if (response.ok) {
                loadTelSistemas();
                showSuccess('Sistema telefônico salvo com sucesso!');
                closeAllModals();
            } else {
                const data = await response.json();
                throw new Error(data.message || 'Erro ao salvar o sistema telefônico');
            }
        } catch (error) {
            console.error('Error saving telSistema:', error);
            showError('Erro ao salvar o sistema telefônico. Por favor, tente novamente.');
        }
    }

    async function deleteTelSistema(telSistemaId) {
        try {
            const response = await fetch(`${API_BASE_URL}/tel-sistemas/${telSistemaId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadTelSistemas();
                showSuccess('Sistema telefônico excluído com sucesso!');
            } else {
                const data = await response.json();
                throw new Error(data.message || 'Erro ao excluir o sistema telefônico');
            }
        } catch (error) {
            console.error('Error deleting telSistema:', error);
            showError('Erro ao excluir o sistema telefônico. Por favor, tente novamente.');
        }
    }
    
    // Utility functions for notifications
    function showError(message) {
        // Create or get notification container
        let notification = document.getElementById('error-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'error-notification';
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.backgroundColor = '#f8d7da';
            notification.style.color = '#721c24';
            notification.style.padding = '15px 20px';
            notification.style.borderRadius = '5px';
            notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            notification.style.zIndex = '2000';
            notification.style.maxWidth = '300px';
            notification.style.transition = 'opacity 0.5s ease-in-out';
            document.body.appendChild(notification);
        }
        
        // Set message and show
        notification.textContent = message;
        notification.style.display = 'block';
        notification.style.opacity = '1';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 500);
        }, 5000);
    }
    
    function showSuccess(message) {
        // Similar to showError but with success styling
        let notification = document.getElementById('success-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'success-notification';
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.backgroundColor = '#d4edda';
            notification.style.color = '#155724';
            notification.style.padding = '15px 20px';
            notification.style.borderRadius = '5px';
            notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            notification.style.zIndex = '2000';
            notification.style.maxWidth = '300px';
            notification.style.transition = 'opacity 0.5s ease-in-out';
            document.body.appendChild(notification);
        }
        
        // Set message and show
        notification.textContent = message;
        notification.style.display = 'block';
        notification.style.opacity = '1';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 500);
        }, 5000);
    }
    
    async function deleteChip(chipId) {
        if (!confirm('Tem certeza que deseja excluir este chip?')) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/chips/${chipId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadChips();
                showSuccess('Chip excluído com sucesso!');
            } else {
                const data = await response.json();
                throw new Error(data.message || 'Erro ao excluir o chip');
            }
        } catch (error) {
            console.error('Error deleting chip:', error);
            showError('Erro ao excluir o chip. Por favor, tente novamente.');
        }
    }
    
    function renderChipsTable(chips) {
        if (!chipsTableBody) return;
        
        if (!chips || chips.length === 0) {
            chipsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-8">
                        Nenhum chip cadastrado
                    </td>
                </tr>
            `;
            return;
        }
        
        chipsTableBody.innerHTML = chips.map(chip => `
            <tr>
                <td>${chip.ip || '-'}</td>
                <td class="font-mono">${chip.numero || '-'}</td>
                <td>
                    <span class="badge ${statusColors[chip.status] || ''}">
                        ${chip.status || '-'}
                    </span>
                </td>
                <td>${chip.operadora || '-'}</td>
                <td>${chip.consultor || '-'}</td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn-outline btn-sm edit-chip" data-id="${chip._id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline btn-sm delete-chip" data-id="${chip._id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Add event listeners to the new buttons
        document.querySelectorAll('.edit-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chipId = e.currentTarget.getAttribute('data-id');
                const chip = chips.find(c => c._id === chipId);
                if (chip) openChipModal(chip);
            });
        });
        
        document.querySelectorAll('.delete-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chipId = e.currentTarget.getAttribute('data-id');
                if (chipId) deleteChip(chipId);
            });
        });
    }
    
    function renderTelSistemasTable(telSistemas) {
        if (!systemsTableBody) return;
        
        if (!telSistemas || telSistemas.length === 0) {
            systemsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-8">
                        Nenhum sistema telefônico cadastrado
                    </td>
                </tr>
            `;
            return;
        }
        
        systemsTableBody.innerHTML = telSistemas.map(telSistema => `
            <tr>
                <td>${telSistema.numero || '-'}</td>
                <td>${telSistema.tipo || '-'}</td>
                <td>${telSistema.plataforma || '-'}</td>
                <td>
                    <span class="badge ${statusColors[telSistema.status] || ''}">
                        ${telSistema.status || '-'}
                    </span>
                </td>
                <td>${telSistema.chipVinculado ? (telSistema.chipVinculado.numero || telSistema.chipVinculado) : '-'}</td>
                <td>${telSistema.dispositivo ? `${telSistema.dispositivo.tipo || ''} ${telSistema.dispositivo.modelo || ''}`.trim() || '-' : '-'}</td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn-outline btn-sm edit-telsistema" data-id="${telSistema._id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline btn-sm delete-telsistema" data-id="${telSistema._id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Add event listeners to the new buttons
        document.querySelectorAll('.edit-telsistema').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const telSistemaId = e.currentTarget.getAttribute('data-id');
                try {
                    const response = await fetch(`${API_BASE_URL}/tel-sistemas/${telSistemaId}`);
                    const data = await response.json();
                    if (response.ok) {
                        openTelSistemaModal(data);
                    } else {
                        throw new Error(data.message || 'Erro ao carregar o sistema telefônico');
                    }
                } catch (error) {
                    console.error('Error loading telSistema:', error);
                    showError('Erro ao carregar o sistema telefônico. Por favor, tente novamente.');
                    updateDashboard();
                }
            });
        });
        
        // Add delete event listeners
        document.querySelectorAll('.delete-telsistema').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const telSistemaId = e.currentTarget.getAttribute('data-id');
                if (telSistemaId) {
                    if (confirm('Tem certeza que deseja excluir este sistema telefônico?')) {
                        deleteTelSistema(telSistemaId);
                    }
                }
            });
        });
    }
    init();
});
