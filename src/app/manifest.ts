import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GCOffice - ระบบใบเสนอราคา",
    short_name: "GCOffice",
    description: "ระบบจัดทำใบเสนอราคาและใบแจ้งหนี้",
    start_url: "/dashboard",
    display: "standalone",
    theme_color: "#1a1a1a",
    background_color: "#ffffff",
    lang: "th",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
