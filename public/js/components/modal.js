console.log('Modal component loaded');

class Modal {
    constructor(options = {}) {
        this.options = {
            title: 'Modal Title',
            content: '',
            showCloseButton: true,
            showFooter: true,
            buttons: [
                {
                    text: 'Cancelar',
                    class: 'btn btn-outline',
                    onClick: () => this.close()
                },
                {
                    text: 'Salvar',
                    class: 'btn btn-primary',
                    onClick: () => {}
                }
            ],
            onOpen: () => {},
            onClose: () => {},
            ...options
        };

        this.modal = null;
        this.modalContent = null;
        this.isOpen = false;

        this.init();
    }

    init() {
        // Create modal element
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('aria-hidden', 'true');
        this.modal.setAttribute('tabindex', '-1');

        // Create modal content
        this.modalContent = document.createElement('div');
        this.modalContent.className = 'modal-content';

        // Add header
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const title = document.createElement('h3');
        title.textContent = this.options.title;
        title.id = 'modal-title';
        
        header.appendChild(title);
        
        if (this.options.showCloseButton) {
            const closeButton = document.createElement('span');
            closeButton.className = 'close-modal';
            closeButton.innerHTML = '&times;';
            closeButton.setAttribute('aria-label', 'Fechar modal');
            closeButton.addEventListener('click', () => this.close());
            header.appendChild(closeButton);
        }

        // Add body
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        if (typeof this.options.content === 'string') {
            body.innerHTML = this.options.content;
        } else if (this.options.content instanceof HTMLElement) {
            body.appendChild(this.options.content);
        }

        // Add footer if needed
        let footer = null;
        if (this.options.showFooter && this.options.buttons && this.options.buttons.length > 0) {
            footer = document.createElement('div');
            footer.className = 'form-actions';

            this.options.buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = button.class || 'btn';
                btn.textContent = button.text;
                btn.addEventListener('click', (e) => {
                    if (typeof button.onClick === 'function') {
                        button.onClick(e, this);
                    }
                });
                footer.appendChild(btn);
            });
        }

        // Assemble modal
        this.modalContent.appendChild(header);
        this.modalContent.appendChild(body);
        if (footer) {
            this.modalContent.appendChild(footer);
        }

        this.modal.appendChild(this.modalContent);
        document.body.appendChild(this.modal);

        // Add event listeners
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Add keyboard navigation
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        document.body.setAttribute('data-modal-open', 'true');
        
        this.modal.style.display = 'flex';
        // Trigger reflow
        void this.modal.offsetWidth;
        this.modal.classList.add('active');
        
        // Focus first focusable element
        const focusable = this.modalContent.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) {
            focusable.focus();
        } else {
            this.modal.focus();
        }

        if (typeof this.options.onOpen === 'function') {
            this.options.onOpen();
        }
    }

    close() {
        if (!this.isOpen) return;

        this.modal.classList.remove('active');
        
        // Wait for animation to complete
        setTimeout(() => {
            this.modal.style.display = 'none';
            document.body.style.overflow = '';
            document.body.removeAttribute('data-modal-open');
            
            this.isOpen = false;
            
            if (typeof this.options.onClose === 'function') {
                this.options.onClose();
            }
        }, 300); // Match this with your CSS transition time
    }

    handleKeyDown(e) {
        if (!this.isOpen) return;

        // Close on Escape key
        if (e.key === 'Escape' || e.key === 'Esc') {
            e.preventDefault();
            this.close();
        }

        // Trap focus inside modal
        if (e.key === 'Tab') {
            const focusableElements = this.modalContent.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    setContent(content) {
        const body = this.modalContent.querySelector('.modal-body');
        if (body) {
            body.innerHTML = '';
            if (typeof content === 'string') {
                body.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                body.appendChild(content);
            }
        }
    }

    setTitle(title) {
        const titleElement = this.modalContent.querySelector('.modal-header h3');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    destroy() {
        if (this.modal && this.modal.parentNode) {
            document.removeEventListener('keydown', this.handleKeyDown);
            this.modal.removeEventListener('click', this.handleClickOutside);
            this.modal.parentNode.removeChild(this.modal);
            this.modal = null;
            this.isOpen = false;
        }
    }
}

// Export as ES Module
export default Modal;
