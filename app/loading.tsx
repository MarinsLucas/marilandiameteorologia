// app/loading.tsx

// Você pode reusar o layout da sua página, mas com "esqueletos"
export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center animate-pulse">
      {/* ... Seu Header (ele não precisa de skeleton) ... */}
      
      <h2 className="text-2xl sm:text-3xl font-light text-center mb-8 h-10 bg-white/10 rounded-lg w-1/2"></h2>
      
      <main className="w-full max-w-6xl bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Skeleton do Lado Esquerdo */}
        <div className="flex flex-col items-center justify-center text-center lg:w-1/3">
            <div className="w-[120px] h-[120px] bg-white/20 rounded-full"></div>
            <div className="h-10 bg-white/20 rounded-lg w-3/4 mt-4"></div>
        </div>
        
        {/* Skeleton do Lado Direito */}
        <div className="flex flex-col justify-center lg:w-2/3">
            <div className="flex flex-col sm:flex-row gap-8 mb-6">
                <div className="h-24 w-1/2 bg-white/20 rounded-lg"></div>
                <div className="h-24 w-1/2 bg-white/20 rounded-lg"></div>
            </div>
            <div className="grid grid-cols-2 gap-6 border-t border-white/20 pt-6">
                <div className="h-12 bg-white/20 rounded-lg"></div>
                <div className="h-12 bg-white/20 rounded-lg"></div>
            </div>
             <div className="text-center mt-8">
                <div className="h-4 w-1/3 mx-auto bg-white/20 rounded-lg"></div>
             </div>
        </div>
      </main>
    </div>
  );
}