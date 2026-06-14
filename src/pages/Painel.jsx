import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Painel() {
  const [demandas, setDemandas] = useState([]);
  
  // Estados para os campos do formulário
  const [item, setItem] = useState('');
  const [colaborador, setColaborador] = useState('');
  const [tempoEstimado, setTempoEstimado] = useState('');

  // Listener em tempo real do banco de dados
  useEffect(() => {
    // Escuta a coleção 'romaneios_ativos' no Firestore
    const unsubscribe = onSnapshot(collection(db, 'romaneios_ativos'), (snapshot) => {
      const listaDemandas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDemandas(listaDemandas);
    });

    // Limpa a escuta quando o componente é desmontado
    return () => unsubscribe();
  }, []);

  const adicionarDemanda = async (e) => {
    e.preventDefault();
    if (!item || !colaborador || !tempoEstimado) return;

    try {
      await addDoc(collection(db, 'romaneios_ativos'), {
        item,
        colaborador,
        tempoEstimado: Number(tempoEstimado),
        status: 'Em Andamento',
        criadoEm: serverTimestamp()
      });
      
      // Limpa o formulário após salvar
      setItem('');
      setColaborador('');
      setTempoEstimado('');
    } catch (error) {
      console.error("Erro ao inserir romaneio: ", error);
      alert("Erro ao conectar com o banco de dados.");
    }
  };

  return (
    <div className="flex flex-col h-full p-6 bg-slate-900">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Gestão de Romaneios</h1>
      </header>

      {/* Formulário */}
      <div className="bg-slate-800 p-4 rounded-t-lg border border-slate-700">
        <form className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end" onSubmit={adicionarDemanda}>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Item / SKU</label>
            <input 
              type="text" 
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" 
              placeholder="Ex: Tubo PVC" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Colaboradores</label>
            <input 
              type="text" 
              value={colaborador}
              onChange={(e) => setColaborador(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" 
              placeholder="Nomes" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tempo Est. (min)</label>
            <input 
              type="number" 
              value={tempoEstimado}
              onChange={(e) => setTempoEstimado(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" 
              placeholder="120" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Ação</label>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors">
              Iniciar Produção
            </button>
          </div>
        </form>
      </div>

      {/* Tabela Simplificada */}
      <div className="flex-1 bg-slate-800 border border-t-0 border-slate-700 rounded-b-lg overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-0">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900 text-slate-400 sticky top-0">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Colaboradores</th>
                <th className="px-4 py-3 text-center">Tempo Estimado</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Controles</th>
              </tr>
            </thead>
            <tbody>
              {demandas.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                    Nenhum romaneio ativo no momento.
                  </td>
                </tr>
              ) : (
                demandas.map((demanda) => (
                  <tr key={demanda.id} className="border-b border-slate-700 hover:bg-slate-750">
                    <td className="px-4 py-3 font-medium text-white">{demanda.item}</td>
                    <td className="px-4 py-3">{demanda.colaborador}</td>
                    <td className="px-4 py-3 text-center text-blue-400 font-bold">{demanda.tempoEstimado} min</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-green-900/50 text-green-400 text-xs font-bold px-2 py-1 rounded">
                        {demanda.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors">
                        Pausar
                      </button>
                      <button className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors">
                        Concluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}