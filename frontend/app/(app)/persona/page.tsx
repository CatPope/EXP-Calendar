"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PersonaRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/identity/settings");
  }, [router]);
  return null;
}
