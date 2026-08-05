import { Flame } from 'lucide-react'

function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
      <div className="flex items-center gap-3 rounded-xl bg-slate-800 p-6 shadow-lg border border-slate-700">
        <Flame className="h-8 w-8 text-orange-500 animate-pulse" />
        <h1 className="text-3xl font-bold tracking-tight text-orange-400">
          HeatVision Initialized
        </h1>
      </div>
      <p className="mt-4 text-slate-400 font-mono text-sm">
        Frontend setup complete with Tailwind CSS v4 & Lucide Icons.
      </p>
    </div>
  )
}

export default App