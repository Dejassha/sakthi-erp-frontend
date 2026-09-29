import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
export default defineConfig({
  server: {
    host: true,
    port: 8080,
    allowedHosts: ["sakthi-erp.example.com", "sakthi-erp", "localhost", "127.0.0.1"],
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("xlsx")) return "vendor-xlsx";
            if (id.includes("jspdf") || id.includes("html-to-image") || id.includes("html2canvas")) return "vendor-pdf";
            if (id.includes("ag-grid")) return "vendor-aggrid";
            if (id.includes("@iconify") || id.includes("lucide")) return "vendor-icons";
            if (id.includes("@reduxjs") || id.includes("redux")) return "vendor-redux";
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router") ||
              id.includes("antd") ||
              id.includes("@ant-design") ||
              id.includes("rc-") ||
              id.includes("@rc-component")
            ) {
              return "vendor-react-ui";
            }
          }
        },
      },
    },
  },
});
