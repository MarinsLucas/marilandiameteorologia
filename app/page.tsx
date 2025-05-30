import Link from "next/link";

interface DadosMeteorologicos {
  temperatura: number;
  umidade: number;
  velocidade: number;
  direcao: string;
  luminosidade: number;
  pressao: number;
  chuva: number;
  data: string;
}

export default async function AgoraPage() {
  const response = await fetch(
    "https://script.google.com/macros/s/AKfycbwD9Iedii4r-M5QGcpHFAIvARaARuDrONIja0UhmLYvTI1IGBd0SlplFm5TgQbQ62wN/exec?leitura=ultima",
    { cache: "no-store" }
  );

  const dados: DadosMeteorologicos = await response.json();

  const {
    temperatura,
    umidade,
    velocidade,
    direcao,
    luminosidade,
    pressao,
    chuva,
    data,
  } = dados;

  function luxEsperadoPorHora(hora: number): number {
    const A = 6000; // pico máximo de lux
    const inicioDia = 6; // 6h começa o ciclo
    const fimDia = 18; // 19h termina o ciclo
    const periodo = fimDia - inicioDia; // 12 horas

    if (hora < inicioDia || hora > fimDia) return 0;

    const valor = A * Math.sin((Math.PI * (hora - inicioDia)) / periodo);
    return valor;
  }

  function avaliarCondicaoTempo({
    luminosidade,
    chuva,
    data,
  }: Pick<DadosMeteorologicos, "luminosidade" | "chuva" | "data">): string {
    const hora = new Date(data).getHours();

    if (chuva < 4000) return "Chuvoso";
    if (hora >= 19 || hora < 6) return "De noite";
    if (luminosidade < luxEsperadoPorHora(hora) / 2) return "Nublado";
    if (luminosidade < luxEsperadoPorHora(hora) * 0.8)
      return "Parcialmente Nublado";
    return "Ensolarado";
  }

  const condicaoTempo = avaliarCondicaoTempo({ luminosidade, chuva, data });

  return (
    <div className="min-h-screen bg-purple-700 text-white p-6 flex flex-col items-center">
      {/* Cabeçalho */}
      <header className="w-full max-w-4xl flex justify-between items-center bg-purple-800 p-4 rounded-lg shadow-md mb-6">
        <h1 className="text-2xl font-bold">1.3v</h1>
        <nav className="flex gap-4">
          <Link
            href="/"
            className="bg-white text-purple-900 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition"
          >
            Agora
          </Link>
          <Link
            href="/historico"
            className="bg-white text-purple-900 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition"
          >
            Histórico
          </Link>
        </nav>
      </header>

      <h1 className="text-4xl font-bold text-center mb-6">
        Como está o tempo agora no Marilândia?
      </h1>

      {/* Quadro principal com estado e dados */}
      <div className="bg-white text-purple-900 rounded-xl shadow-xl w-full max-w-5xl p-6 mb-12 flex flex-col md:flex-row justify-between items-start md:items-center">
        {/* Estado do tempo */}
        <div className="mb-6 md:mb-0 md:w-1/2">
          <h2 className="text-2xl font-semibold mb-2">Tempo agora:</h2>
          <p className="text-5xl font-bold">{condicaoTempo}</p>
        </div>

        {/* Dados meteorológicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-1/2">
          <div>
            <h3 className="text-lg font-semibold">🌡️ Temperatura</h3>
            <p className="text-2xl">{temperatura} °C</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">💧 Umidade</h3>
            <p className="text-2xl">{umidade} %</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">💨 Vento</h3>
            <p className="text-2xl">{velocidade} m/s</p>
            <p className="text-md">{direcao}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">🌙 Luminosidade</h3>
            <p className="text-2xl">{luminosidade} lux</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">📈 Pressão</h3>
            <p className="text-2xl">{pressao} hPa</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">🕒 Data da Medição</h3>
            <p className="text-xl">{new Date(data).toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})}</p>
          </div>
        </div>
      </div>

      {/* Linha divisória */}
      <hr className="border-t-2 border-white w-full max-w-5xl mb-8" />

      {/* Previsão */}
      <section className="bg-white text-purple-900 rounded-xl shadow-xl w-full max-w-5xl p-6 flex flex-col items-start">
        <h2 className="text-3xl font-bold mb-4">Previsão do Tempo</h2>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full mb-4 gap-6">
          <div>
            <h3 className="text-xl font-semibold">Condição Prevista</h3>
            <p className="text-2xl">------------</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Temperatura Esperada</h3>
            <p className="text-2xl">-------</p>
          </div>
        </div>

        <p className="text-md text-gray-700">
          Previsão do tempo gerada através de modelagem computacional baseada em dados, logo, não é perfeita e pode conter erros! Gerada através de uma rede neural treinada com 500KB de dados. Tende a melhorar com o tempo.
        </p>
      </section>
    </div>
  );
}
