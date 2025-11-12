import { LoaderCircle } from "lucide-react";
import dynamic from "next/dynamic";

export const EmailEditor = dynamic(() => import("./EmailEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-[calc(100vh-100px)]">
      <LoaderCircle size={32} className="animate-spin" />
    </div>
  ),
});
