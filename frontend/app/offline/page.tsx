export const metadata = {
  title: "오프라인 — EXP Calendar"
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold text-accent">오프라인 상태</h1>
        <p className="text-text-2 text-sm">
          네트워크 연결이 끊어졌습니다. 다시 연결되면 자동으로 동기화됩니다.
        </p>
      </div>
    </main>
  );
}
