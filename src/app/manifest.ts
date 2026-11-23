import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Kotoba — 일본어 공부",
    short_name: "Kotoba",
    description: "한자와 단어를 연결해 외우는 개인 맞춤 일본어 학습 앱",
    scope: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#18352e",
    lang: "ko",
    icons: [
      { src: "/icons/kotoba-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/kotoba-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/kotoba-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
