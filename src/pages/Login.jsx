import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth'; // Apenas login
import { auth } from '../services/firebase';
import logoEgaplast from '../assets/logo-egaplast.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
      console.error(error.code);
      setErro('E-mail ou senha inválidos. Acesso negado.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-slate-900 p-8 flex flex-col items-center justify-center border-b-4 border-blue-600">
          <div className="bg-white p-3 rounded-lg mb-4 shadow-md">
            <img src={logoEgaplast} alt="Logo Egaplast" className="h-10 object-contain" />
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-widest text-center">
            Produção Egaplast
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">Insira o Login e Senha para acessar.</p>
        </div>

        {/* Formulário */}
        <div className="p-8">
          {erro && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-6 text-sm font-bold">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Senha</label>
              <input 
                type="password" 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={carregando}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-3 rounded-lg shadow-md transition-all disabled:bg-blue-400"
            >
              {carregando ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}