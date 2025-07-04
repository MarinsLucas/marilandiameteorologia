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
} from "chart.js";
import { getDatabase, ref, get, set } from "firebase/database";
import { app } from "@/lib/firebaseConfig";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
  velMin: number;
  velMedia: number;
}

export default function HistoricoPage() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dadosHistorico, setDadosHistorico] = useState<DadoHistorico[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);


  function calcularAgregadoDoDia(dia: string, registros: DadoHistorico[]): DadoDiario {
  const getValidos = (campo: keyof DadoHistorico) =>
    registros
      .map((r) => Number(r[campo]))
      .filter((v) => !isNaN(v) && v !== -404);

  const temp = getValidos("temperatura");
  const umid = getValidos("umidade");
  const vel = getValidos("velocidade");  // mudou

  return {
    dia,
    tempMax: temp.length ? Math.max(...temp) : -404,
    tempMin: temp.length ? Math.min(...temp) : -404,
    tempMedia: temp.length ? temp.reduce((a, b) => a + b, 0) / temp.length : -404,
    umidMax: umid.length ? Math.max(...umid) : -404,
    umidMin: umid.length ? Math.min(...umid) : -404,
    umidMedia: umid.length ? umid.reduce((a, b) => a + b, 0) / umid.length : -404,
    velMax: vel.length ? Math.max(...vel) : -404,        // mudou
    velMin: vel.length ? Math.min(...vel) : -404,        // mudou
    velMedia: vel.length ? vel.reduce((a, b) => a + b, 0) / vel.length : -404,  // mudou
  };
}

  async function buscarDados() {
    if (!dataInicio || !dataFim) return;
    setMensagem("");
    setDadosHistorico([]);

    setCarregando(true); // Início do carregamento

    try {
      const db = getDatabase(app);
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1); // Um dia antes de hoje
    ontem.setHours(23, 59, 59, 999); // Fim do dia    
    const dataInicioObj = new Date(dataInicio);
    const dataFimInput = new Date(dataFim + "T23:59:59");
    const dataFimObj = dataFimInput > ontem ? ontem : dataFimInput; // Limita a hoje


      const dias: string[] = [];
      let d = new Date(dataInicioObj.getTime()); // cria uma cópia segura
      while (d <= dataFimObj) {
        dias.push(d.toISOString().split("T")[0]);
        d.setDate(d.getDate() + 1);
      }

      const dadosDiarios: DadoDiario[] = [];

      for (const dia of dias) {
        const refHistorico = ref(db, `historicoDiario/${dia}`);
        const snapHistorico = await get(refHistorico);

        if (snapHistorico.exists()) {
          dadosDiarios.push(snapHistorico.val());
        } else {
          const snapLogs = await get(ref(db, "logs"));
          if (!snapLogs.exists()) continue;

          const todosDados = snapLogs.val();
          const registrosDia: DadoHistorico[] = [];

          for (const key in todosDados) {
            const registro = todosDados[key];

            const timestampMs = Number(key);
            if (isNaN(timestampMs)) continue;

            const dataRegistro = new Date(timestampMs);
            const diaRegistro = dataRegistro.toISOString().split("T")[0];

            if (diaRegistro === dia) {
              registrosDia.push({
                timestamp: new Date(timestampMs).toISOString(),
                temperatura: registro.Temperatura,
                umidade: registro.Umidade,
                velocidade: registro.Velocidade,
              });
            }
          }

          if (registrosDia.length > 0) {
            const agregado = calcularAgregadoDoDia(dia, registrosDia);
            dadosDiarios.push(agregado);

            // Salva no histórico otimizado
            await set(refHistorico, agregado);
          }
        }
      }

      if (dadosDiarios.length === 0) {
        setMensagem("Nenhum dado encontrado no período selecionado.");
      }

      setDadosHistorico(
        dadosDiarios.flatMap((d) => [
          {
            timestamp: d.dia + "T12:00:00",  // renomeado data -> timestamp
            temperatura: d.tempMax,
            umidade: d.umidMax,
            velocidade: d.velMax,          // trocado de pressao para velocidade
          },
          {
            timestamp: d.dia + "T12:00:00",
            temperatura: d.tempMin,
            umidade: d.umidMin,
            velocidade: d.velMin,
          },
        ])
      );
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setMensagem("Erro ao buscar dados.");
    }

    setCarregando(false); // Início do carregamento

  }



  function agruparPorDia(dados: DadoHistorico[]): DadoDiario[] {
    const grupos: Record<string, DadoHistorico[]> = {};

    dados.forEach((dado) => {
      const dt = new Date(dado.timestamp);  // renomeado
      const diaFormatado = dt.toISOString().split("T")[0];
      if (!grupos[diaFormatado]) grupos[diaFormatado] = [];
      grupos[diaFormatado].push(dado);
    });

    return Object.entries(grupos).map(([dia, registros]) => {
      const getValidos = (campo: keyof DadoHistorico) =>
        registros
          .map((r) => Number(r[campo]))
          .filter((v) => !isNaN(v) && v !== -404);

      const temp = getValidos("temperatura");
      const umid = getValidos("umidade");
      const vel = getValidos("velocidade");  // mudado

      return {
        dia,
        tempMax: temp.length ? Math.max(...temp) : -404,
        tempMin: temp.length ? Math.min(...temp) : -404,
        tempMedia: temp.length ? temp.reduce((a, b) => a + b, 0) / temp.length : -404,
        umidMax: umid.length ? Math.max(...umid) : -404,
        umidMin: umid.length ? Math.min(...umid) : -404,
        umidMedia: umid.length ? umid.reduce((a, b) => a + b, 0) / umid.length : -404,
        velMax: vel.length ? Math.max(...vel) : -404,
        velMin: vel.length ? Math.min(...vel) : -404,
        velMedia: vel.length ? vel.reduce((a, b) => a + b, 0) / vel.length : -404,
      };
    });
  }

  const dadosDiarios = agruparPorDia(dadosHistorico);

  function gerarDataset(tipo: "temp" | "umid" | "vel", valor: "max" | "min" | "media") {
    const nome =
      tipo === "temp" ? "Temperatura" : tipo === "umid" ? "Umidade" : "Velocidade do Vento";
    const unidade = tipo === "temp" ? "°C" : tipo === "umid" ? "%" : "m/s";

    const chave = `${tipo}${
      valor === "max" ? "Max" : valor === "min" ? "Min" : "Media"
    }` as keyof DadoDiario;

    const labelSuffix = valor === "max" ? "Máxima" : valor === "min" ? "Mínima" : "Média";

    const cores: Record<string, [string, string]> = {
      tempMax: ["red", "rgba(255,0,0,0.1)"],
      tempMin: ["orange", "rgba(255,165,0,0.1)"],
      tempMedia: ["darkred", "rgba(139,0,0,0.1)"],

      umidMax: ["blue", "rgba(0,0,255,0.1)"],
      umidMin: ["lightblue", "rgba(173,216,230,0.1)"],
      umidMedia: ["navy", "rgba(0,0,128,0.1)"],

      velMax: ["green", "rgba(0,128,0,0.1)"],
      velMin: ["lightgreen", "rgba(144,238,144,0.1)"],
      velMedia: ["darkgreen", "rgba(0,100,0,0.1)"],
    };

    const [borderColor, backgroundColor] = cores[chave] || ["black", "rgba(0,0,0,0.1)"];

    return {
      label: `${nome} ${labelSuffix} (${unidade})`,
      data: dadosDiarios.map((d) => d[chave] as number),
      borderColor,
      backgroundColor,
    };
  }



  return (
    <div className="min-h-screen bg-yellow-40f0 text-black p-6 flex flex-col items-center">
      <header className="w-full max-w-4xl flex justify-between items-center bg-purple-900 p-4 rounded-lg shadow-md mb-6 text-white">
        <h1 className="text-2xl font-bold">Estação Meteorológica</h1>
        <nav className="flex gap-4">
          <Link href="/" className="bg-white text-purple-900 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition">
            Agora
          </Link>
          <Link href="/historico" className="bg-white text-purple-900 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition">
            Histórico
          </Link>
        </nav>
      </header>

      <h1 className="text-4xl font-bold text-center mb-6">Histórico de Leituras</h1>

      <div className="bg-white p-6 rounded-lg shadow-lg text-black w-full max-w-lg flex flex-col items-center">
        <h2 className="text-2xl font-semibold mb-4">Selecione o Período</h2>
        <div className="flex justify-between w-full gap-4">
          <div className="flex flex-col w-1/2">
            <label htmlFor="dataInicio" className="text-lg font-semibold">Data Inicial:</label>
            <input
              type="date"
              id="dataInicio"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg shadow-sm"
            />
          </div>
          <div className="flex flex-col w-1/2">
            <label htmlFor="dataFim" className="text-lg font-semibold">Data Final:</label>
            <input
              type="date"
              id="dataFim"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg shadow-sm"
            />
          </div>
        </div>

       <button
          onClick={buscarDados}
          disabled={carregando}
          className={`mt-4 px-4 py-2 rounded-lg shadow transition ${
            carregando ? "bg-gray-400 cursor-not-allowed" : "bg-purple-900 hover:bg-purple-700 text-white"
          }`}
        >
          {carregando ? "Carregando..." : "Buscar Dados"}
        </button>
        {mensagem && (
          <div className="mt-4 text-red-600 font-medium text-center">{mensagem}</div>
        )}
      </div>

      {dadosDiarios.length > 0 && (
        <div className="w-full max-w-6xl mt-8 space-y-8">
          {/* Temperatura */}
          <div className="bg-white p-6 rounded-lg shadow w-full aspect-w-16 aspect-h-9">
            <h2 className="text-lg font-semibold text-center mb-2">Temperatura Máxima e Mínima</h2>
            <Line
              data={{
                labels: dadosDiarios.map((d) => d.dia),
                datasets: [
                  gerarDataset("temp", "max"),
                  gerarDataset("temp", "min"),
                  gerarDataset("temp", "media"),
                ],
              }}
            />
          </div>

          {/* Umidade */}
          <div className="bg-white p-6 rounded-lg shadow w-full aspect-w-16 aspect-h-9">
            <h2 className="text-lg font-semibold text-center mb-2">Umidade Máxima e Mínima</h2>
            <Line
              data={{
                labels: dadosDiarios.map((d) => d.dia),
                datasets: [
                  gerarDataset("umid", "max"),
                  gerarDataset("umid", "min"),
                  gerarDataset("umid", "media"),
                ],
              }}
            />
          </div>

          {/* Velocidade do Vento */}
          <div className="bg-white p-6 rounded-lg shadow w-full aspect-w-16 aspect-h-9">
            <h2 className="text-lg font-semibold text-center mb-2">Velocidade do Vento Máxima e Mínima</h2>
            <Line
              data={{
                labels: dadosDiarios.map((d) => d.dia),
                datasets: [
                  gerarDataset("vel", "max"),
                  gerarDataset("vel", "min"),
                  gerarDataset("vel", "media"),
                ],
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
