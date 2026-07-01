import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import logoEgaplast from '../assets/logo-egaplast.png';

export default function Visor() {
  const [demandas, setDemandas] = useState([]);
  const [agora, setAgora] = useState(Date.now());
  const [horaAtual, setHoraAtual] = useState('');
  const [dataAtual, setDataAtual] = useState(''); // <-- Adicione esta linha
  
  const [indiceTela, setIndiceTela] = useState(0);

  const [alerta, setAlerta] = useState({ show: false, tipo: '', item: '' });
  
  const isInitialLoad = useRef(true);
  const prevAtivosIds = useRef(new Set());
  const prevConcluidosIds = useRef(new Set());
  
  const navigate = useNavigate();

  useEffect(() => {
    const qRomaneios = query(collection(db, 'romaneios_ativos'), orderBy('criadoEm', 'desc'));
    
    const unsub = onSnapshot(qRomaneios, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDemandas(docs);

      const atuaisAtivos = docs.filter(d => d.status === 'Em Andamento' || d.status === 'Pausado');
      const atuaisConcluidos = docs.filter(d => d.status === 'Concluído' && isHoje(d.finalizadoEm));

      if (!isInitialLoad.current) {
        const novosAtivos = atuaisAtivos.filter(d => !prevAtivosIds.current.has(d.id));
        if (novosAtivos.length > 0) {
          setAlerta({ show: true, tipo: 'CRIADO', item: novosAtivos[0].item });
          setTimeout(() => setAlerta({ show: false, tipo: '', item: '' }), 4000);
        } else {
          const novosConcluidos = atuaisConcluidos.filter(d => !prevConcluidosIds.current.has(d.id));
          if (novosConcluidos.length > 0) {
            setAlerta({ show: true, tipo: 'FINALIZADO', item: novosConcluidos[0].item });
            setTimeout(() => setAlerta({ show: false, tipo: '', item: '' }), 4000);
          }
        }
      } else {
        isInitialLoad.current = false;
      }

      prevAtivosIds.current = new Set(atuaisAtivos.map(d => d.id));
      prevConcluidosIds.current = new Set(atuaisConcluidos.map(d => d.id));
    });

    const timer = setInterval(() => {
      const now = new Date();
      setAgora(now.getTime());
      setHoraAtual(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      // Nova formatação de data por extenso
      const dia = String(now.getDate()).padStart(2, '0');
      const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const mes = meses[now.getMonth()];
      const ano = now.getFullYear();
      setDataAtual(`${dia} de ${mes} de ${ano}`);
    }, 1000);

    const alternadorTelas = setInterval(() => {
      setIndiceTela(prev => prev + 1);
    }, 10000); // Gira a tela a cada 10 segundos

    return () => {
      unsub();
      clearInterval(timer);
      clearInterval(alternadorTelas);
    };
  }, []);

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

  const isHoje = (timestamp) => {
    if (!timestamp) return false;
    const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hoje = new Date();
    return data.getDate() === hoje.getDate() && data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
  };

  const ativos = demandas.filter(d => d.status === 'Em Andamento' || d.status === 'Pausado');
  const concluidosHoje = demandas.filter(d => d.status === 'Concluído' && isHoje(d.finalizadoEm));
  const totalPecasHoje = concluidosHoje.reduce((acc, d) => acc + (d.quantidade || 0), 0);

  const calcularRanking = () => {
    const pontuacoes = {};

    concluidosHoje.forEach(d => {
      if (!d.equipe || d.equipe.length === 0) return;

      const tempoEstMin = d.tempoEstimado || 0;
      const tempoRealMin = (d.tempoAtivoMs || (tempoEstMin * 60000)) / 60000;
      
      let eficiencia = 1;
      if (tempoRealMin > 0) eficiencia = tempoEstMin / tempoRealMin;
      if (eficiencia > 3) eficiencia = 3; 

      const pontosTotais = tempoEstMin * eficiencia;

      let somaTempoTrabalhadoMs = 0;
      const temposIndividuais = [];

      d.equipe.forEach(colab => {
        let nome = typeof colab === 'string' ? colab : colab.nome;
        let tempoTrabalhadoMs = d.tempoAtivoMs || 0; 

        if (typeof colab === 'object' && colab.entradaMs) {
          const fimMs = d.finalizadoEm ? (d.finalizadoEm.toDate ? d.finalizadoEm.toDate().getTime() : new Date(d.finalizadoEm).getTime()) : Date.now();
          let decorrido = fimMs - colab.entradaMs;
          
          if (decorrido > d.tempoTotalDecorridoMs) decorrido = d.tempoTotalDecorridoMs;
          if (decorrido < 0) decorrido = 0;

          let msIndividualPausado = colab.tempoPausadoMs || 0;
          if (colab.status === 'Pausado' && colab.inicioPausaMs) {
            const fimPausa = d.finalizadoEm ? fimMs : Date.now();
            msIndividualPausado += (fimPausa - colab.inicioPausaMs);
          }

          const taxaAtiva = (d.tempoTotalDecorridoMs > 0) ? (d.tempoAtivoMs / d.tempoTotalDecorridoMs) : 1;
          tempoTrabalhadoMs = (decorrido * taxaAtiva) - msIndividualPausado;
          if (tempoTrabalhadoMs < 0) tempoTrabalhadoMs = 0;
        }

        somaTempoTrabalhadoMs += tempoTrabalhadoMs;
        temposIndividuais.push({ nome, tempoTrabalhadoMs });
      });

      temposIndividuais.forEach(ind => {
        if (!pontuacoes[ind.nome]) pontuacoes[ind.nome] = { nome: ind.nome, pontos: 0, entregas: 0 };
        
        let pontosGanhos = 0;
        if (somaTempoTrabalhadoMs > 0) {
          const fatia = ind.tempoTrabalhadoMs / somaTempoTrabalhadoMs;
          pontosGanhos = pontosTotais * fatia;
        } else {
          pontosGanhos = pontosTotais / d.equipe.length;
        }

        pontuacoes[ind.nome].pontos += pontosGanhos;
        pontuacoes[ind.nome].entregas += 1;
      });
    });

    return Object.values(pontuacoes).sort((a, b) => b.pontos - a.pontos);
  };

  const ranking = calcularRanking();
  
  // ---- LÓGICA DE PAGINAÇÃO AUTOMÁTICA DA TV ----
  const itensPorPagina = 5;
  const totalPaginasRanking = Math.ceil(ranking.length / itensPorPagina) || 1;
  const totalTelas = totalPaginasRanking + 1; // +1 reserva a última tela para os 'Concluídos'
  
  const telaAtualSegura = indiceTela % totalTelas;
  const isTelaConcluidos = telaAtualSegura === totalPaginasRanking;
  const paginaRankingExibida = isTelaConcluidos ? 0 : telaAtualSegura;
  
  const rankingPaginado = ranking.slice(paginaRankingExibida * itensPorPagina, (paginaRankingExibida + 1) * itensPorPagina);
  // ----------------------------------------------

  const ultimosConcluidos = concluidosHoje.slice(0, 4);

  let gridConfigClass = "grid-cols-2 content-start"; 
  let sizeClass = { title: "text-2xl", text: "text-base", clock: "text-5xl", badge: "px-2 py-1 text-xs", padding: "p-5", cardHeight: "h-[220px]" };

  if (ativos.length <= 4) {
    gridConfigClass = "grid-cols-2 content-start";
    sizeClass = { title: "text-2xl", text: "text-base", clock: "text-5xl", badge: "px-2 py-1 text-xs", padding: "p-5", cardHeight: "h-[220px]" };
  } else if (ativos.length > 4 && ativos.length <= 6) {
    gridConfigClass = "grid-cols-2 grid-rows-3";
    sizeClass = { title: "text-xl", text: "text-sm", clock: "text-4xl", badge: "px-2 py-0.5 text-[10px]", padding: "p-4", cardHeight: "h-full" };
  } else if (ativos.length > 6 && ativos.length <= 9) {
    gridConfigClass = "grid-cols-3 grid-rows-3";
    sizeClass = { title: "text-base", text: "text-xs", clock: "text-3xl", badge: "px-1.5 py-0.5 text-[9px]", padding: "p-3", cardHeight: "h-full" };
  } else if (ativos.length > 9) {
    gridConfigClass = "grid-cols-3 grid-rows-4";
    sizeClass = { title: "text-sm", text: "text-[10px]", clock: "text-2xl", badge: "px-1 py-0.5 text-[8px]", padding: "p-2", cardHeight: "h-full" };
  }

  return (
    <div className="h-full w-full bg-slate-100 text-slate-800 flex flex-col font-sans overflow-hidden relative">
      
      {alerta.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm animate-fade-in-overlay">
          <div className="flex flex-col items-center animate-pop-in text-center p-8">
            <div className={`text-8xl mb-6 ${alerta.tipo === 'FINALIZADO' ? 'text-emerald-400' : 'text-blue-400'}`}>
              {alerta.tipo === 'FINALIZADO' ? '🏆' : '📦'}
            </div>
            <h1 className={`text-6xl font-black uppercase tracking-widest mb-4 ${alerta.tipo === 'FINALIZADO' ? 'text-emerald-400' : 'text-blue-400'}`}>
              {alerta.tipo === 'FINALIZADO' ? 'Demanda Finalizada!' : 'Nova Demanda!'}
            </h1>
            <p className="text-4xl font-bold text-white uppercase max-w-4xl truncate border-t border-slate-700 pt-6">
              {alerta.item}
            </p>
          </div>
        </div>
      )}

      {/* HEADER CLARO */}
      <header className="bg-white px-8 py-4 flex justify-between items-center shadow-sm border-b border-slate-200 shrink-0 z-10">
        <div className="flex items-center gap-6">
          <img 
            src={logoEgaplast} 
            alt="Egaplast" 
            className="h-12 object-contain cursor-pointer hover:opacity-80 hover:scale-105 transition-all" 
            onClick={() => navigate('/painel')}
            title="Voltar ao Painel de Controle"
          />
          <div className="h-10 w-px bg-slate-300 mx-2"></div>
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-slate-900">Painel de Atividade</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="bg-slate-50 border border-slate-200 px-6 py-2 rounded-lg text-center shadow-inner">
            <span className="block text-xs text-blue-600 font-bold uppercase tracking-widest">Concluídos Hoje</span>
            <span className="text-3xl font-black text-slate-800">{concluidosHoje.length}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-6 py-2 rounded-lg text-center shadow-inner">
            <span className="block text-xs text-emerald-600 font-bold uppercase tracking-widest">Peças Hoje</span>
            <span className="text-3xl font-black text-slate-800">{totalPecasHoje}</span>
          </div>
          <div className="text-right ml-4 flex flex-col items-end">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
              {dataAtual}
            </span>
            <p className="text-5xl font-black tracking-tighter text-blue-600 font-mono leading-none">
              {horaAtual}
            </p>
          </div>
        </div>
      </header>

      {/* CORPO PRINCIPAL */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden min-h-0">
        
        <div className="flex-[3] flex flex-col bg-white rounded-xl border border-slate-200 p-6 overflow-hidden shadow-md h-full">
          <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
            <h2 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-blue-500 animate-pulse"></span>
              Demandas em Andamento
            </h2>
            <span className="text-slate-500 font-bold text-lg uppercase tracking-widest bg-slate-100 px-4 py-1 rounded-full">
              {ativos.length} Em Andamento
            </span>
          </div>

          <div className="flex-1 min-h-0 w-full">
            {ativos.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400">
                <span className="text-6xl mb-4">⏸️</span>
                <p className="text-2xl font-black uppercase tracking-widest">Aguardando Demandas</p>
              </div>
            ) : (
              <div className={`grid ${gridConfigClass} gap-4 h-full w-full`}>
                {ativos.map(demanda => {
                  const ms = getTempoCronometroMs(demanda);
                  const atrasado = (ms / 60000) > demanda.tempoEstimado;
                  const pausado = demanda.status === 'Pausado';

                  let cardBg = "bg-white";
                  let borderColor = "border-l-8 border-l-blue-500 border-slate-200";
                  let timeColor = "text-blue-600";
                  let statusBadge = "bg-blue-100 text-blue-800 border-blue-200";

                  if (pausado) {
                    cardBg = "bg-amber-50/60";
                    borderColor = "border-l-8 border-l-amber-500 border-amber-200";
                    timeColor = "text-amber-600";
                    statusBadge = "bg-amber-200 text-amber-900 border-amber-300";
                  } else if (atrasado) {
                    cardBg = "bg-red-50/60";
                    borderColor = "border-l-8 border-l-red-500 border-red-200";
                    timeColor = "text-red-600";
                    statusBadge = "bg-red-200 text-red-900 border-red-300";
                  }

                  return (
                    <div key={demanda.id} className={`${cardBg} ${borderColor} rounded-lg border ${sizeClass.padding} ${sizeClass.cardHeight} flex flex-col justify-between shadow-sm overflow-hidden transition-colors duration-500`}>
                      <div className="min-h-0 flex-1 flex flex-col justify-start">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h3 className={`${sizeClass.title} font-black text-slate-900 uppercase leading-none truncate w-full`}>
                            {demanda.item}
                          </h3>
                          <div className={`shrink-0 rounded font-black uppercase tracking-wider border ${sizeClass.badge} ${statusBadge}`}>
                            {pausado ? `PAUSADO` : atrasado ? 'ATRASADO' : 'NO PRAZO'}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className={`${sizeClass.text} font-bold text-slate-700`}>
                            <span className="text-slate-400 font-semibold mr-1">QTD:</span> {demanda.quantidade}
                          </p>
                        </div>
                        <p className={`${sizeClass.text} font-bold text-slate-500 truncate mt-1 opacity-90`}>
                          👥 {demanda.equipe?.map(c => typeof c === 'string' ? c : c.nome).join(' • ')}
                        </p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-between items-end shrink-0">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            META: {demanda.tempoEstimadoStr}
                          </p>
                          {pausado && (
                            <p className="text-xs font-bold text-amber-600 uppercase truncate max-w-[180px]">
                              {demanda.motivoPausa}
                            </p>
                          )}
                        </div>
                        <div className={`${sizeClass.clock} font-black font-mono tracking-tighter leading-none ${timeColor}`}>
                          {formatarTempoMs(ms)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-[1] flex flex-col bg-white rounded-xl border border-slate-200 p-6 overflow-hidden shadow-md h-full relative">
          <div key={telaAtualSegura} className="flex-1 flex flex-col h-full overflow-hidden animate-slide-fade">
            
            {!isTelaConcluidos && (
              <>
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4 shrink-0">
                  <span className="text-2xl">🏆</span>
                  <h2 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2">
                    Ranking 
                    {totalPaginasRanking > 1 && (
                      <span className="text-slate-400 text-sm font-bold tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                         {paginaRankingExibida + 1}/{totalPaginasRanking}
                      </span>
                    )}
                  </h2>
                </div>

                <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                  {rankingPaginado.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                      <span className="text-4xl mb-4">📊</span>
                      <p className="text-sm font-bold uppercase tracking-wider">Aguardando...</p>
                    </div>
                  ) : (
                    rankingPaginado.map((colab, idx) => {
                      const indexReal = (paginaRankingExibida * itensPorPagina) + idx;
                      const isTop1 = indexReal === 0;
                      const bgClass = isTop1 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200';
                      const textColor = isTop1 ? 'text-slate-900' : 'text-slate-700';
                      const positionColor = indexReal === 0 ? 'text-amber-500' : indexReal === 1 ? 'text-slate-400' : indexReal === 2 ? 'text-orange-400' : 'text-slate-300';

                      return (
                        <div key={colab.nome} className={`flex items-center p-3 rounded-lg border ${bgClass} shadow-sm`}>
                          <div className={`text-3xl font-black w-10 text-center mr-3 italic ${positionColor}`}>
                            {indexReal + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-black uppercase truncate text-slate-800">{colab.nome}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{colab.entregas} Entregas</p>
                          </div>
                          <div className="text-right ml-2 shrink-0">
                            <p className={`text-2xl font-black tracking-tighter ${textColor}`}>
                              {Math.round(colab.pontos)}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-[-2px]">PTS</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {isTelaConcluidos && (
              <>
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4 shrink-0">
                  <span className="text-2xl">✅</span>
                  <h2 className="text-xl font-black text-slate-800 uppercase">Últimos Concluídos</h2>
                </div>

                <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                  {ultimosConcluidos.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                      <span className="text-4xl mb-4">📦</span>
                      <p className="text-sm font-bold uppercase tracking-wider">Nenhum romaneio finalizado hoje.</p>
                    </div>
                  ) : (
                    ultimosConcluidos.map((demanda) => {
                      const tempoEstMin = demanda.tempoEstimado || 0;
                      const tempoRealMin = (demanda.tempoAtivoMs || 0) / 60000;
                      
                      let produtividadePorcentagem = 100;
                      if (tempoRealMin > 0) {
                        produtividadePorcentagem = Math.round((tempoEstMin / tempoRealMin) * 100);
                      }

                      const prodColorClass = produtividadePorcentagem >= 100 ? 'text-emerald-600' : 'text-red-500';

                      return (
                        <div key={demanda.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between shadow-sm">
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-slate-800 uppercase truncate mb-1">{demanda.item}</h3>
                            <p className="text-[11px] font-bold text-slate-500 truncate mb-1">👥 {demanda.equipe?.map(c => typeof c === 'string' ? c : c.nome).join(' • ')}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
                            <div>
                              <span className="text-slate-400 block font-medium">ESTIMADO:</span>
                              <span className="font-bold font-mono text-slate-700">{demanda.tempoEstimadoStr}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">DECORRIDO:</span>
                              <span className="font-bold font-mono text-slate-700">{formatarTempoMs(demanda.tempoAtivoMs)}</span>
                            </div>
                          </div>
                          
                          <div className="mt-2 flex justify-between items-center bg-white border border-slate-100 rounded px-2 py-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Produtividade:</span>
                            <span className={`text-base font-black font-mono ${prodColorClass}`}>{produtividadePorcentagem}%</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideFade {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-fade {
          animation: slideFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeInOverlay {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-fade-in-overlay {
          animation: fadeInOverlay 4s ease-in-out forwards;
        }

        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8); }
          10% { opacity: 1; transform: scale(1.05); }
          20% { opacity: 1; transform: scale(1); }
        }
        .animate-pop-in {
          animation: popIn 4s ease-in-out forwards;
        }
      `}} />
    </div>
  );
}