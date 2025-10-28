import Link from "next/link";
import { getDatabase, ref, get, child } from "firebase/database";
import { app } from "../lib/firebaseConfig";
import {
  Thermometer,
  Wind,
  Droplets,
  Sun,
  Cloud,
  Cloudy,
  CloudRain,
  Moon,
  Eye,
} from "lucide-react";

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

export const dynamic = "force-dynamic";

// --- Lógica de avaliação do tempo (sem alterações) ---
function luxEsperadoPorHora(hora: number): number {
  const A = 3262;
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
  const hora = new Date(data).getHours() - 3;

  if (chuva < 4000) return "Chuvoso";
  if (hora > 18 || hora < 6) return "De noite";
  if (luminosidade < luxEsperadoPorHora(hora) / 2) return "Nublado";
  if (luminosidade < luxEsperadoPorHora(hora) * 0.8)
    return "Parcialmente Nublado";
  return "Ensolarado";
}

// --- Componente de Ícone (ALTERADO) ---
// Ajustado para garantir alto contraste em todos os fundos
const WeatherIcon = ({ condicao, size }: { condicao: CondicaoTempo, size: number }) => {
  switch (condicao) {
    case "Ensolarado":
      return <Sun size={size} className="text-yellow-300" />;
    case "Parcialmente Nublado":
      // Alterado de slate-300 para white para melhor contraste
      return <Cloudy size={size} className="text-white" />;
    case "Nublado":
      // Alterado de slate-400 para white para melhor contraste
      return <Cloud size={size} className="text-white" />;
    case "Chuvoso":
      return <CloudRain size={size} className="text-blue-300" />;
    case "De noite":
      // Ligeiramente mais brilhante
      return <Moon size={size} className="text-slate-200" />;
    default:
      return <Cloudy size={size} className="text-white" />;
  }
};

// --- NOVA FUNÇÃO: Define o fundo com base na condição do tempo ---
/**
 * Retorna as classes de gradiente do Tailwind com base na condição do tempo.
 * @param condicao A condição do tempo calculada.
 * @returns Uma string de classes do Tailwind para o gradiente de fundo.
 */
function getDynamicBackground(condicao: CondicaoTempo): string {
  switch (condicao) {
    case "Ensolarado":
      // Céu azul brilhante
      return "from-sky-500 to-blue-600";
    case "Parcialmente Nublado":
      // Céu azul com tons de cinza
      return "from-sky-700 to-slate-700";
    case "Nublado":
      // Céu cinza (nublado)
      return "from-gray-500 to-slate-600";
    case "Chuvoso":
      // Céu escuro e chuvoso
      return "from-slate-600 to-gray-800";
    case "De noite":
      // Céu noturno escuro
      return "from-gray-900 to-indigo-900";
    default:
      // Fundo padrão
      return "from-gray-900 to-blue-900";
  }
}


export default async function AgoraPage() {
  
  const db = getDatabase(app);
  const snapshot = await get(child(ref(db), "leitura_atual"));

  if (!snapshot.exists()) {
    throw new Error("Nenhum dado encontrado.");
  }

  const weatherData = snapshot.val() as WeatherData;

  const dados: DadosMeteorologicos = {
    temperatura: weatherData.Temperatura,
    umidade: weatherData.Umidade,
    velocidade: weatherData.Velocidade,
    luminosidade: weatherData.Luminosidade,
    chuva: weatherData.Chuva,
    data: weatherData.timestamp,
  };

  const condicaoTempo = avaliarCondicaoTempo(dados);

  // --- ALTERAÇÃO: Chama a nova função para obter as classes de fundo ---
  const backgroundClasses = getDynamicBackground(condicaoTempo);

  return (
    // --- ALTERAÇÃO: Usa as classes dinâmicas e adiciona transição ---
    <div 
      className={`min-h-screen w-full bg-gradient-to-br text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center transition-all duration-1000 ${backgroundClasses}`}
    >
      
      {/* CABEÇALHO: Simplificado e com estilo mais clean */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">Marilândia Meteorologia</h1>
        <nav className="flex gap-2">
          {/* Links do cabeçalho agora têm um fundo mais escuro para garantir contraste */}
          <Link href="/" className="bg-black/20 hover:bg-black/30 transition px-4 py-2 rounded-full text-sm">
            Agora
          </Link>
          <Link href="/historico" className="bg-black/10 hover:bg-black/20 transition px-4 py-2 rounded-full text-sm">
            Histórico
          </Link>
        </nav>
      </header>

      {/* Título Principal */}
      <h2 className="text-2xl sm:text-3xl font-light text-center mb-8">
        O tempo em Juiz de Fora, agora
      </h2>
      
      {/* CARD PRINCIPAL: Fundo alterado de bg-white/10 para bg-black/20 para melhor contraste */}
      <main className="w-full max-w-6xl bg-black/20 backdrop-blur-lg border border-white/20 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Lado Esquerdo: Ícone gigante e Condição do Tempo */}
        <div className="flex flex-col items-center justify-center text-center lg:w-1/3">
           <WeatherIcon condicao={condicaoTempo} size={120} />
          <p className="text-4xl font-bold mt-4">{condicaoTempo}</p>
        </div>
        
        {/* Lado Direito: Dados principais e secundários */}
        <div className="flex flex-col justify-center lg:w-2/3">
            {/* DADOS EM DESTAQUE: Temperatura e Umidade */}
            <div className="flex flex-col sm:flex-row gap-8 mb-6">
                <div className="flex items-center gap-4">
                    <Thermometer className="text-red-400" size={48} />
                    <div>
                        {/* Texto do rótulo mais brilhante */}
                        <p className="text-slate-100">Temperatura</p>
                        <p className="text-7xl font-bold">{dados.temperatura}°C</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Droplets className="text-blue-400" size={48} />
                    <div>
                         {/* Texto do rótulo mais brilhante */}
                        <p className="text-slate-100">Umidade</p>
                        <p className="text-5xl font-bold">{dados.umidade}%</p>
                    </div>
                </div>
            </div>

            {/* DADOS SECUNDÁRIOS: Vento e Luminosidade */}
            <div className="grid grid-cols-2 gap-6 border-t border-white/20 pt-6">
                 <div className="flex items-center gap-3">
                     {/* Ícone mais brilhante */}
                    <Wind size={24} className="text-slate-100" />
                    <div>
                         {/* Texto do rótulo mais brilhante */}
                        <h3 className="text-sm text-slate-200">Vento</h3>
                        <p className="text-lg font-semibold">{dados.velocidade} m/s</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                     {/* Ícone mais brilhante */}
                    <Eye size={24} className="text-slate-100" />
                    <div>
                         {/* Texto do rótulo mais brilhante */}
                        <h3 className="text-sm text-slate-200">Luminosidade</h3>
                        <p className="text-lg font-semibold">{dados.luminosidade} lux</p>
                    </div>
                </div>
            </div>

             {/* INFORMAÇÃO MENOS IMPORTANTE: Data, um pouco mais brilhante */}
             <div className="text-center mt-8">
                <p className="text-xs text-slate-300">
                    Última medição: {new Date(dados.data).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
             </div>
        </div>
      </main>

      {/* Seção de Previsão: Fundo alterado para bg-black/20 */}
       <section className="mt-8 w-full max-w-6xl bg-black/20 backdrop-blur-lg border border-white/20 rounded-3xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-4">Previsão (Em desenvolvimento)</h2>
             {/* Texto do parágrafo mais brilhante */}
            <p className="text-slate-200">
             Previsão do tempo gerada através de modelagem computacional baseada em
             dados, logo, não é perfeita e pode conter erros! Gerada através de uma
             rede neural treinada com 500KB de dados. Tende a melhorar com o tempo.
            </p>
       </section>

       <footer className="w-full max-w-6xl text-center mt-8">
         {/* Texto do rodapé mais brilhante */}
        <p className="text-xs text-slate-400">
          Marilândia Meteorologia v1.9.1
        </p>
      </footer>
    </div>
  );
}

