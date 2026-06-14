import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Painel from './pages/Painel';

// Componentes provisórios para as outras páginas
const Visor = () => (
  <div className="flex flex-col h-full p-6 bg-black">
    <h1 className="text-4xl font-bold text-white text-center mb-8">VISOR GERAL DA PRODUÇÃO</h1>
    <div className="grid grid-cols-3 gap-6">
      <div className="h-48 bg-green-900/50 border-2 border-green-500 rounded-xl flex items-center justify-center">
        <p className="text-green-400 text-xl font-bold">ROM-001 (No Prazo)</p>
      </div>
    </div>
  </div>
);

const Relatorios = () => (
  <div className="flex flex-col h-full p-6 bg-slate-900">
    <h1 className="text-2xl font-bold text-blue-400 mb-4">Relatórios e Produtividade</h1>
    <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-4">
      <p className="text-slate-400">Módulo de exportação e ranqueamento.</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="flex h-screen w-full bg-slate-900">
        
        {/* Menu Lateral */}
        <nav className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-4">
          <div className="mb-8">
            <h2 className="text-xl font-black text-white">
              Produção <span className="text-blue-500">EGAPLAST</span>
            </h2>
          </div>
          
          <Link to="/painel" className="p-3 rounded bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors text-slate-200">
            Painel do Líder
          </Link>
          <Link to="/visor" className="p-3 rounded bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors text-slate-200">
            Visor TV (Ao Vivo)
          </Link>
          <Link to="/relatorios" className="p-3 rounded bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors text-slate-200">
            Relatórios
          </Link>
        </nav>

        {/* Área de Conteúdo */}
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/painel" element={<Painel />} />
            <Route path="/visor" element={<Visor />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/" element={<Painel />} />
          </Routes>
        </main>

      </div>
    </Router>
  );
}

export default App;