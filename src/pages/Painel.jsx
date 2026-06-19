import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function Painel() {
  const [abaAtiva, setAbaAtiva] = useState('romaneios'); 

  // Estados dos Dados
  const [demandas, setDemandas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [agora, setAgora] = useState(Date.now());

  // Estados dos Formulários (Criação)
  const [item, setItem] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [horasEst, setHorasEst] = useState('');
  const [minutosEst, setMinutosEst] = useState('');
  const [segundosEst, setSegundosEst] = useState('');
  const [colabsSelecionados, setColabsSelecionados] = useState([]);
  const [novoColaborador, setNovoColaborador] = useState('');

  // Estados dos Filtros do Histórico
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroColab, setFiltroColab] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [ordenacao, setOrdenacao] = useState('recentes');

  // Estado do Modal de Edição
  const [romaneioEditando, setRomaneioEditando] = useState(null);

  // 1. Listeners do Firebase
  useEffect(() => {
    const qRomaneios = query(collection(db, 'romaneios_ativos'), orderBy('criadoEm', 'desc'));
    const unsubRomaneios = onSnapshot(qRomaneios, (snapshot) => {
      setDemandas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qColaboradores = query(collection(db, 'colaboradores'), orderBy('nome', 'asc'));
    const unsubColaboradores = onSnapshot(qColaboradores, (snapshot) => {
      setColaboradores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => {
      unsubRomaneios();
      unsubColaboradores();
      clearInterval(timer);
    };
  }, []);

  // 2. Gestão de Equipe
  const adicionarColaborador = async (e) => {
    e.preventDefault();
    if (!novoColaborador) return;
    try {
      await addDoc(collection(db, 'colaboradores'), { nome: novoColaborador });
      setNovoColaborador('');
    } catch (error) { console.error("Erro:", error); }
  };

  const editarColaborador = async (id, nomeAntigo) => {
    const novoNome = window.prompt("Corrigir nome do colaborador:", nomeAntigo);
    if (novoNome && novoNome.trim() !== "" && novoNome.trim() !== nomeAntigo) {
      try {
        await updateDoc(doc(db, 'colaboradores', id), { nome: novoNome.trim() });
      } catch (error) { console.error("Erro ao editar colaborador:", error); }
    }
  };

  const removerColaborador = async (id) => {
    if (window.confirm("Remover este colaborador permanentemente?")) {
      await deleteDoc(doc(db, 'colaboradores', id));
    }
  };

  const toggleColaborador = (nome) => {
    setColabsSelecionados(prev => prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]);
  };

  const adicionarDemanda = async (e) => {
    e.preventDefault();
    const h = Number(horasEst) || 0;
    const m = Number(minutosEst) || 0;
    const s = Number(segundosEst) || 0;

    if (!item || !quantidade || colabsSelecionados.length === 0) return alert("Preencha item, quantidade e selecione a equipe.");
    if (h === 0 && m === 0 && s === 0) return alert("Insira um tempo estimado maior que zero.");

    const tempoFormatadoStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const tempoCalculadoMin = (h * 60) + m + (s / 60);

    try {
      await addDoc(collection(db, 'romaneios_ativos'), {
        item,
        quantidade: Number(quantidade),
        equipe: colabsSelecionados,
        tempoEstimadoStr: tempoFormatadoStr,
        tempoEstimado: tempoCalculadoMin,
        status: 'Em Andamento',
        horaInicioStr: Date.now(),
        tempoPausadoTotalMs: 0,
        historicoPausas: [],
        criadoEm: serverTimestamp()
      });
      setItem('');
      setQuantidade('');
      setHorasEst(''); setMinutosEst(''); setSegundosEst('');
      setColabsSelecionados([]);
    } catch (error) { console.error("Erro:", error); }
  };

  const excluirRomaneio = async (id) => {
    if (window.confirm("Atenção: Tem certeza que deseja excluir este romaneio do sistema? Essa ação não pode ser desfeita.")) {
      await deleteDoc(doc(db, 'romaneios_ativos', id));
    }
  };

  const abrirModalEdicao = (demanda) => {
    let h = '', m = '', s = '';
    if (demanda.tempoEstimadoStr) {
      const partes = demanda.tempoEstimadoStr.split(':');
      h = partes[0] || ''; m = partes[1] || ''; s = partes[2] || '';
    }
    setRomaneioEditando({
      ...demanda,
      editHoras: h,
      editMinutos: m,
      editSegundos: s
    });
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    const h = Number(romaneioEditando.editHoras) || 0;
    const m = Number(romaneioEditando.editMinutos) || 0;
    const s = Number(romaneioEditando.editSegundos) || 0;

    if (!romaneioEditando.item || !romaneioEditando.quantidade || romaneioEditando.equipe.length === 0) return alert("Preencha os dados e a equipe.");
    if (h === 0 && m === 0 && s === 0) return alert("O tempo estimado não pode ser zero.");

    const tempoFormatadoStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const tempoCalculadoMin = (h * 60) + m + (s / 60);

    try {
      const dadosAtualizacao = {
        item: romaneioEditando.item,
        quantidade: Number(romaneioEditando.quantidade),
        tempoEstimadoStr: tempoFormatadoStr,
        tempoEstimado: tempoCalculadoMin,
        equipe: romaneioEditando.equipe
      };

      // REGRA NOVA: Recalcula a produtividade se a demanda já estiver Concluída
      if (romaneioEditando.status === 'Concluído') {
        const tempoRealMin = (romaneioEditando.tempoAtivoMs || 0) / 60000;
        let produtividadePorcentagem = 100;
        
        if (tempoRealMin > 0) {
          produtividadePorcentagem = Math.round((tempoCalculadoMin / tempoRealMin) * 100);
        }
        dadosAtualizacao.produtividadePorcentagem = produtividadePorcentagem;
      }

      await updateDoc(doc(db, 'romaneios_ativos', romaneioEditando.id), dadosAtualizacao);
      setRomaneioEditando(null); 
    } catch (error) { console.error("Erro ao editar:", error); }
  };

  const toggleColaboradorEdicao = (nome) => {
    setRomaneioEditando(prev => {
      const novaEquipe = prev.equipe.includes(nome) ? prev.equipe.filter(n => n !== nome) : [...prev.equipe, nome];
      return { ...prev, equipe: novaEquipe };
    });
  };

  const alterarStatusRomaneio = async (demanda, novoStatus) => {
    try {
      const dadosAtualizacao = { status: novoStatus };
      
      if (novoStatus === 'Pausado') {
        const motivo = window.prompt("Qual o motivo da pausa?");
        if (!motivo) return; 
        dadosAtualizacao.motivoPausa = motivo;
        dadosAtualizacao.inicioUltimaPausa = Date.now();
      } 
      else if (novoStatus === 'Em Andamento' && demanda.status === 'Pausado') {
        const tempoDestaPausa = Date.now() - (demanda.inicioUltimaPausa || Date.now());
        dadosAtualizacao.tempoPausadoTotalMs = (demanda.tempoPausadoTotalMs || 0) + tempoDestaPausa;
        
        const novaPausa = {
          motivo: demanda.motivoPausa || 'Não informado',
          duracaoMs: tempoDestaPausa,
          dataFim: Date.now()
        };
        dadosAtualizacao.historicoPausas = [...(demanda.historicoPausas || []), novaPausa];

        dadosAtualizacao.motivoPausa = null;
        dadosAtualizacao.inicioUltimaPausa = null;
      }
      else if (novoStatus === 'Concluído') {
        if (window.confirm("Deseja concluir este romaneio e enviá-lo para o histórico?")) {
          let tempoPausaFinal = demanda.tempoPausadoTotalMs || 0;
          let historicoAtualizado = [...(demanda.historicoPausas || [])];

          if (demanda.status === 'Pausado' && demanda.inicioUltimaPausa) {
            const tempoDestaPausa = Date.now() - demanda.inicioUltimaPausa;
            tempoPausaFinal += tempoDestaPausa;
            historicoAtualizado.push({
              motivo: demanda.motivoPausa || 'Não informado',
              duracaoMs: tempoDestaPausa,
              dataFim: Date.now()
            });
          }
          
          dadosAtualizacao.tempoPausadoTotalMs = tempoPausaFinal;
          dadosAtualizacao.historicoPausas = historicoAtualizado;
          dadosAtualizacao.tempoTotalDecorridoMs = Date.now() - demanda.horaInicioStr;
          dadosAtualizacao.tempoAtivoMs = dadosAtualizacao.tempoTotalDecorridoMs - tempoPausaFinal;
          dadosAtualizacao.finalizadoEm = serverTimestamp();

          const tempoRealMin = dadosAtualizacao.tempoAtivoMs / 60000;
          const tempoEstMin = demanda.tempoEstimado || 0;
          let produtividadePorcentagem = 100;
          
          if (tempoRealMin > 0) {
            produtividadePorcentagem = Math.round((tempoEstMin / tempoRealMin) * 100);
          }
          dadosAtualizacao.produtividadePorcentagem = produtividadePorcentagem;

        } else {
          return;
        }
      }

      await updateDoc(doc(db, 'romaneios_ativos', demanda.id), dadosAtualizacao);
    } catch (error) { console.error("Erro ao atualizar:", error); }
  };

  const retomarRomaneioConcluido = async (demanda) => {
    if (window.confirm("Deseja reabrir este romaneio? Ele retornará para a lista de itens ativos e o cronômetro continuará a contagem.")) {
      try {
        await updateDoc(doc(db, 'romaneios_ativos', demanda.id), {
          status: 'Em Andamento',
          finalizadoEm: null,
          tempoTotalDecorridoMs: null,
          tempoAtivoMs: null,
          produtividadePorcentagem: null 
        });
      } catch (error) { console.error("Erro ao retomar:", error); }
    }
  };

  const formatarTempoMs = (ms) => {
    if (!ms || ms < 0) return "00:00:00";
    const totalSeg = Math.floor(ms / 1000);
    const h = Math.floor(totalSeg / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeg % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeg % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getTempoCronometroMs = (demanda) => {
    if (!demanda.horaInicioStr) return 0;
    let ms = agora - demanda.horaInicioStr - (demanda.tempoPausadoTotalMs || 0);
    if (demanda.status === 'Pausado' && demanda.inicioUltimaPausa) {
      ms -= (agora - demanda.inicioUltimaPausa);
    }
    return ms > 0 ? ms : 0;
  };

  const dataParaStringYMD = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return null;
    const d = timestamp.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatarDataHora = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '-';
    const d = timestamp.toDate();
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const romaneiosAtivos = demandas.filter(d => d.status !== 'Concluído');
  
  let historicoFiltrado = demandas.filter(d => d.status === 'Concluído').filter(d => {
    const matchBusca = d.item.toLowerCase().includes(filtroBusca.toLowerCase());
    const matchColab = filtroColab === '' || (d.equipe && d.equipe.some(c => c.toLowerCase().includes(filtroColab.toLowerCase())));
    const matchData = filtroData === '' || dataParaStringYMD(d.finalizadoEm) === filtroData;
    return matchBusca && matchColab && matchData;
  });

  historicoFiltrado.sort((a, b) => {
    if (ordenacao === 'qtd') return b.quantidade - a.quantidade;
    if (ordenacao === 'duracao') return b.tempoAtivoMs - a.tempoAtivoMs;
    if (ordenacao === 'agilidade') {
      const prodA = a.produtividadePorcentagem || 0;
      const prodB = b.produtividadePorcentagem || 0;
      return prodB - prodA; 
    }
    const timeA = a.finalizadoEm?.toMillis() || 0;
    const timeB = b.finalizadoEm?.toMillis() || 0;
    return timeB - timeA;
  });

  return (
    <div className="flex flex-col h-full p-4 md:p-8 bg-gray-100 relative overflow-y-auto">
      
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-300 pb-2 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Painel de Controle</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão operacional da produção</p>
        </div>
        <div className="flex space-x-2 overflow-x-auto w-full md:w-auto pb-1">
          <button onClick={() => setAbaAtiva('romaneios')} className={`whitespace-nowrap px-4 py-2 rounded-t-lg font-bold transition-colors ${abaAtiva === 'romaneios' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Romaneios</button>
          <button onClick={() => setAbaAtiva('historico')} className={`whitespace-nowrap px-4 py-2 rounded-t-lg font-bold transition-colors ${abaAtiva === 'historico' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Histórico</button>
          <button onClick={() => setAbaAtiva('equipe')} className={`whitespace-nowrap px-4 py-2 rounded-t-lg font-bold transition-colors ${abaAtiva === 'equipe' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Colaboradores</button>
        </div>
      </header>

      {/* ================= ABA: ROMANEIOS ATIVOS ================= */}
      {abaAtiva === 'romaneios' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm z-10 mb-4">
            <form className="flex flex-col gap-4" onSubmit={adicionarDemanda}>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Item / SKU</label>
                  <input type="text" value={item} onChange={(e) => setItem(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded px-4 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Kit 13200" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Qtd. Peças</label>
                  <input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded px-4 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 500" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Tempo Estimado</label>
                  <div className="flex gap-2 items-center">
                    <div className="flex flex-col">
                      <input type="number" min="0" placeholder="HH" value={horasEst} onChange={(e) => setHorasEst(e.target.value)} className="w-16 bg-gray-50 border border-gray-300 rounded px-2 py-2 text-center text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <span className="text-[10px] text-gray-400 text-center mt-1 font-bold">HORAS</span>
                    </div>
                    <span className="font-bold text-gray-400 mb-4">:</span>
                    <div className="flex flex-col">
                      <input type="number" min="0" max="59" placeholder="MM" value={minutosEst} onChange={(e) => setMinutosEst(e.target.value)} className="w-16 bg-gray-50 border border-gray-300 rounded px-2 py-2 text-center text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <span className="text-[10px] text-gray-400 text-center mt-1 font-bold">MIN</span>
                    </div>
                    <span className="font-bold text-gray-400 mb-4">:</span>
                    <div className="flex flex-col">
                      <input type="number" min="0" max="59" placeholder="SS" value={segundosEst} onChange={(e) => setSegundosEst(e.target.value)} className="w-16 bg-gray-50 border border-gray-300 rounded px-2 py-2 text-center text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                      <span className="text-[10px] text-gray-400 text-center mt-1 font-bold">SEG</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-end h-full mt-1 md:mt-0">
                  <button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-md transition-all uppercase text-sm tracking-wider">
                    Iniciar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Selecionar Equipe Envolvida:</label>
                <div className="flex flex-wrap gap-2">
                  {colaboradores.length === 0 ? <span className="text-sm text-red-500 italic">Adicione colaboradores na aba "Colaboradores".</span> : null}
                  {colaboradores.map(colab => (
                    <label key={colab.id} className={`cursor-pointer px-3 py-1 rounded-full text-sm font-medium border transition-colors ${colabsSelecionados.includes(colab.nome) ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
                      <input type="checkbox" className="hidden" checked={colabsSelecionados.includes(colab.nome)} onChange={() => toggleColaborador(colab.nome)} />
                      {colab.nome}
                    </label>
                  ))}
                </div>
              </div>
            </form>
          </div>

          <div className="flex-1 bg-white border border-gray-200 rounded shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-y-auto overflow-x-auto flex-1 max-h-[60vh]">
              <table className="w-full text-left text-sm text-gray-700 min-w-[800px]">
                <thead className="bg-gray-50 text-gray-600 sticky top-0 border-b border-gray-200 shadow-sm z-10">
                  <tr>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs">Item / Equipe</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center">Qtd.</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center">Tempo Est.</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center">Cronômetro</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center">Status</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {romaneiosAtivos.length === 0 ? (
                      <motion.tr initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400">Nenhuma demanda ativa.</td>
                      </motion.tr>
                    ) : (
                      romaneiosAtivos.map((demanda) => {
                        const cronometroMs = getTempoCronometroMs(demanda);
                        const atrasado = (cronometroMs / 60000) > demanda.tempoEstimado;

                        return (
                          <motion.tr 
                            key={demanda.id} 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, scale: 0.95 }} 
                            layout 
                            transition={{ duration: 0.3 }}
                            className="hover:bg-blue-50/30 transition-colors"
                          >
                            <td className="px-6 py-3">
                              <p className="font-semibold text-gray-900">{demanda.item}</p>
                              <p className="text-xs text-gray-500 mt-1">{demanda.equipe?.join(', ')}</p>
                            </td>
                            <td className="px-6 py-3 text-center font-semibold text-gray-700">{demanda.quantidade}</td>
                            <td className="px-6 py-3 text-center font-bold text-gray-600">{demanda.tempoEstimadoStr}</td>
                            <td className="px-6 py-3 text-center font-mono font-bold text-lg">
                              <span className={atrasado && demanda.status === 'Em Andamento' ? 'text-red-500' : 'text-blue-600'}>
                                {formatarTempoMs(cronometroMs)}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-center">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${demanda.status === 'Pausado' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                                {demanda.status === 'Pausado' && demanda.motivoPausa ? `Pausa: ${demanda.motivoPausa}` : demanda.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right space-x-1.5 flex justify-end items-center">
                              <button onClick={() => abrirModalEdicao(demanda)} className="text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded border border-slate-300 text-xs font-bold uppercase transition-colors" title="Editar">✏️</button>
                              <button onClick={() => excluirRomaneio(demanda.id)} className="text-red-600 hover:bg-red-50 px-2 py-1.5 rounded border border-red-200 text-xs font-bold uppercase transition-colors" title="Excluir">🗑️</button>
                              
                              {demanda.status === 'Em Andamento' ? (
                                <button onClick={() => alterarStatusRomaneio(demanda, 'Pausado')} className="text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded border border-amber-200 text-xs font-bold uppercase transition-colors">Pausar</button>
                              ) : (
                                <button onClick={() => alterarStatusRomaneio(demanda, 'Em Andamento')} className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded border border-blue-200 text-xs font-bold uppercase transition-colors">Retomar</button>
                              )}
                              <button onClick={() => alterarStatusRomaneio(demanda, 'Concluído')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase shadow-sm transition-colors">Concluir</button>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= ABA: HISTÓRICO ================= */}
      {abaAtiva === 'historico' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Buscar por Item</label>
              <input type="text" value={filtroBusca} onChange={(e) => setFiltroBusca(e.target.value)} placeholder="Ex: Kit" className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Colaborador</label>
              <input type="text" value={filtroColab} onChange={(e) => setFiltroColab(e.target.value)} placeholder="Nome" className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Data de Conclusão</label>
              <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 text-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Ordenar por</label>
              <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 text-gray-700">
                <option value="recentes">Mais Recentes</option>
                <option value="qtd">Maior Quantidade</option>
                <option value="agilidade">Maior Produtividade</option>
                <option value="duracao">Maior Duração</option>
              </select>
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-200 rounded shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-y-auto overflow-x-auto flex-1 max-h-[60vh]">
              <table className="w-full text-left text-sm text-gray-700 min-w-[900px]">
                <thead className="bg-gray-100 text-gray-600 sticky top-0 border-b border-gray-200 z-10">
                  <tr>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs">Item / Equipe</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center">Qtd.</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center">Tempo Est.</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center text-blue-700">Tempo Ativo</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center text-amber-600">Pausas</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center text-indigo-600">Produtividade</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center text-gray-600">Finalizado Em</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {historicoFiltrado.length === 0 ? (
                      <motion.tr initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-400">Nenhum histórico corresponde aos filtros aplicados.</td>
                      </motion.tr>
                    ) : (
                      historicoFiltrado.map((demanda) => {
                        const percentual = demanda.produtividadePorcentagem !== undefined ? demanda.produtividadePorcentagem : 100;
                        const prodColorClass = percentual >= 100 ? 'text-emerald-600' : 'text-red-500';

                        return (
                          <motion.tr 
                            key={demanda.id} 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, scale: 0.95 }} 
                            layout 
                            transition={{ duration: 0.3 }}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-3">
                              <p className="font-semibold text-gray-900">{demanda.item}</p>
                              <p className="text-xs text-gray-500 mt-1">{demanda.equipe?.join(', ')}</p>
                            </td>
                            <td className="px-6 py-3 text-center font-semibold text-gray-700">{demanda.quantidade}</td>
                            <td className="px-6 py-3 text-center font-bold text-gray-500">{demanda.tempoEstimadoStr}</td>
                            <td className="px-6 py-3 text-center font-mono font-bold text-blue-700">{formatarTempoMs(demanda.tempoAtivoMs)}</td>
                            <td className="px-6 py-3 text-center font-mono font-bold text-amber-600">{formatarTempoMs(demanda.tempoPausadoTotalMs)}</td>
                            
                            <td className={`px-6 py-3 text-center font-mono font-black text-lg ${prodColorClass}`}>
                              {demanda.produtividadePorcentagem !== undefined ? `${demanda.produtividadePorcentagem}%` : 'N/A'}
                            </td>

                            <td className="px-6 py-3 text-center text-sm font-medium text-gray-600">
                              {formatarDataHora(demanda.finalizadoEm)}
                            </td>

                            <td className="px-6 py-3 text-right space-x-1.5 flex justify-end items-center">
                              <button onClick={() => retomarRomaneioConcluido(demanda)} className="text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded border border-blue-200 text-xs font-bold uppercase transition-colors">Retomar</button>
                              <button onClick={() => abrirModalEdicao(demanda)} className="text-slate-600 hover:bg-slate-200 px-2 py-1.5 rounded border border-slate-300 text-xs font-bold uppercase transition-colors" title="Editar">✏️</button>
                              <button onClick={() => excluirRomaneio(demanda.id)} className="text-red-600 hover:bg-red-50 px-2 py-1.5 rounded border border-red-200 text-xs font-bold uppercase transition-colors" title="Excluir">🗑️</button>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= ABA: EQUIPE ================= */}
      {abaAtiva === 'equipe' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="flex-1 bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Adicionar Novo Colaborador</h2>
          <form onSubmit={adicionarColaborador} className="flex flex-col md:flex-row max-w-md mb-8 gap-2 md:gap-0">
            <input type="text" value={novoColaborador} onChange={(e) => setNovoColaborador(e.target.value)} placeholder="Nome do colaborador" className="flex-1 bg-gray-50 border border-gray-300 rounded md:rounded-l px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <button type="submit" className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-4 py-2 rounded md:rounded-r transition-colors">Registrar</button>
          </form>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">Equipe Registrada ({colaboradores.length})</h3>
          <div className="flex flex-wrap gap-3 overflow-y-auto">
            <AnimatePresence>
              {colaboradores.map(colab => (
                <motion.div key={colab.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} layout className="flex items-center bg-gray-100 border border-gray-200 rounded px-3 py-2 shadow-sm">
                  <span className="font-medium text-gray-700 mr-4">{colab.nome}</span>
                  <button onClick={() => editarColaborador(colab.id, colab.nome)} className="text-slate-500 hover:text-blue-600 font-bold mr-3" title="Editar Nome">✏️</button>
                  <button onClick={() => removerColaborador(colab.id)} className="text-red-500 hover:text-red-700 font-bold text-xl leading-none" title="Remover">&times;</button>
                </motion.div>
              ))}
            </AnimatePresence>
            {colaboradores.length === 0 && <p className="text-gray-400 italic">Nenhum colaborador registrado.</p>}
          </div>
        </motion.div>
      )}

      {/* ================= MODAL DE EDIÇÃO DE ROMANEIO ================= */}
      <AnimatePresence>
        {romaneioEditando && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-gray-900 px-6 py-4 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold text-white">Editar Romaneio</h3>
                <button onClick={() => setRomaneioEditando(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
              </div>
              
              <form onSubmit={salvarEdicao} className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Item / SKU</label>
                    <input type="text" value={romaneioEditando.item} onChange={(e) => setRomaneioEditando({...romaneioEditando, item: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Quantidade</label>
                    <input type="number" value={romaneioEditando.quantidade} onChange={(e) => setRomaneioEditando({...romaneioEditando, quantidade: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Tempo Estimado</label>
                    <div className="flex gap-2 items-center">
                      <div className="flex flex-col">
                        <input type="number" min="0" value={romaneioEditando.editHoras} onChange={(e) => setRomaneioEditando({...romaneioEditando, editHoras: e.target.value})} className="w-16 bg-gray-50 border border-gray-300 rounded px-2 py-2 text-center text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                        <span className="text-[10px] text-gray-400 text-center mt-1 font-bold">HORAS</span>
                      </div>
                      <span className="font-bold text-gray-400 mb-4">:</span>
                      <div className="flex flex-col">
                        <input type="number" min="0" max="59" value={romaneioEditando.editMinutos} onChange={(e) => setRomaneioEditando({...romaneioEditando, editMinutos: e.target.value})} className="w-16 bg-gray-50 border border-gray-300 rounded px-2 py-2 text-center text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                        <span className="text-[10px] text-gray-400 text-center mt-1 font-bold">MIN</span>
                      </div>
                      <span className="font-bold text-gray-400 mb-4">:</span>
                      <div className="flex flex-col">
                        <input type="number" min="0" max="59" value={romaneioEditando.editSegundos} onChange={(e) => setRomaneioEditando({...romaneioEditando, editSegundos: e.target.value})} className="w-16 bg-gray-50 border border-gray-300 rounded px-2 py-2 text-center text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                        <span className="text-[10px] text-gray-400 text-center mt-1 font-bold">SEG</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide mt-2">Equipe Envolvida</label>
                    <div className="flex flex-wrap gap-2 border border-gray-200 p-3 rounded bg-gray-50">
                      {colaboradores.map(colab => (
                        <label key={colab.id} className={`cursor-pointer px-3 py-1 rounded-full text-sm font-medium border transition-colors ${romaneioEditando.equipe?.includes(colab.nome) ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-600'}`}>
                          <input type="checkbox" className="hidden" checked={romaneioEditando.equipe?.includes(colab.nome)} onChange={() => toggleColaboradorEdicao(colab.nome)} />
                          {colab.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button type="button" onClick={() => setRomaneioEditando(null)} className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100 font-bold transition-colors">Cancelar</button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow transition-colors">Salvar Alterações</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}