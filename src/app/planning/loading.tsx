export default function PlanningLoading() {
  return (
    <main className="flex-1 pb-28 max-w-lg mx-auto w-full">
      <header className="flex items-center px-6 pt-10 pb-6 gap-4 animate-pulse">
        <div className="w-11 h-11 bg-muted rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-6 w-32 bg-muted rounded" />
        </div>
      </header>
      
      <div className="px-6 animate-pulse">
        {/* Skeleton for 50/30/20 Activity Rings */}
        <div className="glass p-6 rounded-[32px] mb-6 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-48 h-48 rounded-full border-[16px] border-muted/50" />
        </div>

        {/* Skeletons for savings goals */}
        <div className="space-y-4">
          <div className="h-32 bg-muted/50 rounded-[32px] w-full" />
          <div className="h-32 bg-muted/50 rounded-[32px] w-full" />
        </div>
      </div>
    </main>
  )
}
