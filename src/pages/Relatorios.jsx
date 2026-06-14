import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Relatorios() {
  const hoje = new Date().toISOString().split('T')[0];
  const primeiroDiaMes = `${hoje.substring(0, 8)}01`; 
  
  // Estados de Filtro
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim] = useState(hoje);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState('Todos');
  const [tipoVisao, setTipoVisao] = useState('produtividade');
  
  // Estados de Dados
  const [colaboradores, setColaboradores] = useState([]);
  const [dadosRelatorio, setDadosRelatorio] = useState([]);
  const [listaPausas, setListaPausas] = useState([]);
  const [carregando, setCarregando] = useState(false);

  // 1. Carrega a lista de colaboradores para o Select
  useEffect(() => {
    const qColab = query(collection(db, 'colaboradores'), orderBy('nome', 'asc'));
    const unsub = onSnapshot(qColab, (snapshot) => {
      setColaboradores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // 2. Busca e Filtra os Relatórios
  const buscarRelatorio = async (e) => {
    e?.preventDefault();
    setCarregando(true);
    
    try {
      const startMs = new Date(`${dataInicio}T00:00:00`).getTime();
      const endMs = new Date(`${dataFim}T23:59:59`).getTime();

      const querySnapshot = await getDocs(collection(db, 'romaneios_ativos'));
      let docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      docs = docs.filter(doc => {
        if (doc.status !== 'Concluído' || !doc.finalizadoEm) return false;
        
        const dataFinalizacaoMs = typeof doc.finalizadoEm.toMillis === 'function' 
          ? doc.finalizadoEm.toMillis() 
          : doc.finalizadoEm; 
          
        const dentroDaData = dataFinalizacaoMs >= startMs && dataFinalizacaoMs <= endMs;
        const passaFiltroColab = colaboradorSelecionado === 'Todos' || (doc.equipe && doc.equipe.includes(colaboradorSelecionado));

        return dentroDaData && passaFiltroColab;
      });

      docs.sort((a, b) => {
        const timeA = typeof a.finalizadoEm.toMillis === 'function' ? a.finalizadoEm.toMillis() : 0;
        const timeB = typeof b.finalizadoEm.toMillis === 'function' ? b.finalizadoEm.toMillis() : 0;
        return timeB - timeA;
      });

      setDadosRelatorio(docs);

      // Extrair e montar a lista apenas de pausas
      const pausasExtraidas = [];
      docs.forEach(demanda => {
        if (demanda.historicoPausas && demanda.historicoPausas.length > 0) {
          demanda.historicoPausas.forEach(pausa => {
            pausasExtraidas.push({
              id: `${demanda.id}-${pausa.dataFim}`,
              item: demanda.item,
              equipe: demanda.equipe ? demanda.equipe.join(', ') : '-',
              motivo: pausa.motivo,
              duracaoMs: pausa.duracaoMs,
              data: new Date(pausa.dataFim).toLocaleDateString('pt-BR')
            });
          });
        }
      });
      setListaPausas(pausasExtraidas);

    } catch (error) {
      console.error("Erro ao buscar relatório:", error);
      alert("Erro ao buscar os dados. Verifique a conexão.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarRelatorio();
  }, [colaboradorSelecionado]);

  const formatarTempoMs = (ms) => {
    if (!ms || ms < 0) return "00:00:00";
    const totalSeg = Math.floor(ms / 1000);
    const h = Math.floor(totalSeg / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeg % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeg % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // CÁLCULOS DOS CARDS
  const totalRomaneios = dadosRelatorio.length;
  const totalPecas = dadosRelatorio.reduce((acc, d) => acc + (Number(d.quantidade) || 0), 0);
  const somaProdutividade = dadosRelatorio.reduce((acc, d) => acc + (d.produtividadePorcentagem || 100), 0);
  const mediaProdutividade = totalRomaneios > 0 ? Math.round(somaProdutividade / totalRomaneios) : 0;

  const totalOcorrenciasPausas = listaPausas.length;
  const tempoTotalPausadoMs = listaPausas.reduce((acc, p) => acc + p.duracaoMs, 0);
  
  // --- FUNÇÃO DE EXPORTAÇÃO PARA PDF ATUALIZADA ---
  const exportarPDF = () => {
    if (tipoVisao === 'produtividade' && dadosRelatorio.length === 0) return alert("Não há dados de produtividade para exportar.");
    if (tipoVisao === 'pausas' && listaPausas.length === 0) return alert("Não há ocorrências de pausas neste período.");

    const doc = new jsPDF('landscape'); 
    const dataFormatadaIn = dataInicio.split('-').reverse().join('-');
    const dataFormatadaFim = dataFim.split('-').reverse().join('-');

    // Ajusta o nome para um formato seguro de arquivo (Ex: "Carlos_Oliveira" ou "Todos")
    const nomeFiltroArquivo = colaboradorSelecionado.replace(/\s+/g, '_');

    doc.setFontSize(22);
    doc.setTextColor(31, 41, 55); 
    
    if (tipoVisao === 'produtividade') {
      doc.text("Relatório de Produtividade - EGAPLAST", 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128); 
      doc.text(`Período: ${dataFormatadaIn} a ${dataFormatadaFim}`, 14, 28);
      doc.text(`Filtro: Colaborador - ${colaboradorSelecionado}`, 14, 34);

      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235); 
      doc.text(`Resumo do Período:`, 14, 44);
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81); 
      doc.text(`Romaneios: ${totalRomaneios}`, 14, 50);
      doc.text(`Total Peças: ${totalPecas}`, 60, 50);
      doc.text(`Eficiência Média: ${mediaProdutividade}%`, 110, 50);

      const colunas = ["Data", "Item / SKU", "Qtd", "Equipe", "Meta Est.", "Tempo Real", "Pausas", "Prod."];
      const linhas = dadosRelatorio.map(d => [
        d.finalizadoEm?.toDate ? d.finalizadoEm.toDate().toLocaleDateString('pt-BR') : '-',
        d.item,
        d.quantidade.toString(),
        d.equipe ? d.equipe.join(', ') : '-',
        d.tempoEstimadoStr,
        formatarTempoMs(d.tempoAtivoMs),
        formatarTempoMs(d.tempoPausadoTotalMs),
        `${d.produtividadePorcentagem || 0}%`
      ]);

      autoTable(doc, {
        head: [colunas], body: linhas, startY: 56, theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: { 0: { cellWidth: 22 }, 2: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center', fontStyle: 'bold' } }
      });

      // NOVO NOME DINÂMICO DO ARQUIVO
      doc.save(`Produtividade_${nomeFiltroArquivo}_Egaplast_${dataFormatadaIn.replace(/\//g, '-')}_a_${dataFormatadaFim.replace(/\//g, '-')}.pdf`);
    
    } else {
      doc.text("Relatório de Ocorrências (Pausas) - EGAPLAST", 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128); 
      doc.text(`Período: ${dataFormatadaIn} a ${dataFormatadaFim}`, 14, 28);
      doc.text(`Filtro: Colaborador - ${colaboradorSelecionado}`, 14, 34);

      doc.setFontSize(12);
      doc.setTextColor(217, 119, 6); 
      doc.text(`Resumo de Indisponibilidade:`, 14, 44);
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81); 
      doc.text(`Total de Paradas Registradas: ${totalOcorrenciasPausas}`, 14, 50);
      doc.text(`Tempo Total Perdido: ${formatarTempoMs(tempoTotalPausadoMs)}`, 90, 50);

      const colunasPausas = ["Data", "Item / Romaneio Afetado", "Equipe Envolvida", "Motivo da Parada", "Tempo Perdido"];
      const linhasPausas = listaPausas.map(p => [
        p.data,
        p.item,
        p.equipe,
        p.motivo,
        formatarTempoMs(p.duracaoMs)
      ]);

      autoTable(doc, {
        head: [colunasPausas], body: linhasPausas, startY: 56, theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold' }, 
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 60 }, 3: { cellWidth: 80 }, 4: { halign: 'center', fontStyle: 'bold' } }
      });

      // NOVO NOME DINÂMICO DO ARQUIVO
      doc.save(`Pausas_${nomeFiltroArquivo}_Egaplast_${dataFormatadaIn.replace(/\//g, '-')}_a_${dataFormatadaFim.replace(/\//g, '-')}.pdf`);
    }
  };

  return (
    <div className="flex flex-col h-full p-8 bg-gray-100 overflow-hidden">
      <header className="mb-6 flex justify-between items-end border-b border-gray-300 pb-2 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Central de Relatórios</h1>
          <p className="text-sm text-gray-500 mt-1">Análise de desempenho e perdas operacionais</p>
        </div>
        <button onClick={exportarPDF} className="flex items-center gap-2 font-bold py-2 px-6 rounded shadow transition-all bg-red-600 hover:bg-red-700 text-white">
          <span>📄</span> Gerar PDF ({tipoVisao === 'produtividade' ? 'Prod.' : 'Pausas'})
        </button>
      </header>

      {/* ABAS DE NAVEGAÇÃO INTERNA */}
      <div className="flex space-x-2 mb-4 shrink-0">
        <button onClick={() => setTipoVisao('produtividade')} className={`px-5 py-2.5 rounded-lg font-bold transition-all text-sm ${tipoVisao === 'produtividade' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          Visão de Produtividade
        </button>
        <button onClick={() => setTipoVisao('pausas')} className={`px-5 py-2.5 rounded-lg font-bold transition-all text-sm ${tipoVisao === 'pausas' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          Análise de Pausas (Perdas)
        </button>
      </div>

      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm mb-6 shrink-0">
        <form onSubmit={buscarRelatorio} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Data Inicial</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 outline-none w-40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Data Final</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 outline-none w-40" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Filtrar por Colaborador</label>
            <select value={colaboradorSelecionado} onChange={(e) => setColaboradorSelecionado(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 outline-none">
              <option value="Todos">Todos os Colaboradores (Visão Geral)</option>
              {colaboradores.map(colab => <option key={colab.id} value={colab.nome}>{colab.nome}</option>)}
            </select>
          </div>
          <button type="submit" disabled={carregando} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-8 rounded shadow transition-colors h-[38px] flex items-center">
            {carregando ? 'A Processar...' : 'Atualizar Dados'}
          </button>
        </form>
      </div>

      {/* --- MODO: PRODUTIVIDADE --- */}
      {tipoVisao === 'produtividade' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">📦</div>
              <div><p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Romaneios Concluídos</p><p className="text-3xl font-black text-gray-800">{totalRomaneios}</p></div>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">⚙️</div>
              <div><p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total de Peças</p><p className="text-3xl font-black text-gray-800">{totalPecas}</p></div>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-2xl">📈</div>
              <div><p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Produtividade Média</p><p className={`text-3xl font-black ${mediaProdutividade >= 100 ? 'text-emerald-600' : 'text-red-500'}`}>{mediaProdutividade}%</p></div>
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gray-50 p-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-800">Tabela de Produtividade</h2></div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-100 text-gray-600 sticky top-0">
                  <tr><th className="px-6 py-3 font-bold uppercase text-xs">Data</th><th className="px-6 py-3 font-bold uppercase text-xs">Item / SKU</th><th className="px-6 py-3 font-bold uppercase text-xs text-center">Qtd</th><th className="px-6 py-3 font-bold uppercase text-xs text-center">Estimado</th><th className="px-6 py-3 font-bold uppercase text-xs text-center">Tempo Real</th><th className="px-6 py-3 font-bold uppercase text-xs text-center">Produtividade</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dadosRelatorio.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400">Sem dados neste período.</td></tr>
                  ) : (
                    dadosRelatorio.map((demanda) => (
                      <tr key={demanda.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium">{demanda.finalizadoEm?.toDate ? demanda.finalizadoEm.toDate().toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="px-6 py-3"><p className="font-semibold text-gray-900">{demanda.item}</p><p className="text-xs text-gray-500">{demanda.equipe?.join(', ')}</p></td>
                        <td className="px-6 py-3 text-center font-semibold">{demanda.quantidade}</td>
                        <td className="px-6 py-3 text-center font-bold text-gray-500">{demanda.tempoEstimadoStr}</td>
                        <td className="px-6 py-3 text-center font-mono font-bold text-blue-700">{formatarTempoMs(demanda.tempoAtivoMs)}</td>
                        <td className={`px-6 py-3 text-center font-mono font-black text-lg ${(demanda.produtividadePorcentagem || 0) >= 100 ? 'text-emerald-600' : 'text-red-500'}`}>{demanda.produtividadePorcentagem || 0}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- MODO: ANÁLISE DE PAUSAS --- */}
      {tipoVisao === 'pausas' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 shrink-0">
            <div className="bg-amber-50 p-5 rounded-lg border border-amber-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center text-2xl">⚠️</div>
              <div><p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Total de Paradas</p><p className="text-3xl font-black text-amber-900">{totalOcorrenciasPausas}</p></div>
            </div>
            <div className="bg-red-50 p-5 rounded-lg border border-red-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-red-200 flex items-center justify-center text-2xl">⏱️</div>
              <div><p className="text-xs font-bold text-red-700 uppercase tracking-widest">Tempo Total Perdido</p><p className="text-3xl font-black text-red-900 font-mono">{formatarTempoMs(tempoTotalPausadoMs)}</p></div>
            </div>
          </div>

          <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="bg-amber-100 p-4 border-b border-amber-200"><h2 className="text-lg font-bold text-amber-900">Registro de Ocorrências</h2></div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr><th className="px-6 py-3 font-bold uppercase text-xs">Data</th><th className="px-6 py-3 font-bold uppercase text-xs">Item Afetado</th><th className="px-6 py-3 font-bold uppercase text-xs">Equipe</th><th className="px-6 py-3 font-bold uppercase text-xs">Motivo Declarado</th><th className="px-6 py-3 font-bold uppercase text-xs text-center">Tempo Perdido</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listaPausas.length === 0 ? (
                    <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400">Excelente! Nenhuma pausa registrada neste período.</td></tr>
                  ) : (
                    listaPausas.map((pausa) => (
                      <tr key={pausa.id} className="hover:bg-amber-50/50">
                        <td className="px-6 py-4 font-medium">{pausa.data}</td>
                        <td className="px-6 py-4 font-bold text-gray-800">{pausa.item}</td>
                        <td className="px-6 py-4 text-gray-500">{pausa.equipe}</td>
                        <td className="px-6 py-4 text-amber-700 font-medium">{pausa.motivo}</td>
                        <td className="px-6 py-4 text-center font-mono font-black text-red-600">{formatarTempoMs(pausa.duracaoMs)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}