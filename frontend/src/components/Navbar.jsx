import React from 'react';
import { Button } from './ui/button';
import { LayoutGrid, Phone, Users, Sun, Moon, User } from 'lucide-react';

const Navbar = ({ activeItem = 'estoque', onChangeActive = () => {} }) => {
  // Função para alternar entre tema claro e escuro
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (_) {
      // ignore storage errors
    }
  };

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
            className={`nav-button flex items-center space-x-2 hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${activeItem === 'usuarios' ? 'bg-primary/10' : ''}`}
            onClick={() => onChangeActive('usuarios')}
          >
            <Users className="h-4 w-4" />
            <span>Usuários</span>
          </Button>

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
