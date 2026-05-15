"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredAccessToken } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const token = getStoredAccessToken();
    if (token) router.replace("/calendar");
    else router.replace("/login");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-screen text-text-2">
      <div className="animate-pulse">EXP Calendar 로딩 중...</div>
    </div>
  );
}
