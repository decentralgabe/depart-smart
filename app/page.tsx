import type { Metadata } from "next"
import CommuteOptimizer from "@/components/commute-optimizer"

export const metadata: Metadata = {
  title: "Smart Commute - Find Your Optimal Departure Time",
  description: "Get notified when it's the best time to leave for work based on traffic conditions",
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-b border-accent/20">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            Smart Commute
          </h1>
          <p className="text-center text-muted-foreground">
            Find the optimal time to leave for work based on traffic conditions
          </p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <CommuteOptimizer />
      </main>
    </div>
  )
}

