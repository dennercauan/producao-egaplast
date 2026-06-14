import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';

import Painel from './pages/Painel';
import Visor from './pages/Visor';
import Relatorios from './pages/Relatorios';
import Login from './pages/Login';
import logoEgaplast from './assets/logo-egaplast.png'; 

function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/painel' && location.pathname === '/');
  
  return (
    <Link 
      to={to} 
      className={`p-3 rounded-md text-sm font-medium transition-all duration-200 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}

function ConteudoApp() {
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 font-sans overflow-hidden">
        
      {/* O menu só aparece se NÃO estivermos na página do Visor */}
      {location.pathname !== '/visor' && (
        <nav className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col shadow-xl z-20">
          <div className="mb-8 mt-4 flex flex-col items-center text-center">
            <img src={logoEgaplast} alt="Logo Egaplast" className="h-12 w-auto mb-3 object-contain" />
            <h2 className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase">Setor de Produção</h2>
            <div className="h-0.5 w-8 bg-blue-500 mx-auto mt-4 rounded"></div>
          </div>
          
          <div className="flex flex-col gap-2 flex-1">
            <NavLink to="/painel">Painel de Controle</NavLink>
            <NavLink to="/visor">Painel TV</NavLink>
            <NavLink to="/relatorios">Relatórios</NavLink>
          </div>

          {/* Botão de Sair no rodapé do menu */}
          <div className="mt-auto border-t border-gray-800 pt-4">
            <button 
              onClick={handleLogout}
              className="w-full p-3 rounded-md text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>🚪</span> Sair do Sistema
            </button>
          </div>
        </nav>
      )}

      {/* Área de Conteúdo principal */}
      <main className="flex-1 h-full overflow-hidden relative">
        <Routes>
          <Route path="/painel" element={<Painel />} />
          <Route path="/visor" element={<Visor />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/" element={<Painel />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Fica escutando se o usuário está logado ou não
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  if (carregando) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se não houver usuário logado, força a tela de Login
  if (!usuario) {
    return <Login />;
  }

  // Se estiver logado, mostra o sistema normal
  return (
    <Router>
      <ConteudoApp />
    </Router>
  );
}

export default App;