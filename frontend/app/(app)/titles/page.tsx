"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TitlesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/identity");
  }, [router]);
  return null;
}
