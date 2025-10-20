"use client";

import Link from "next/link";
import { useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Colors,
} from "chart.js";
import { getDatabase, ref, get, set } from "firebase/database";
import { app } from "@/lib/firebaseConfig";
import { Thermometer, Droplets, Wind, CalendarDays, LoaderCircle } from "lucide-react";

// Registro dos componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Colors);

// --- Tipos de Dados ---
interface DadoHistorico {
  timestamp: string;
  temperatura: number;
  umidade: number;
  velocidade: number;
}

interface DadoDiario {
  dia: string;
  tempMax: number;
  tempMin: number;
  tempMedia: number;
  umidMax: number;
  umidMin: number;
  umidMedia: number;
  velMax: number;
}

// Helper fora do componente para evitar recriação
const formatDateForInput = (date: Date) => date.toISOString().split("T")[0];

// --- Componente da Página ---
export default function HistoricoPage() {
  // --- Estados ---
  const [dataInicio, setDataInicio] = useState(() => {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(new Date().getDate() - 7);
    return formatDateForInput(seteDiasAtras);
  });
  const [dataFim, setDataFim] = useState(() => formatDateForInput(new Date()));
  
  const [dadosDiarios, setDadosDiarios] = useState<DadoDiario[]>([]);
  const [mensagem, setMensagem] = useState("Selecione um período e clique em 'Buscar' para ver os gráficos.");
  const [carregando, setCarregando] = useState(false);

  // --- Lógica de Busca e Processamento de Dados ---
  async function buscarDados(inicio: string, fim: string) {
    if (!inicio || !fim) return;
    
    setMensagem("");
    setDadosDiarios([]);
    setCarregando(true);

    try {
      const db = getDatabase(app);
      const dataInicioObj = new Date(inicio);
      const dataFimObj = new Date(fim + "T23:59:59");
      
      const dias: string[] = [];
      const currentDate = new Date(dataInicioObj);
      while (currentDate <= dataFimObj) {
        dias.push(formatDateForInput(new Date(currentDate)));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // OTIMIZAÇÃO: Busca todas as "pastas" de dias disponíveis de uma só vez.
      const snapLogsRoot = await get(ref(db, 'logs'));
      const diasDisponiveis = snapLogsRoot.exists() ? Object.keys(snapLogsRoot.val()) : [];

      const dadosProcessados: DadoDiario[] = [];

      for (const dia of dias) {
        const refCache = ref(db, `historicoDiario/${dia}`);
        const snapCache = await get(refCache);

        if (snapCache.exists()) {
          const cachedData = snapCache.val();
          delete cachedData.velMin;
          delete cachedData.velMedia;
          dadosProcessados.push(cachedData);
        } else {
          // --- NOVA LÓGICA PARA EVITAR DIA INCOMPLETO ---
          const dataAtual = new Date(dia + "T12:00:00");
          dataAtual.setDate(dataAtual.getDate() + 1);
          const diaSeguinte = formatDateForInput(dataAtual);

          // Se o dia seguinte não existe no banco de dados, consideramos o dia atual incompleto.
          if (!diasDisponiveis.includes(diaSeguinte)) {
            console.log(`Dia ${dia} ignorado pois o dia seguinte (${diaSeguinte}) não foi encontrado nos logs.`);
            continue; // Pula para a próxima iteração
          }

          // --- NOVA LÓGICA DE BUSCA EFICIENTE ---
          // Busca apenas os logs do dia que sabemos estar completo.
          const refLogsDoDia = ref(db, `logs/${dia}`);
          const snapLogs = await get(refLogsDoDia);
          
          if (!snapLogs.exists()) continue;

          const todosDados = snapLogs.val();
          const registrosDia: DadoHistorico[] = Object.values(todosDados)
            .map((value: any) => ({
              timestamp: value.timestamp,
              temperatura: value.Temperatura,
              umidade: value.Umidade,
              velocidade: value.Velocidade,
            }));

          if (registrosDia.length > 0) {
            const agregado = calcularAgregadoDoDia(dia, registrosDia);
            dadosProcessados.push(agregado);
            await set(refCache, agregado); // Salva no cache para futuras requisições
          }
        }
      }

      if (dadosProcessados.length === 0) {
        setMensagem("Nenhum dado encontrado ou todos os dias no período estão incompletos.");
      }
      
      setDadosDiarios(dadosProcessados);

    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setMensagem("Ocorreu um erro ao buscar os dados. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  function calcularAgregadoDoDia(dia: string, registros: DadoHistorico[]): DadoDiario {
    const getValidos = (campo: keyof Omit<DadoHistorico, 'timestamp'>) =>
      registros.map(r => Number(r[campo])).filter(v => !isNaN(v) && v !== -404);

    const temps = getValidos("temperatura");
    const umids = getValidos("umidade");
    const vels = getValidos("velocidade");
    
    const media = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      dia,
      tempMax: temps.length ? Math.max(...temps) : 0,
      tempMin: temps.length ? Math.min(...temps) : 0,
      tempMedia: temps.length ? parseFloat(media(temps).toFixed(1)) : 0,
      umidMax: umids.length ? Math.max(...umids) : 0,
      umidMin: umids.length ? Math.min(...umids) : 0,
      umidMedia: umids.length ? parseFloat(media(umids).toFixed(1)) : 0,
      velMax: vels.length ? Math.max(...vels) : 0,
    };
  }

  // --- Configurações dos Gráficos ---
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#cbd5e1', // slate-300
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.8)', // slate-900 com opacidade
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0', // slate-200
        borderColor: '#334155', // slate-700
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' }, // slate-400
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      y: {
        ticks: { color: '#94a3b8' }, // slate-400
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  const labels = dadosDiarios.map(d => new Date(d.dia + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));

  const temperaturaData = {
    labels,
    datasets: [
      { label: 'Máxima', data: dadosDiarios.map(d => d.tempMax), borderColor: '#f87171', backgroundColor: '#f87171', tension: 0.3 },
      { label: 'Média', data: dadosDiarios.map(d => d.tempMedia), borderColor: '#facc15', backgroundColor: '#facc15', tension: 0.3 },
      { label: 'Mínima', data: dadosDiarios.map(d => d.tempMin), borderColor: '#60a5fa', backgroundColor: '#60a5fa', tension: 0.3 },
    ],
  };

  const umidadeData = {
    labels,
    datasets: [
        { label: 'Máxima', data: dadosDiarios.map(d => d.umidMax), borderColor: '#38bdf8', backgroundColor: '#38bdf8', tension: 0.3 },
        { label: 'Média', data: dadosDiarios.map(d => d.umidMedia), borderColor: '#34d399', backgroundColor: '#34d399', tension: 0.3 },
        { label: 'Mínima', data: dadosDiarios.map(d => d.umidMin), borderColor: '#a78bfa', backgroundColor: '#a78bfa', tension: 0.3 },
    ],
  };

  const velocidadeData = {
    labels,
    datasets: [
        { label: 'Máxima', data: dadosDiarios.map(d => d.velMax), borderColor: '#4ade80', backgroundColor: '#4ade80', tension: 0.3 },
    ],
  };

  // --- JSX ---
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <header className="w-full max-w-7xl flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">Marilândia Meteorologia</h1>
        <nav className="flex gap-2">
          <Link href="/" className="bg-white/10 hover:bg-white/20 transition px-4 py-2 rounded-full text-sm">Agora</Link>
          <Link href="/historico" className="bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded-full text-sm">Histórico</Link>
        </nav>
      </header>
      
      <h2 className="text-2xl sm:text-3xl font-light text-center mb-8">Histórico de Dados Diários</h2>

      <div className="w-full max-w-4xl bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto flex-1 flex flex-col gap-2">
            <label htmlFor="dataInicio" className="text-sm text-slate-300">Data Inicial</label>
            <input type="date" id="dataInicio" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} 
                   className="bg-slate-800 border border-slate-600 rounded-lg p-2 text-white w-full"/>
          </div>
          <div className="w-full sm:w-auto flex-1 flex flex-col gap-2">
            <label htmlFor="dataFim" className="text-sm text-slate-300">Data Final</label>
            <input type="date" id="dataFim" value={dataFim} onChange={(e) => setDataFim(e.target.value)} 
                   className="bg-slate-800 border border-slate-600 rounded-lg p-2 text-white w-full"/>
          </div>
          <button onClick={() => buscarDados(dataInicio, dataFim)} disabled={carregando} 
                  className="w-full sm:w-auto self-end h-10 px-6 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center">
            <CalendarDays size={18} className="mr-2"/>
            Buscar
          </button>
        </div>
      </div>
      
      <main className="w-full max-w-7xl flex-1 flex flex-col items-center justify-center">
        {carregando ? (
          <div className="flex flex-col items-center gap-4 text-slate-300">
             <LoaderCircle size={48} className="animate-spin" />
             <p>Processando dados, isso pode levar um momento...</p>
          </div>
        ) : dadosDiarios.length > 0 ? (
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-4 sm:p-6 h-96">
                <h3 className="text-lg font-semibold text-center text-slate-200 mb-4 flex items-center justify-center gap-2"><Thermometer size={20}/> Temperatura (°C)</h3>
                <Line options={chartOptions} data={temperaturaData} />
            </div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-4 sm:p-6 h-96">
                <h3 className="text-lg font-semibold text-center text-slate-200 mb-4 flex items-center justify-center gap-2"><Droplets size={20}/> Umidade (%)</h3>
                <Line options={chartOptions} data={umidadeData} />
            </div>
            <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-4 sm:p-6 h-96">
                <h3 className="text-lg font-semibold text-center text-slate-200 mb-4 flex items-center justify-center gap-2"><Wind size={20}/> Velocidade Máxima do Vento (m/s)</h3>
                <Line options={chartOptions} data={velocidadeData} />
            </div>
          </div>
        ) : (
           <div className="text-center text-slate-400">
             <p>{mensagem}</p>
           </div>
        )}
      </main>
    </div>
  );
}

