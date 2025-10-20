// app/error.tsx
"use client"; // Páginas de erro precisam ser componentes de cliente

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-blue-900 text-white p-8 flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-red-400 mb-4">Oops! Algo deu errado.</h1>
      <p className="text-xl text-slate-300 mb-8">
        Não foi possível carregar os dados da estação meteorológica.
      </p>
      <p className="text-sm text-slate-400 bg-black/20 p-4 rounded-lg">
        Detalhe do erro: {error.message}
      </p>
    </div>
  );
}