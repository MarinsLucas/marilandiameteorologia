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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface DadoHistorico {
  data: string;
  temperatura: number;
  umidade: number;
  pressao: number;
}

interface DadoDiario {
  dia: string;
  tempMax: number;
  tempMin: number;
  tempMedia: number;
  umidMax: number;
  umidMin: number;
  umidMedia: number;
  pressMax: number;
  pressMin: number;
  pressMedia: number;
}

export default function HistoricoPage() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dadosHistorico, setDadosHistorico] = useState<DadoHistorico[]>([]);
  const [mensagem, setMensagem] = useState("");

  async function buscarDados() {
    if (!dataInicio || !dataFim) return;

    setMensagem("");

    const response = await fetch(
      `https://script.google.com/macros/s/AKfycbwD9Iedii4r-M5QGcpHFAIvARaARuDrONIja0UhmLYvTI1IGBd0SlplFm5TgQbQ62wN/exec?leitura=intervalo&inicio=${dataInicio}&fim=${dataFim}`
    );
    const dados = await response.json();

    if (dados.length === 0) {
      setMensagem("Nenhum dado encontrado para o intervalo selecionado.");
    } else {
      setMensagem("");
    }

    setDadosHistorico(dados);
  }

  function agruparPorDia(dados: DadoHistorico[]): DadoDiario[] {
    const grupos: Record<string, DadoHistorico[]> = {};

    dados.forEach((dado) => {
      const dt = new Date(dado.data);
      const diaFormatado = dt.toISOString().split("T")[0];
      if (!grupos[diaFormatado]) grupos[diaFormatado] = [];
      grupos[diaFormatado].push(dado);
    });

    return Object.entries(grupos).map(([dia, registros]) => {
      const getValidos = (campo: keyof DadoHistorico) =>
        registros
          .map(r => Number(r[campo]))
          .filter(v => !isNaN(v) && v !== -404);

      const temp = getValidos("temperatura");
      const umid = getValidos("umidade");
      const press = getValidos("pressao");

      return {
        dia,
        tempMax: temp.length ? Math.max(...temp) : -404,
        tempMin: temp.length ? Math.min(...temp) : -404,
        tempMedia: temp.length ? temp.reduce((a, b) => a + b, 0) / temp.length : -404,
        umidMax: umid.length ? Math.max(...umid) : -404,
        umidMin: umid.length ? Math.min(...umid) : -404,
        umidMedia: umid.length ? umid.reduce((a, b) => a + b, 0) / umid.length : -404,
        pressMax: press.length ? Math.max(...press) : -404,
        pressMin: press.length ? Math.min(...press) : -404,
        pressMedia: press.length ? press.reduce((a, b) => a + b, 0) / press.length : -404,
      };
    });
  }


  const dadosDiarios = agruparPorDia(dadosHistorico);

  function gerarDataset(
    tipo: "temp" | "umid" | "press",
    maxMin: "max" | "min"
  ) {
    const nome =
      tipo === "temp" ? "Temperatura" : tipo === "umid" ? "Umidade" : "Pressão";
    const unidade = tipo === "temp" ? "°C" : tipo === "umid" ? "%" : "hPa";
    const chave = `${tipo}${maxMin === "max" ? "Max" : "Min"}` as keyof DadoDiario;

    const cores: Record<string, [string, string]> = {
      tempMax: ["red", "rgba(255,0,0,0.1)"],
      tempMin: ["orange", "rgba(255,165,0,0.1)"],
      umidMax: ["blue", "rgba(0,0,255,0.1)"],
      umidMin: ["lightblue", "rgba(173,216,230,0.1)"],
      pressMax: ["green", "rgba(0,128,0,0.1)"],
      pressMin: ["lightgreen", "rgba(144,238,144,0.1)"],
    };

    const [borderColor, backgroundColor] = cores[chave] || ["black", "rgba(0,0,0,0.1)"];

    return {
      label: `${nome} ${maxMin === "max" ? "Máxima" : "Mínima"} (${unidade})`,
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
          className="mt-4 bg-purple-900 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition"
        >
          Buscar Dados
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
                ],
              }}
            />
          </div>

          {/* Pressão */}
          <div className="bg-white p-6 rounded-lg shadow w-full aspect-w-16 aspect-h-9">
            <h2 className="text-lg font-semibold text-center mb-2">Pressão Máxima e Mínima</h2>
            <Line
              data={{
                labels: dadosDiarios.map((d) => d.dia),
                datasets: [
                  gerarDataset("press", "max"),
                  gerarDataset("press", "min"),
                ],
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
