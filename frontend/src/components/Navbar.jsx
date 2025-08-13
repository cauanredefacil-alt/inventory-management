import React from 'react';
import { Button } from './ui/button';
import { LayoutGrid, Phone, Users, Sun, Moon, User, ChevronDown } from 'lucide-react';

const Navbar = ({ activeItem = 'estoque', onChangeActive = () => {} }) => {
  const [adminOpen, setAdminOpen] = React.useState(false);
  const adminRef = React.useRef(null);
  // Função para alternar entre tema claro e escuro
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (_) {
      // ignore storage errors
    }
  };

  // Fecha o dropdown ao clicar fora
  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!adminRef.current) return;
      if (adminOpen && !adminRef.current.contains(e.target)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [adminOpen]);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Lado esquerdo - Logo/Título */}
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-semibold">Sistema de Inventário</h1>
        </div>

        {/* Lado direito - Links e ações */}
        <nav className="flex items-center space-x-6">
          {/* Links de navegação */}
          <Button 
            variant="ghost" 
            className={`nav-button flex items-center space-x-2 hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${activeItem === 'estoque' ? 'bg-primary/10' : ''}`}
            onClick={() => onChangeActive('estoque')}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Estoque</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className={`nav-button flex items-center space-x-2 hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${activeItem === 'telefone' ? 'bg-primary/10' : ''}`}
            onClick={() => onChangeActive('telefone')}
          >
            <Phone className="h-4 w-4" />
            <span>Telefone</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className={`relative nav-button flex items-center space-x-2 hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${activeItem === 'usuarios' ? 'bg-primary/10' : ''}`}
            onClick={() => onChangeActive('usuarios')}
          >
            <Users className="h-4 w-4" />
            <span>Usuários</span>
            {/* Badge de aviso (em construção) sobrepondo o rótulo */}
            <span
              className="absolute -top-3 -right-4 bg-amber-500 text-[10px] font-semibold text-black px-1.5 py-0.5 rounded shadow rotate-12 select-none"
              title="Em construção"
              aria-label="Em construção"
            >
              Em construção
            </span>
          </Button>

          {/* Administração - Dropdown */}
          <div className="relative" ref={adminRef}>
            <Button
              variant="ghost"
              className={`nav-button flex items-center space-x-2 hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${activeItem === 'administracao' ? 'bg-primary/10' : ''}`}
              onClick={() => setAdminOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={adminOpen}
            >
              <User className="h-4 w-4" />
              <span>Administração</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
            </Button>
            {adminOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-44 rounded-md border border-border bg-popover text-popover-foreground shadow-md py-1 z-50"
              >
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { onChangeActive('wallpaper'); setAdminOpen(false); }}
                  role="menuitem"
                >
                  Wallpaper's
                </button>
              </div>
            )}
          </div>

          {/* Botão de alternar tema */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="nav-button rounded-full hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onClick={toggleTheme}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Alternar tema</span>
          </Button>

          {/* Botão de perfil */}
          <Button variant="ghost" size="icon" className="nav-button rounded-full hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
            <User className="h-5 w-5" />
            <span className="sr-only">Perfil do usuário</span>
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
