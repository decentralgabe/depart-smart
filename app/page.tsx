import type { Metadata } from "next"
import CommuteOptimizer from "@/components/commute-optimizer"

export const metadata: Metadata = {
  title: "Depart Smart - Find Your Optimal Departure Time",
  description: "Get optimal departure times based on real-time traffic data at departsm.art",
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-b border-accent/20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl text-center">
            Depart Smart
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground text-center">
            Find the optimal time to leave for your destination based on current traffic conditions
          </p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <CommuteOptimizer />
      </main>
    </div>
  )
}

