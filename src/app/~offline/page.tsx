"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
      <div className="rounded-full bg-muted p-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <line x1="2" x2="22" y1="2" y2="22" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
          <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
          <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
          <path d="M5 12.86a10 10 0 0 1 5.17-2.89" />
          <line x1="12" x2="12.01" y1="20" y2="20" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold">
        ไม่มีการเชื่อมต่ออินเทอร์เน็ต
      </h1>
      <p className="text-center text-muted-foreground">
        กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        ลองอีกครั้ง
      </button>
    </div>
  );
}
