class StockManagement {
    constructor() {
        this.stockModal = null;
        this.currentPart = null;
        this.allParts = [];
        this.currentFilters = {
            search: '',
            type: '',
            status: ''
        };
        this.initializeEventListeners();
        this.loadParts();
    }

    // Initialize event listeners for the stock management UI
    initializeEventListeners() {
        // Add Stock button click
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'addStockBtn') {
                this.openAddStockModal();
            }
            
            // Handle stock action buttons (add/remove/set)
            if (e.target && e.target.classList.contains('stock-action-btn')) {
                const partId = e.target.getAttribute('data-part-id');
                const action = e.target.getAttribute('data-action');
                this.openStockModal(partId, action);
            }
            
            // Reset filters button
            if (e.target && (e.target.id === 'resetFilters' || e.target.closest('#resetFilters'))) {
                this.resetFilters();
            }
        });
        
        // Search input
        const searchInput = document.getElementById('stockSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value.trim();
                    this.applyFilters();
                }, 300);
            });
        }
        
        // Type filter
        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.applyFilters();
            });
        }
        
        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Handle form submission
        document.addEventListener('submit', async (e) => {
            if (e.target && e.target.id === 'stockForm') {
                e.preventDefault();
                await this.handleStockAction();
            }
        });
    }

    // Load parts for the stock management table
    async loadParts() {
        try {
            const response = await fetch('/api/parts');
            if (!response.ok) throw new Error('Failed to load parts');
            
            this.allParts = await response.json();
            this.applyFilters();
        } catch (error) {
            console.error('Error loading parts:', error);
            this.showError('Erro ao carregar as peças. Por favor, tente novamente.');
        }
    }
    
    // Apply current filters to parts and render the table
    applyFilters() {
        if (!this.allParts || !Array.isArray(this.allParts)) {
            console.error('No parts data available');
            return;
        }
        
        const filteredParts = this.allParts.filter(part => {
            // Filter by search term (name or user)
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const matchesSearch = 
                    (part.name && part.name.toLowerCase().includes(searchTerm)) ||
                    (part.user && part.user.toLowerCase().includes(searchTerm));
                if (!matchesSearch) return false;
            }
            
            // Filter by type
            if (this.currentFilters.type && part.type !== this.currentFilters.type) {
                return false;
            }
            
            // Filter by status
            if (this.currentFilters.status && part.status !== this.currentFilters.status) {
                return false;
            }
            
            return true;
        });
        
        this.renderPartsTable(filteredParts);
    }

    // Render the parts table with new fields
    renderPartsTable(parts) {
        const tbody = document.getElementById('stockTableBody');
        if (!tbody) return;

        tbody.innerHTML = parts.map(item => {
            const isMachine = item.type === 'maquina';
            const details = isMachine 
                ? `ID: ${item.machineId || 'N/D'}`
                : `Marca: ${item.brand || 'N/D'}`;
                
            const statusBadge = this.getStatusBadge(item.status || 'disponivel');
            
            return `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.user || '<em class="text-muted">Não atribuído</em>'}</td>
                <td>${this.getTypeBadge(item.type)}</td>
                <td>${details}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center">
                    <div class="btn-group" role="group">
                        ${isMachine ? `
                        <button class="btn btn-sm btn-primary machine-config-btn" 
                                data-item='${JSON.stringify(item).replace(/'/g, '&apos;')}'
                                title="Configurações da máquina">
                            <i class="bi bi-info-circle"></i>
                        </button>
                        ` : ''}
                        <button class="btn btn-sm btn-warning edit-item-btn" 
                                data-item='${JSON.stringify(item).replace(/'/g, '&apos;')}'
                                title="Editar item">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-item-btn" 
                                data-item-id="${item._id}"
                                title="Remover item">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
        
        // Add event listeners for the new buttons
        this.addEventListeners();
    }

    // Get status badge HTML
    getStatusBadge(status) {
        const statusMap = {
            'disponivel': { text: 'Disponível', class: 'bg-success' },
            'em_uso': { text: 'Em Uso', class: 'bg-primary-status' },
            'manutencao': { text: 'Manutenção', class: 'bg-warning' },
            'defeito': { text: 'Com Defeito', class: 'bg-danger' }
        };
        const statusInfo = statusMap[status] || { text: status, class: 'bg-secondary' };
        return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    // Get type badge HTML
    getTypeBadge(type) {
        const typeMap = {
            'maquina': { text: 'Máquina', class: 'bg-primary' },
            'periferico': { text: 'Periférico', class: 'bg-info' },
            'monitor': { text: 'Monitor', class: 'bg-secondary' }
        };
        const typeInfo = typeMap[type] || { text: type, class: 'bg-light text-dark' };
        return `<span class="badge ${typeInfo.class}">${typeInfo.text}</span>`;
    }

    // Add event listeners for dynamic elements
    addEventListeners() {
        // Machine config button
        document.querySelectorAll('.machine-config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = JSON.parse(e.currentTarget.dataset.item.replace(/&apos;/g, "'"));
                this.showMachineConfigModal(item);
            });
        });
        
        // Edit item button
        document.querySelectorAll('.edit-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = JSON.parse(e.currentTarget.dataset.item.replace(/&apos;/g, "'"));
                this.showEditItemModal(item);
            });
        });
        
        // Delete item button
        document.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.currentTarget.dataset.itemId;
                if (confirm('Tem certeza que deseja remover este item?')) {
                    this.deleteItem(itemId);
                }
            });
        });
    }
    
    // Show machine configuration modal
    showMachineConfigModal(item) {
        const modalHTML = `
            <div class="machine-config-modal-overlay" id="machineConfigModal">
                <div class="machine-config-modal-container">
                    <div class="machine-config-modal-content">
                        <div class="machine-config-modal-header">
                            <h5>Configurações da Máquina</h5>
                            <button type="button" class="machine-config-close" id="closeMachineConfigModal">&times;</button>
                        </div>
                        <form id="machineConfigForm">
                            <div class="machine-config-modal-body">
                                <input type="hidden" name="itemId" value="${item._id}">
                                
                                <div class="form-group">
                                    <label class="form-label">Processador</label>
                                    <input type="text" class="form-control" name="processor" 
                                           value="${item.specs?.processor || ''}" required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Memória RAM</label>
                                    <input type="text" class="form-control" name="ram" 
                                           value="${item.specs?.ram || ''}" required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Placa Mãe</label>
                                    <input type="text" class="form-control" name="motherboard" 
                                           value="${item.specs?.motherboard || ''}">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Armazenamento</label>
                                    <input type="text" class="form-control" name="storage" 
                                           value="${item.specs?.storage || ''}">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Placa de Vídeo</label>
                                    <input type="text" class="form-control" name="gpu" 
                                           value="${item.specs?.gpu || ''}">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Sistema Operacional</label>
                                    <input type="text" class="form-control" name="os" 
                                           value="${item.specs?.os || ''}">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Observações</label>
                                    <textarea class="form-control" name="notes" rows="3">${item.specs?.notes || ''}</textarea>
                                </div>
                            </div>
                            <div class="machine-config-modal-footer">
                                <button type="button" class="btn btn-secondary" id="cancelMachineConfig">
                                    Cancelar
                                </button>
                                <button type="button" class="btn btn-primary" id="saveMachineConfig">
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to the DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show the modal with animation after a small delay
        const modal = document.getElementById('machineConfigModal');
        
        // Force a reflow to ensure CSS transitions work
        void modal.offsetHeight;
        
        // Add show class to trigger the animation
        modal.classList.add('show');
        
        // Add event listeners for the modal
        document.getElementById('closeMachineConfigModal').addEventListener('click', () => this.closeMachineConfigModal());
        document.getElementById('cancelMachineConfig').addEventListener('click', () => this.closeMachineConfigModal());
        document.getElementById('saveMachineConfig').addEventListener('click', () => this.saveMachineConfig(item._id));
        
        // Close modal when clicking outside the content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeMachineConfigModal();
            }
        });
        
        // Close modal on ESC key
        document.addEventListener('keydown', this.handleEscKey);
        
        // Add show class to trigger the animation
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        
        // Add event listeners
        document.getElementById('closeMachineConfigModal').addEventListener('click', () => this.closeMachineConfigModal());
        document.getElementById('cancelMachineConfig').addEventListener('click', () => this.closeMachineConfigModal());
        document.getElementById('saveMachineConfig').addEventListener('click', () => this.saveMachineConfig(item._id));
        
        // Close modal when clicking outside the content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeMachineConfigModal();
            }
        });
        
        // Close modal on ESC key
        document.addEventListener('keydown', this.handleEscKey);
    }
    
    // Close machine config modal
    closeMachineConfigModal() {
        const modal = document.getElementById('machineConfigModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto'; // Re-enable scrolling
            
            // Remove event listener
            const handleEsc = this.handleEscKey.bind(this);
            document.removeEventListener('keydown', handleEsc);
            
            // Remove the modal from DOM after animation completes
            setTimeout(() => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }
    
    // Close edit item modal
    closeEditItemModal() {
        const modal = document.getElementById('editItemModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto'; // Re-enable scrolling
            
            // Remove the modal from DOM after animation completes
            setTimeout(() => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }
    
    // Handle ESC key press
    handleEscKey(e) {
        if (e.key === 'Escape') {
            if (document.getElementById('machineConfigModal')) {
                this.closeMachineConfigModal();
            } else if (document.getElementById('editItemModal')) {
                this.closeEditItemModal();
            }
        }
    }
    
    closeMachineConfigModal() {
        const modal = document.getElementById('machineConfigModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto'; // Re-enable scrolling
            
            // Remove event listener
            document.removeEventListener('keydown', this.handleEscKey);
            
            // Remove the modal from DOM after animation completes
            setTimeout(() => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }
    
    // Save machine configuration
    async saveMachineConfig(itemId) {
        const form = document.getElementById('machineConfigForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const specs = {
            processor: formData.get('processor'),
            ram: formData.get('ram'),
            motherboard: formData.get('motherboard'),
            storage: formData.get('storage'),
            gpu: formData.get('gpu'),
            os: formData.get('os'),
            notes: formData.get('notes')
        };
        
        try {
            const response = await fetch(`/api/items/${itemId}/specs`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ specs })
            });
            
            if (!response.ok) {
                throw new Error('Erro ao salvar as configurações');
            }
            
            // Close modal and show success message
            this.closeMachineConfigModal();
            alert('Configurações salvas com sucesso!');
            this.loadParts(); // Refresh the list
            
        } catch (error) {
            console.error('Error saving machine config:', error);
            alert('Erro ao salvar as configurações. Por favor, tente novamente.');
        }
    }
    
    // Show edit item modal
    showEditItemModal(item) {
        const isMachine = item.type === 'maquina';
        const modalHTML = `
            <div class="edit-item-modal-overlay" id="editItemModal">
                <div class="edit-item-modal-container">
                    <div class="edit-item-modal-content">
                        <div class="edit-item-modal-header">
                            <h5>Editar Item</h5>
                            <button type="button" class="edit-item-close" id="closeEditItemModal">&times;</button>
                        </div>
                        <form id="editItemForm">
                            <div class="edit-item-modal-body">
                                <input type="hidden" name="_id" value="${item._id}">
                                
                                <div class="form-group">
                                    <label class="form-label">Nome</label>
                                    <input type="text" class="form-control" name="name" 
                                           value="${item.name || ''}" required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Tipo</label>
                                    <select class="form-control" name="type" required>
                                        <option value="maquina" ${item.type === 'maquina' ? 'selected' : ''}>Máquina</option>
                                        <option value="periferico" ${item.type === 'periferico' ? 'selected' : ''}>Periférico</option>
                                        <option value="monitor" ${item.type === 'monitor' ? 'selected' : ''}>Monitor</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Usuário</label>
                                    <input type="text" class="form-control" name="user" 
                                           value="${item.user || ''}" 
                                           placeholder="Deixe em branco se não estiver em uso">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Estado</label>
                                    <select class="form-control" name="status" required>
                                        <option value="disponivel" ${item.status === 'disponivel' ? 'selected' : ''}>Disponível</option>
                                        <option value="em_uso" ${item.status === 'em_uso' ? 'selected' : ''}>Em Uso</option>
                                        <option value="manutencao" ${item.status === 'manutencao' ? 'selected' : ''}>Manutenção</option>
                                        <option value="defeito" ${item.status === 'defeito' ? 'selected' : ''}>Com Defeito</option>
                                    </select>
                                </div>
                                
                                ${isMachine ? `
                                <div class="form-group">
                                    <label class="form-label">ID da Máquina</label>
                                    <input type="text" class="form-control" name="machineId" 
                                           value="${item.machineId || ''}" required>
                                </div>
                                ` : `
                                <div class="form-group">
                                    <label class="form-label">Marca</label>
                                    <input type="text" class="form-control" name="brand" 
                                           value="${item.brand || ''}" required>
                                </div>
                                `}
                                
                                <div class="form-group">
                                    <label class="form-label">Observações</label>
                                    <textarea class="form-control" name="notes" rows="3">${item.notes || ''}</textarea>
                                </div>
                            </div>
                            <div class="edit-item-modal-footer">
                                <button type="button" class="btn btn-secondary" id="cancelEditItem">
                                    Cancelar
                                </button>
                                <button type="button" class="btn btn-primary" id="saveItem">
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to the DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show the modal with animation after adding to DOM
        const modal = document.getElementById('editItemModal');
        
        // Force a reflow to ensure CSS transitions work
        modal.offsetHeight; // Trigger reflow
        
        // Add show class to trigger the animation
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        
        // Add event listeners
        document.getElementById('closeEditItemModal').addEventListener('click', () => this.closeEditItemModal());
        document.getElementById('cancelEditItem').addEventListener('click', () => this.closeEditItemModal());
        document.getElementById('saveItem').addEventListener('click', () => this.saveItem());
        
        // Close modal when clicking outside the content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEditItemModal();
            }
        });
        
        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEditItemModal();
            }
        });
        
        // Handle type change to show/hide fields
        const typeSelect = document.querySelector('select[name="type"]');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                const isMachineNow = e.target.value === 'maquina';
                const machineIdGroup = document.querySelector('.machine-id-group');
                const brandGroup = document.querySelector('.brand-group');
                
                if (isMachineNow) {
                    if (machineIdGroup) machineIdGroup.style.display = 'block';
                    if (brandGroup) brandGroup.style.display = 'none';
                } else {
                    if (machineIdGroup) machineIdGroup.style.display = 'none';
                    if (brandGroup) brandGroup.style.display = 'block';
                }
            });
        }
    }
    
    // Close edit item modal
    closeEditItemModal() {
        const modal = document.getElementById('editItemModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto'; // Re-enable scrolling
            
            // Remove the modal from DOM after animation completes
            setTimeout(() => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }
    
    // Save item
    async saveItem() {
        const form = document.getElementById('editItemForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const itemData = {
            name: formData.get('name'),
            type: formData.get('type'),
            user: formData.get('user') || null,
            status: formData.get('status'),
            notes: formData.get('notes')
        };
        
        // Add type-specific fields
        if (itemData.type === 'maquina') {
            itemData.machineId = formData.get('machineId');
        } else {
            itemData.brand = formData.get('brand');
        }
        
        const itemId = formData.get('_id');
        const isNew = !itemId || itemId === 'new';
        
        try {
            const url = isNew ? '/api/items' : `/api/items/${itemId}`;
            const method = isNew ? 'POST' : 'PUT';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(itemData)
            });
            
            if (!response.ok) {
                throw new Error('Erro ao salvar o item');
            }
            
            // Close modal and show success message
            this.closeEditItemModal();
            alert('Item salvo com sucesso!');
            this.loadParts(); // Refresh the list
            
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Erro ao salvar o item. Por favor, tente novamente.');
        }
    }
    
    // Delete item
    async deleteItem(itemId) {
        try {
            const response = await fetch(`/api/items/${itemId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Erro ao remover o item');
            }
            
            // Show success message and refresh the list
            alert('Item removido com sucesso!');
            this.loadParts();
            
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Erro ao remover o item. Por favor, tente novamente.');
        }
    }

    // Open the modal to add a new part to stock
    openAddStockModal() {
        const modalHTML = `
            <div class="modal-overlay" id="addStockModal">
                <div class="modal-container">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5>Adicionar Novo Item ao Estoque</h5>
                            <button type="button" class="modal-close" id="closeAddStockModal">&times;</button>
                        </div>
                        <form id="addStockForm">
                            <div class="modal-body">
                                <div class="form-group">
                                    <label class="form-label">Tipo de Item</label>
                                    <select class="form-control" id="itemType" required>
                                        <option value="" disabled selected>Selecione o tipo</option>
                                        <option value="maquina">Máquina</option>
                                        <option value="periferico">Periférico</option>
                                        <option value="monitor">Monitor</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Nome/Identificação</label>
                                    <input type="text" class="form-control" id="itemName" required>
                                </div>

                                <!-- Common Fields -->
                                <div class="form-group">
                                    <label class="form-label">Usuário Atual</label>
                                    <input type="text" class="form-control" id="itemUser" 
                                           placeholder="Deixe em branco se não estiver em uso">
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Estado</label>
                                    <select class="form-control" id="itemStatus" required>
                                        <option value="disponivel" selected>Disponível</option>
                                        <option value="em_uso">Em Uso</option>
                                        <option value="manutencao">Manutenção</option>
                                        <option value="defeito">Com Defeito</option>
                                    </select>
                                </div>

                                <!-- Dynamic Fields Container -->
                                <div id="dynamicFields">
                                    <!-- Fields will be injected here based on item type -->
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Observações</label>
                                    <textarea class="form-control" id="itemNotes" rows="2"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="cancelAddStock">Cancelar</button>
                                <button type="submit" class="btn btn-primary">Salvar Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to the DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show the modal
        const modal = document.getElementById('addStockModal');
        modal.style.display = 'flex';
        
        // Prevent body scroll
        document.body.classList.add('modal-open');
        
        // Force reflow to ensure proper positioning
        modal.offsetHeight;
        
        // Add show class for animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Add event listeners
        document.getElementById('closeAddStockModal').addEventListener('click', () => this.closeAddStockModal());
        document.getElementById('cancelAddStock').addEventListener('click', () => this.closeAddStockModal());
        document.getElementById('addStockForm').addEventListener('submit', (e) => this.handleAddStockSubmit(e));
        
        // Add type change listener for dynamic fields
        document.getElementById('itemType').addEventListener('change', (e) => this.updateDynamicFields(e.target.value));
    }
    
    // Update dynamic fields based on selected item type
    updateDynamicFields(itemType) {
        const dynamicFields = document.getElementById('dynamicFields');
        if (!dynamicFields) return;
        
        let fieldsHTML = '';
        
        switch(itemType) {
            case 'maquina':
                fieldsHTML = `
                    <div class="form-group">
                        <label class="form-label">ID/Número de Série</label>
                        <input type="text" class="form-control" id="machineId" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Processador</label>
                        <input type="text" class="form-control" id="processor">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Memória RAM</label>
                        <input type="text" class="form-control" id="ram">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Armazenamento</label>
                        <input type="text" class="form-control" id="storage">
                    </div>`;
                break;
                
            case 'periferico':
                fieldsHTML = `
                    <div class="form-group">
                        <label class="form-label">Marca</label>
                        <input type="text" class="form-control" id="brand" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Modelo</label>
                        <input type="text" class="form-control" id="model" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Periférico</label>
                        <select class="form-control" id="peripheralType" onchange="toggleCustomPeripheralType()">
                            <option value="teclado">Teclado</option>
                            <option value="mouse">Mouse</option>
                            <option value="headset">Headset</option>
                            <option value="webcam">Webcam</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>
                    <div class="form-group" id="customPeripheralTypeGroup" style="display: none;">
                        <label class="form-label">Especifique o tipo</label>
                        <input type="text" class="form-control" id="customPeripheralType" placeholder="Digite o tipo de periférico">
                    </div>`;
                break;
                
            case 'monitor':
                fieldsHTML = `
                    <div class="form-group">
                        <label class="form-label">Marca</label>
                        <input type="text" class="form-control" id="brand" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Modelo</label>
                        <input type="text" class="form-control" id="model" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tamanho (polegadas)</label>
                        <input type="number" class="form-control" id="screenSize">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Resolução</label>
                        <input type="text" class="form-control" id="resolution" placeholder="Ex: 1920x1080">
                    </div>`;
                break;
                
            default:
                fieldsHTML = '';
        }
        
        dynamicFields.innerHTML = fieldsHTML;
        
        // Add global function for peripheral type toggle
        window.toggleCustomPeripheralType = function() {
            const peripheralType = document.getElementById('peripheralType');
            const customGroup = document.getElementById('customPeripheralTypeGroup');
            const customInput = document.getElementById('customPeripheralType');
            
            if (peripheralType && customGroup && customInput) {
                if (peripheralType.value === 'outro') {
                    customGroup.style.display = 'block';
                    customInput.required = true;
                } else {
                    customGroup.style.display = 'none';
                    customInput.required = false;
                    customInput.value = '';
                }
            }
        };
    }
    
    // Handle add stock form submission
    async handleAddStockSubmit(e) {
        e.preventDefault();
        
        const itemType = document.getElementById('itemType').value;
        if (!itemType) {
            alert('Por favor, selecione um tipo de item');
            return;
        }
        
        // Get user value and ensure it's not an empty string
        const userValue = document.getElementById('itemUser').value.trim();
        
        const itemData = {
            name: document.getElementById('itemName').value,
            type: itemType,
            user: userValue || null, // Use null if empty string
            status: document.getElementById('itemStatus').value,
            notes: document.getElementById('itemNotes').value
        };
        
        // Add type-specific fields
        if (itemType === 'maquina') {
            itemData.machineId = document.getElementById('machineId').value;
            itemData.specs = {
                processor: document.getElementById('processor').value,
                ram: document.getElementById('ram').value,
                storage: document.getElementById('storage').value
            };
        } else if (itemType === 'periferico') {
            itemData.brand = document.getElementById('brand').value;
            itemData.model = document.getElementById('model').value;
            
            const peripheralType = document.getElementById('peripheralType').value;
            const customPeripheralType = document.getElementById('customPeripheralType');
            
            if (peripheralType === 'outro' && customPeripheralType && customPeripheralType.value.trim()) {
                itemData.peripheralType = customPeripheralType.value.trim();
            } else {
                itemData.peripheralType = peripheralType;
            }
        } else if (itemType === 'monitor') {
            itemData.brand = document.getElementById('brand').value;
            itemData.model = document.getElementById('model').value;
            itemData.screenSize = document.getElementById('screenSize').value;
            itemData.resolution = document.getElementById('resolution').value;
        }
        
        try {
            // Transform itemData to match the expected format for the parts API
            const partData = {
                name: itemData.name,
                description: itemData.notes || '',
                quantity: 1, // Default quantity
                category: itemData.type === 'maquina' ? 'Máquina' : 
                         itemData.type === 'periferico' ? 'Periférico' : 'Monitor',
                // Store additional metadata
                metadata: {
                    type: itemData.type,
                    // Only include user in metadata if it has a value
                    ...(itemData.user && { user: itemData.user }),
                    status: itemData.status,
                    // Add type-specific fields
                    ...(itemData.type === 'maquina' && {
                        machineId: itemData.machineId,
                        specs: itemData.specs
                    }),
                    ...(itemData.type === 'periferico' && {
                        brand: itemData.brand,
                        model: itemData.model,
                        peripheralType: itemData.peripheralType
                    }),
                    ...(itemData.type === 'monitor' && {
                        brand: itemData.brand,
                        model: itemData.model,
                        screenSize: itemData.screenSize,
                        resolution: itemData.resolution
                    })
                }
            };

            const response = await fetch('/api/parts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(partData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error response:', errorData);
                throw new Error(errorData.message || 'Erro ao adicionar o item');
            }
            
            // Close modal and show success message
            this.closeAddStockModal();
            alert('Item adicionado com sucesso!');
            this.loadParts(); // Refresh the list
            
        } catch (error) {
            console.error('Error adding item:', error);
            alert(`Erro ao adicionar o item: ${error.message}`);
        }
    }
    
    // Close add stock modal
    closeAddStockModal() {
        const modal = document.getElementById('addStockModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.animation = 'fadeOut 0.2s ease-out forwards';
            
            // Re-enable body scroll
            document.body.classList.remove('modal-open');
            
            setTimeout(() => modal.remove(), 200);
        }
    }

    // Open the stock management modal
    openStockModal(partId, action) {
        this.currentPart = { id: partId };
        
        // Remove existing modal if it exists
        const existingModal = document.getElementById('stockModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        this.createStockModal();
        
        // Set modal title and action
        const modalTitle = document.getElementById('stockModalLabel');
        const actionText = {
            'add': 'Adicionar ao Estoque',
            'remove': 'Remover do Estoque',
            'set': 'Definir Estoque'
        }[action] || 'Gerenciar Estoque';
        
        modalTitle.textContent = actionText;
        document.getElementById('stockAction').value = action;
        
        // Hide part name field for existing parts
        const partNameField = document.getElementById('partName').parentElement;
        partNameField.style.display = 'none';
        
        // Clear form fields
        document.getElementById('quantity').value = '';
        document.getElementById('location').value = '';
        document.getElementById('notes').value = '';
        
        // Show the modal
        this.stockModal.show();
    }

    // Create the stock management modal
    createStockModal() {
        const modalHTML = `
            <div class="stock-modal-overlay" id="stockModalOverlay">
                <div class="stock-modal-container">
                    <div class="stock-modal-content">
                        <div class="stock-modal-header">
                            <h5 id="stockModalLabel">Gerenciar Estoque</h5>
                            <button type="button" class="stock-modal-close" id="closeStockModal">&times;</button>
                        </div>
                        <form id="stockForm">
                            <div class="stock-modal-body">
                                <input type="hidden" id="stockAction" name="action" value="add">
                                
                                <div class="form-group">
                                    <label for="partName" class="form-label">Nome da Peça</label>
                                    <input type="text" class="form-control" id="partName" name="partName" 
                                           ${this.currentPart ? 'readonly' : 'required'}>
                                </div>
                                
                                <div class="form-group">
                                    <label for="quantity" class="form-label">Quantidade</label>
                                    <input type="number" class="form-control" id="quantity" name="quantity" 
                                           min="1" step="1" required>
                                    <small class="form-text text-muted">
                                        Insira a quantidade
                                    </small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="location" class="form-label">Localização (opcional)</label>
                                    <input type="text" class="form-control" id="location" name="location" 
                                           placeholder="Ex: Prateleira A3, Caixa 5">
                                </div>
                                
                                <div class="form-group">
                                    <label for="notes" class="form-label">Notas (opcional)</label>
                                    <textarea class="form-control" id="notes" name="notes" 
                                              rows="3" placeholder="Adicione observações sobre esta movimentação"></textarea>
                                </div>
                            </div>
                            <div class="stock-modal-footer">
                                <button type="button" class="btn btn-secondary" id="cancelStockModal">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add modal to the DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners for closing the modal
        document.getElementById('closeStockModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelStockModal').addEventListener('click', () => this.closeModal());
        document.getElementById('stockModalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'stockModalOverlay') {
                this.closeModal();
            }
        });
        
        // Create a simple modal object
        this.stockModal = {
            show: () => {
                document.getElementById('stockModalOverlay').style.display = 'flex';
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            },
            hide: () => this.closeModal()
        };
    }
    
    // Close modal method
    closeModal() {
        const overlay = document.getElementById('stockModalOverlay');
        if (overlay) {
            overlay.remove();
            document.body.style.overflow = ''; // Restore scrolling
        }
        this.stockModal = null;
    }

    // Handle stock action form submission
    async handleStockAction() {
        const form = document.getElementById('stockForm');
        const formData = new FormData(form);
        const action = formData.get('action');
        const quantity = parseInt(formData.get('quantity'));
        const partName = formData.get('partName');
        const location = formData.get('location');
        const notes = formData.get('notes');

        if (isNaN(quantity) || quantity <= 0) {
            this.showError('Por favor, insira uma quantidade válida.');
            return;
        }

        try {
            // If adding a new part
            if (!this.currentPart?.id && action === 'add') {
                const response = await fetch('/api/parts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: partName,
                        description: notes,
                        quantity: quantity,
                        location: location
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Erro ao adicionar nova peça');
                }
            } 
            // If updating existing part
            else if (this.currentPart?.id) {
                const response = await fetch(`/api/parts/${this.currentPart.id}/stock`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action,
                        quantity,
                        notes: `Local: ${location}\n${notes}`.trim()
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Erro ao atualizar o estoque');
                }
            } else {
                throw new Error('Operação inválida');
            }

            // Close modal and refresh the parts list
            this.stockModal.hide();
            this.loadParts();
            this.showSuccess('Operação realizada com sucesso!');
            
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Ocorreu um erro. Por favor, tente novamente.');
        }
    }

    // Get action text for the current operation
    getActionText() {
        const actionSelect = document.getElementById('stockAction');
        const action = actionSelect ? actionSelect.value : 'add';
        const actions = {
            'add': 'adicionar ao estoque',
            'remove': 'remover do estoque',
            'set': 'definir como quantidade em estoque'
        };
        return actions[action] || 'realizar esta operação';
    }

    // Reset all filters
    resetFilters() {
        // Reset filter values
        this.currentFilters = {
            search: '',
            type: '',
            status: ''
        };
        
        // Reset form elements
        const searchInput = document.getElementById('stockSearch');
        const typeFilter = document.getElementById('typeFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (searchInput) searchInput.value = '';
        if (typeFilter) typeFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        
        // Reapply filters (will show all parts)
        this.applyFilters();
    }
    
    // Show success message
    showSuccess(message) {
        // You can implement a toast or alert here
        alert(message); // Temporary implementation
    }

    // Show error message
    showError(message) {
        // You can implement a toast or alert here
        alert(`Erro: ${message}`); // Temporary implementation
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('stockTableBody')) {
        window.stockManager = new StockManagement();
    }
});
