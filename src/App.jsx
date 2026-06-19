import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { motion, AnimatePresence } from 'framer-motion';

import Painel from './pages/Painel';
import Visor from './pages/Visor';
import Relatorios from './pages/Relatorios';
import Login from './pages/Login';
import logoEgaplast from './assets/logo-egaplast.png'; 

function AnimacaoPagina({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full w-full overflow-y-auto"
    >
      {children}
    </motion.div>
  );
}

function NavLink({ to, children, icone }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/painel' && location.pathname === '/');
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 translate-x-1' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <span className="text-lg">{icone}</span>
      {children}
    </Link>
  );
}

function ConteudoApp() {
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  // Fecha o menu móvel automaticamente ao mudar de página
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    if(window.confirm("Deseja realmente sair do sistema?")) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Erro ao sair:", error);
      }
    }
  };

  const isVisor = location.pathname === '/visor';

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans relative">
        

        
      {/* MENU LATERAL (Sidebar / Drawer) */}
      {!isVisor && (
        <>
          {/* Fundo escuro transparente (Aparece apenas no mobile quando o menu abre) */}
          <AnimatePresence>
            {menuAberto && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMenuAberto(false)}
                className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
              />
            )}
          </AnimatePresence>

          {/* O Menu em si */}
          <nav className={`fixed md:relative top-0 left-0 h-full w-72 bg-[#0F172A] border-r border-slate-800 flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out shrink-0 ${menuAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            
            <div className="p-6 mb-2 flex flex-col items-center border-b border-slate-800 relative">
              <button onClick={() => setMenuAberto(false)} className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="mb-3 flex items-center justify-center">
                <img src={logoEgaplast} alt="Logo Egaplast" className="h-12 w-auto object-contain brightness-0 invert" />
              </div>
              <h2 className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">Setor de Produção</h2>
            </div>
            
            <div className="flex flex-col gap-2 flex-1 px-4 mt-4 overflow-y-auto">
              <NavLink to="/painel" icone="">Painel de Controle</NavLink>
              <NavLink to="/visor" icone="">Painel TV</NavLink>
              <NavLink to="/relatorios" icone="">Relatórios</NavLink>
            </div>

            <div className="p-4 border-t border-slate-800">
              <button onClick={handleLogout} className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 flex items-center justify-center gap-2">
                <span></span> Sair do Sistema
              </button>
            </div>
          </nav>
        </>
      )}

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 h-full overflow-hidden relative bg-slate-50 flex flex-col">
        
        {/* CABEÇALHO MOBILE (Hambúrguer) */}
        {!isVisor && (
          <div className="md:hidden bg-[#0F172A] p-4 flex justify-between items-center shadow-md shrink-0 z-30">
            <div className="flex items-center gap-3">
              <img src={logoEgaplast} alt="Logo" className="h-6 w-auto brightness-0 invert" />
              <span className="text-white font-bold text-xs uppercase tracking-widest">SETOR DE PRODUÇÃO</span>
            </div>
            <button onClick={() => setMenuAberto(true)} className="text-slate-300 hover:text-white p-1">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/painel" element={<AnimacaoPagina><Painel /></AnimacaoPagina>} />
              <Route path="/visor" element={<AnimacaoPagina><Visor /></AnimacaoPagina>} />
              <Route path="/relatorios" element={<AnimacaoPagina><Relatorios /></AnimacaoPagina>} />
              <Route path="/" element={<AnimacaoPagina><Painel /></AnimacaoPagina>} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>

    </div>
  );
}

function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  if (carregando) {
    return (
      <div className="h-screen w-screen bg-[#0F172A] flex flex-col items-center justify-center gap-4 font-sans relative">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
        <img src={logoEgaplast} alt="Logo" className="h-8 w-auto object-contain brightness-0 invert animate-pulse absolute bottom-10" />
      </div>
    );
  }

  if (!usuario) return <Login />;

  return (
    <Router>
      <ConteudoApp />
    </Router>
  );
}

export default App;