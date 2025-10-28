import Link from "next/link";
import { getDatabase, ref, get, child } from "firebase/database";
import { app } from "../../lib/firebaseConfig";
import { Clock, Database, Info, Cpu } from "lucide-react"; // Ícones para a página de debug

// --- Tipos de dados (sem alterações) ---
type WeatherData = {
  timestamp: string;
  Luminosidade: number;
  Temperatura: number;
  Umidade: number;
  Velocidade: number;
  Chuva: number;
  RSSI: string;
  PacotesPerdidos: string;
};

interface DadosMeteorologicos {
  temperatura: number;
  umidade: number;
  velocidade: number;
  luminosidade: number;
  chuva: number;
  data: string;
}

// Garante que a página seja renderizada dinamicamente a cada requisição
export const dynamic = "force-dynamic";

// --- Lógica de avaliação do tempo (copiada para cálculo) ---
function luxEsperadoPorHora(hora: number): number {
  const A = 6000;
  const inicioDia = 6;
  const fimDia = 18;
  const periodo = fimDia - inicioDia;

  if (hora < inicioDia || hora > fimDia) return 0;

  const valor = A * Math.sin((Math.PI * (hora - inicioDia)) / periodo);
  return valor;
}

type CondicaoTempo =
  | "Chuvoso"
  | "De noite"
  | "Nublado"
  | "Parcialmente Nublado"
  | "Ensolarado";

function avaliarCondicaoTempo({
  luminosidade,
  chuva,
  data,
}: Pick<DadosMeteorologicos, "luminosidade" | "chuva" | "data">): CondicaoTempo {
  const hora = new Date(data).getHours();

  if (chuva < 4000) return "Chuvoso";
  if (hora > 18 || hora < 6) return "De noite";
  if (luminosidade < luxEsperadoPorHora(hora - 3) / 2) return "Nublado";
  if (luminosidade < luxEsperadoPorHora(hora - 3) * 0.8)
    return "Parcialmente Nublado";
  return "Ensolarado";
}

// --- Componentes auxiliares para a UI de Debug ---

// Componente para uma linha de informação
const DebugRow = ({ label, value, unit = "" }: { label: string, value: string | number | undefined, unit?: string }) => (
  <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-800 rounded-lg">
    <span className="font-semibold text-slate-300">{label}</span>
    <span className="font-mono text-lg text-yellow-300 break-all">
      {String(value)} {unit}
    </span>
  </li>
);

// Componente para agrupar seções de informação
const Section = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
  <section className="mb-8 bg-gray-850 border border-gray-700 rounded-xl p-4 sm:p-6">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
      {icon} {title}
    </h2>
    <ul className="space-y-2">
      {children}
    </ul>
  </section>
);

// --- Página Principal de Debug ---

export default async function DebugPage() {
  
  // 1. Captura a hora exata da renderização no servidor
  const serverRenderTime = new Date();

  const db = getDatabase(app);
  const snapshot = await get(child(ref(db), "leitura_atual"));

  if (!snapshot.exists()) {
    return (
      <div className="min-h-screen w-full bg-gray-900 text-red-400 p-8 flex items-center justify-center">
        <h1 className="text-2xl font-bold">Erro: Nenhum dado encontrado no nó "leitura_atual".</h1>
      </div>
    );
  }

  // 2. Obtém os dados brutos do Firebase
  const weatherData = snapshot.val() as WeatherData;
  const databaseTimestamp = new Date(weatherData.timestamp);

  // 3. Processa os dados como na página principal
  const dados: DadosMeteorologicos = {
    temperatura: weatherData.Temperatura,
    umidade: weatherData.Umidade,
    velocidade: weatherData.Velocidade,
    luminosidade: weatherData.Luminosidade,
    chuva: weatherData.Chuva,
    data: weatherData.timestamp,
  };

  // 4. Calcula a lógica
  const condicaoTempo = avaliarCondicaoTempo(dados);
  const horaDb = new Date(dados.data).getHours();
  const luxEsperado = luxEsperadoPorHora(horaDb - 3).toFixed(2); // Usando a hora do DB

  // 5. Calcula a diferença de tempo
  const timeDifferenceSeconds = (serverRenderTime.getTime() - databaseTimestamp.getTime()) / 1000;

  return (
    <div className="min-h-screen w-full bg-gray-900 text-slate-200 p-4 sm:p-6 lg:p-8">
      
      {/* Cabeçalho da Página de Debug */}
      <header className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-yellow-400">Página de Debug - Estação Marilândia</h1>
        <Link href="/" className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg text-white font-semibold">
          &larr; Voltar para Home
        </Link>
      </header>

      <main className="w-full max-w-4xl mx-auto">

        {/* Seção de Timestamps */}
        <Section title="Sincronia e Timestamps" icon={<Clock size={24} />}>
          <DebugRow 
            label="Hora do Render (Servidor)" 
            value={serverRenderTime.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} 
          />
          <DebugRow 
            label="Hora do Registro (Database)" 
            value={databaseTimestamp.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} 
          />
          <DebugRow 
            label="Diferença (Servidor vs DB)" 
            value={timeDifferenceSeconds.toFixed(2)} 
            unit="segundos"
          />
        </Section>

        {/* Seção de Dados Brutos */}
        <Section title="Dados Brutos (Firebase)" icon={<Database size={24} />}>
          <DebugRow label="Timestamp" value={weatherData.timestamp} />
          <DebugRow label="Temperatura" value={weatherData.Temperatura} unit="°C" />
          <DebugRow label="Umidade" value={weatherData.Umidade} unit="%" />
          <DebugRow label="Velocidade" value={weatherData.Velocidade} unit="m/s" />
          <DebugRow label="Luminosidade (Raw)" value={weatherData.Luminosidade} />
          <DebugRow label="Chuva (Raw)" value={weatherData.Chuva} />
          <DebugRow label="RSSI" value={weatherData.RSSI} />
          <DebugRow label="PacotesPerdidos" value={weatherData.PacotesPerdidos} />
        </Section>

        {/* Seção de Dados Processados (usados na Home) */}
        <Section title="Dados Processados (Usados na Home)" icon={<Info size={24} />}>
          <DebugRow label="Temperatura" value={dados.temperatura} unit="°C" />
          <DebugRow label="Umidade" value={dados.umidade} unit="%" />
          <DebugRow label="Velocidade" value={dados.velocidade} unit="m/s" />
          <DebugRow label="Luminosidade" value={dados.luminosidade} unit="lux" />
          <DebugRow label="Chuva (Valor p/ Lógica)" value={dados.chuva} />
        </Section>

        {/* Seção da Lógica Calculada */}
        <Section title="Lógica Calculada" icon={<Cpu size={24} />}>
          <DebugRow label="Condição do Tempo" value={condicaoTempo} />
          <DebugRow label="Hora usada no cálculo" value={horaDb} unit="h" />
          <DebugRow label="Lux Esperado (p/ hora do DB)" value={luxEsperado} unit="lux" />
        </Section>

      </main>
    </div>
  );
}
