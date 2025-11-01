import dynamic from "next/dynamic";

export const MJMLEditor = dynamic(() => import("./MJMLEditor"), { ssr: false });
