export default function OfflinePage() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">You are offline</h1>
        <p className="mt-2 text-slate-600">Your entries will sync once internet is back.</p>
      </div>
    </div>
  );
}
