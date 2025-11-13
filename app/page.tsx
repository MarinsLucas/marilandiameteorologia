import Link from "next/link";
import { getDatabase, ref, get, child } from "firebase/database";
import { app } from "../lib/firebaseConfig";
import SunCalc from 'suncalc'; // Certifique-se de ter rodado: npm install suncalc
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
  Waves,    // Para Ponto de Orvalho
  Glasses,  // Para Índice UV
  Smile,    // Para Nível de Conforto
  Info,     // Para explicação da sensação
  Sunrise,  // Para Nascer do Sol
  Sunset,   // Para Pôr do Sol
} from "lucide-react";

// --- Tipos de dados ---
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

// --- Lógica Auxiliar ---
function luxEsperadoPorHora(hora: number): number {
  const A = 3262;
  const inicioDia = 6;
  const fimDia = 18;
  const periodo = fimDia - inicioDia;

  if (hora < inicioDia || hora > fimDia) return 0;

  const valor = A * Math.sin((Math.PI * (hora - inicioDia)) / periodo);
  return valor;
}

// --- FUNÇÕES DE CÁLCULO (Chuva, Sensação) ---

/**
 * IDEIA 1: Converte o valor bruto do sensor de chuva em uma descrição.
 */
function getNivelChuva(valorChuva: number): string {
  if (valorChuva > 3950) return "Sem Chuva";
  if (valorChuva > 3500) return "Chuvisco";
  if (valorChuva > 3000) return "Chuva Leve";
  if (valorChuva > 2500) return "Chuva Moderada";
  return "Chuva Forte";
}

/**
 * IDEIA 3: Retorna a explicação para a sensação térmica.
 */
type FatorSensacao = "Vento" | "Umidade" | "Real";
function getExplicacaoSensacao(T: number, R: number, V: number): { fator: FatorSensacao, texto: string } {
  if (T <= 10 && V > 4.8) {
    return { fator: "Vento", texto: "Vento predominante (Wind Chill)" };
  }
  if (T >= 26.7 && R >= 40) {
    return { fator: "Umidade", texto: "Umidade predominante (Índice de Calor)" };
  }
  return { fator: "Real", texto: "Temperatura real" };
}

// --- LÓGICA DE AVALIAÇÃO DO TEMPO ---
type CondicaoTempo =
  | "Chuva Forte"
  | "Chuva Moderada"
  | "Chuva Leve"
  | "Chuvisco"
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

  // 1. Checa a chuva PRIMEIRO
  const nivelChuva = getNivelChuva(chuva);
  if (nivelChuva !== "Sem Chuva") {
    return nivelChuva as CondicaoTempo;
  }

  // 2. Se não chove, checa noite/dia
  if (hora > 18 || hora < 6) return "De noite";

  // 3. Checa luminosidade
  if (luminosidade < luxEsperadoPorHora(hora) / 2) return "Nublado";
  if (luminosidade < luxEsperadoPorHora(hora) * 0.8)
    return "Parcialmente Nublado";
    
  return "Ensolarado";
}

// --- Componente de Ícone ---
const WeatherIcon = ({ condicao, size }: { condicao: CondicaoTempo, size: number }) => {
  switch (condicao) {
    case "Ensolarado":
      return <Sun size={size} className="text-yellow-300" />;
    case "Parcialmente Nublado":
      return <Cloudy size={size} className="text-white" />;
    case "Nublado":
      return <Cloud size={size} className="text-white" />;
    case "Chuvisco":
    case "Chuva Leve":
    case "Chuva Moderada":
    case "Chuva Forte":
      return <CloudRain size={size} className="text-blue-300" />;
    case "De noite":
      return <Moon size={size} className="text-slate-200" />;
    default:
      return <Cloudy size={size} className="text-white" />;
  }
};

// --- Função de Fundo Dinâmico ---
function getDynamicBackground(condicao: CondicaoTempo): string {
  switch (condicao) {
    case "Ensolarado":
      return "from-sky-500 to-blue-600";
    case "Parcialmente Nublado":
      return "from-sky-700 to-slate-700";
    case "Nublado":
      return "from-gray-500 to-slate-600";
    case "Chuvisco":
    case "Chuva Leve":
    case "Chuva Moderada":
    case "Chuva Forte":
      return "from-slate-600 to-gray-800";
    case "De noite":
      return "from-gray-900 to-indigo-900";
    default:
      return "from-gray-900 to-blue-900";
  }
}

// --- CÁLCULOS METEOROLÓGICOS ---
function calcularWindChill(T: number, V: number): number {
  if (T > 10 || V <= 4.8) return T;
  const V_pow = Math.pow(V, 0.16);
  const windChill = 13.12 + 0.6215 * T - 11.37 * V_pow + 0.3965 * T * V_pow;
  return windChill < T ? windChill : T;
}

function calcularHeatIndex(T: number, R: number): number {
  if (T < 26.7 || R < 40) return T;
  const c1 = -8.78469475556;
  const c2 = 1.61139411;
  const c3 = 2.33854883889;
  const c4 = -0.14611605;
  const c5 = -0.012308094;
  const c6 = -0.0164248277778;
  const c7 = 0.002211732;
  const c8 = 0.00072546;
  const c9 = -0.000003582;
  const T2 = T * T;
  const R2 = R * R;
  const HI = c1 + (c2 * T) + (c3 * R) + (c4 * T * R) + (c5 * T2) + (c6 * R2) + (c7 * T2 * R) + (c8 * T * R2) + (c9 * T2 * R2);
  return HI > T ? HI : T;
}

function calcularSensacaoTermica(T: number, R: number, V: number): number {
  if (T <= 10 && V > 4.8) return calcularWindChill(T, V);
  if (T >= 26.7 && R >= 40) return calcularHeatIndex(T, R);
  return T;
}

function calcularPontoOrvalho(T: number, R: number): number {
  const b = 17.62;
  const c = 243.12;
  const gamma = (b * T / (c + T)) + Math.log(R / 100);
  const dewPoint = (c * gamma) / (b - gamma);
  return dewPoint;
}

function calcularIndiceUV(lux: number, condicao: CondicaoTempo): number {
  if (condicao === 'De noite' || condicao === 'Nublado' || condicao.includes('Chuva')) return 0;
  let uv = lux / 10000;
  if (condicao === 'Parcialmente Nublado') uv *= 0.7;
  return uv < 0 ? 0 : uv;
}

function obterNivelConforto(sensacao: number): string {
  if (sensacao < 14) return "Muito Frio"; 
  if (sensacao < 19) return "Frio"; 
  if (sensacao < 27) return "Agradável"; 
  if (sensacao < 32) return "Quente"; 
  return "Muito Quente";
}

// --- COMPONENTE PRINCIPAL ---
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

  // --- CÁLCULOS ---
  const condicaoTempo = avaliarCondicaoTempo(dados);
  const backgroundClasses = getDynamicBackground(condicaoTempo);

  // Nascer/Pôr do Sol (Juiz de Fora)
  const lat = -21.7646; 
  const lon = -43.3536; 
  const dataAtual = new Date(dados.data);
  const sunTimes = SunCalc.getTimes(dataAtual, lat, lon);
  const nascerDoSol = sunTimes.sunrise.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', timeZone: "America/Sao_Paulo" });
  const porDoSol = sunTimes.sunset.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', timeZone: "America/Sao_Paulo" });

  const sensacaoTermica = calcularSensacaoTermica(dados.temperatura, dados.umidade, dados.velocidade);
  const explicacaoSensacao = getExplicacaoSensacao(dados.temperatura, dados.umidade, dados.velocidade);
  const pontoOrvalho = calcularPontoOrvalho(dados.temperatura, dados.umidade);
  const indiceUV = calcularIndiceUV(dados.luminosidade, condicaoTempo);
  const nivelConforto = obterNivelConforto(sensacaoTermica);

  return (
    <div 
      className={`min-h-screen w-full bg-gradient-to-br text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center transition-all duration-1000 ${backgroundClasses}`}
    >
      
      {/* CABEÇALHO */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">Marilândia Meteorologia</h1>
        <nav className="flex gap-2">
          <Link href="/" className="bg-black/20 hover:bg-black/30 transition px-4 py-2 rounded-full text-sm">
            Agora
          </Link>
          <Link href="/historico" className="bg-black/10 hover:bg-black/20 transition px-4 py-2 rounded-full text-sm">
            Histórico
          </Link>
        </nav>
      </header>

      {/* Título */}
      <h2 className="text-2xl sm:text-3xl font-light text-center mb-8">
        O tempo em Juiz de Fora, agora
      </h2>
      
      {/* CARD PRINCIPAL */}
      <main className="w-full max-w-6xl bg-black/20 backdrop-blur-lg border border-white/20 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Lado Esquerdo: Ícone */}
        <div className="flex flex-col items-center justify-center text-center lg:w-1/3">
           <WeatherIcon condicao={condicaoTempo} size={120} />
          <p className="text-4xl font-bold mt-4">{condicaoTempo}</p>
        </div>
        
        {/* Lado Direito: Dados */}
        <div className="flex flex-col justify-center lg:w-2/3">
            {/* Temperatura e Umidade */}
            <div className="flex flex-col sm:flex-row gap-8 mb-6">
                
                <div className="flex items-center gap-4">
                    <Thermometer className="text-red-400" size={48} />
                    <div>
                        <p className="text-slate-100">Temperatura</p>
                        <p className="text-7xl font-bold">{dados.temperatura.toFixed(1)}°C</p>
                        <p className="text-lg text-slate-200">
                          Sensação: {sensacaoTermica.toFixed(1)}°C
                        </p>
                        {/* Explicação da Sensação */}
                        {explicacaoSensacao.fator !== "Real" && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Info size={14} className="text-cyan-300" />
                            <p className="text-sm text-slate-200">
                              {explicacaoSensacao.texto}
                            </p>
                          </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Droplets className="text-blue-400" size={48} />
                    <div>
                        <p className="text-slate-100">Umidade</p>
                        <p className="text-5xl font-bold">{dados.umidade.toFixed(0)}%</p>
                    </div>
                </div>
            </div>

            {/* Vento e Luminosidade */}
            <div className="grid grid-cols-2 gap-6 border-t border-white/20 pt-6">
                 <div className="flex items-center gap-3">
                    <Wind size={24} className="text-slate-100" />
                    <div>
                        <h3 className="text-sm text-slate-200">Vento</h3>
                        <p className="text-lg font-semibold">{dados.velocidade.toFixed(1)} km/h</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <Eye size={24} className="text-slate-100" />
                    <div>
                        <h3 className="text-sm text-slate-200">Luminosidade</h3>
                        <p className="text-lg font-semibold">{dados.luminosidade} lux</p>
                    </div>
                </div>
            </div>

             {/* Data */}
             <div className="text-center mt-8">
                <p className="text-xs text-slate-300">
                    Última medição: {new Date(dados.data).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
             </div>
        </div>
      </main>

      {/* CARD: MÉTRICAS CALCULADAS */}
      <section className="mt-8 w-full max-w-6xl bg-black/20 backdrop-blur-lg border border-white/20 rounded-3xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold mb-4">Métricas Calculadas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          <div className="flex items-center gap-3">
            <Waves size={24} className="text-blue-300" />
            <div>
              <h3 className="text-sm text-slate-200">Ponto de Orvalho</h3>
              <p className="text-lg font-semibold">{pontoOrvalho.toFixed(1)}°C</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Glasses size={24} className="text-yellow-300" />
            <div>
              <h3 className="text-sm text-slate-200">Índice UV (Estimado)</h3>
              <p className="text-lg font-semibold">{indiceUV.toFixed(1)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Smile size={24} className="text-green-300" />
            <div>
              <h3 className="text-sm text-slate-200">Nível de Conforto</h3>
              <p className="text-lg font-semibold">{nivelConforto}</p>
            </div>
          </div>

        </div>
      </section>

      {/* NOVO CARD: EFEMÉRIDES (Nascer/Pôr do Sol) */}
      <section className="mt-8 w-full max-w-6xl bg-black/20 backdrop-blur-lg border border-white/20 rounded-3xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold mb-4">Efemérides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          <div className="flex items-center gap-3">
            <Sunrise size={24} className="text-orange-300" />
            <div>
              <h3 className="text-sm text-slate-200">Nascer do Sol</h3>
              <p className="text-lg font-semibold">{nascerDoSol}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Sunset size={24} className="text-purple-300" />
            <div>
              <h3 className="text-sm text-slate-200">Pôr do Sol</h3>
              <p className="text-lg font-semibold">{porDoSol}</p>
            </div>
          </div>

        </div>
      </section>

      {/* Previsão */}
      <section className="mt-8 w-full max-w-6xl bg-black/20 backdrop-blur-lg border border-white/20 rounded-3xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold mb-4">Previsão (Em desenvolvimento)</h2>
        <p className="text-slate-200">
          Previsão do tempo gerada através de modelagem computacional baseada em
          dados, logo, não é perfeita e pode conter erros! Gerada através de uma
          rede neural treinada com 500KB de dados. Tende a melhorar com o tempo.
        </p>
       </section>

       {/* Rodapé */}
       <footer className="w-full max-w-6xl text-center mt-8">
        <p className="text-xs text-slate-400">
          Marilândia Meteorologia v1.10.0
        </p>
      </footer>
    </div>
  );
}