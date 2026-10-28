"use client";

import { useEffect } from "react";
import { captureSource } from "@/lib/api2";

export default function SourceCapture() {
  useEffect(() => { captureSource(); }, []);
  return null;
}
