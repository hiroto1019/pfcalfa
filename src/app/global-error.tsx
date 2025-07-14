"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">エラーが発生しました</h2>
            <p className="mb-4 text-muted-foreground">{error.message}</p>
            <button 
              onClick={() => reset()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              再試行
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
