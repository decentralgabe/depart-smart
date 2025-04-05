import type { Metadata } from "next"
import CommuteOptimizer from "@/components/commute-optimizer"

export const metadata: Metadata = {
  title: "Depart Smart - Find Your Optimal Departure Time",
  description: "Get optimal departure times based on real-time traffic data at departsm.art",
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 relative overflow-hidden">
      {/* Abstract geometric shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Diagonal gradient streak */}
        <div className="absolute -top-[30%] -right-[10%] w-[80%] h-[70%] bg-gradient-to-br from-purple-500/20 via-indigo-500/20 to-transparent rounded-full blur-3xl transform rotate-12"></div>
        
        {/* Circular glow */}
        <div className="absolute top-[20%] -left-[20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-3xl"></div>
        
        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500"></div>
      </div>

      <header className="relative py-12 flex flex-col items-center overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 pb-2">
            Depart Smart
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-300 max-w-2xl mx-auto">
            Find the perfect time to leave with real-time traffic predictions and arrive exactly when you need to.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl flex-1 relative z-10">
        {/* App feature callout */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-4">
            <div className="inline-flex items-center justify-center rounded-full h-12 w-12 bg-purple-900/50 border border-purple-800/50 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>
            <h3 className="font-semibold text-gray-200">Real-time Traffic</h3>
            <p className="text-gray-400 text-sm">Traffic-aware route planning based on live data</p>
          </div>
          <div className="p-4">
            <div className="inline-flex items-center justify-center rounded-full h-12 w-12 bg-indigo-900/50 border border-indigo-800/50 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"></path>
              </svg>
            </div>
            <h3 className="font-semibold text-gray-200">Smart Predictions</h3>
            <p className="text-gray-400 text-sm">Intelligent algorithms that predict optimal departure times</p>
          </div>
          <div className="p-4">
            <div className="inline-flex items-center justify-center rounded-full h-12 w-12 bg-blue-900/50 border border-blue-800/50 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <h3 className="font-semibold text-gray-200">Multiple Options</h3>
            <p className="text-gray-400 text-sm">Compare various departure times to find what works best</p>
          </div>
        </div>

        {/* Glassmorphism container for the commute optimizer */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <CommuteOptimizer />
        </div>
      </main>
      
      {/* Subtle footer */}
      <footer className="py-6 text-center text-gray-500 text-sm">
        <div className="container mx-auto">
          <p>© {new Date().getFullYear()} DepartSmart. Helping you arrive on time.</p>
        </div>
      </footer>
    </div>
  )
}

