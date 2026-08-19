// Next.js uses this file automatically as the Suspense fallback for the / route
export default function HomeLoading() {
  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full">

      {/* Header skeleton */}
      <header className="px-6 pt-10 pb-6">
        <div className="skeleton h-3 w-28 mb-2" />
        <div className="skeleton h-7 w-48" />
      </header>

      {/* Balance card skeleton */}
      <div className="px-6 mb-5">
        <div className="skeleton rounded-3xl h-36 w-full" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 gap-3 px-6 mb-6">
        <div className="skeleton rounded-2xl h-24" />
        <div className="skeleton rounded-2xl h-24" />
      </div>

      {/* Transactions skeleton */}
      <section className="px-6">
        <div className="flex justify-between items-center mb-4">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-14" />
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-border/30">
              <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 rounded-full" style={{ width: `${55 + (i % 3) * 15}%` }} />
                <div className="skeleton h-2.5 w-16 rounded-full" />
              </div>
              <div className="skeleton h-4 w-20 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
