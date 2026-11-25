import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import sitemap from "vite-plugin-sitemap";

function previewCacheHeadersPlugin() {
  return {
    name: "preview-cache-headers",
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
        next();
      });
    },
  };
}

function deferNonCriticalCSS() {
  return {
    name: "defer-non-critical-css",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
        (_, href) =>
          `<link rel="preload" as="style" fetchpriority="low" onload="this.onload=null;this.rel='stylesheet'" href="${href}">` +
          `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
      );
    },
  };
}

function injectApiPreconnect(apiUrl) {
  return {
    name: "inject-api-preconnect",
    apply: "build",
    transformIndexHtml(html) {
      try {
        const origin = new URL(apiUrl).origin;
        if (
          !origin ||
          origin === "null" ||
          origin.startsWith("http://localhost")
        )
          return html;
        const tags =
          `<link rel="dns-prefetch" href="${origin}">` +
          `\n    <link rel="preconnect" href="${origin}">`;
        return html.replace("<meta charset", `${tags}\n    <meta charset`);
      } catch {
        return html;
      }
    },
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HOSTNAME = "https://astrosushil.com";

// Static routes
const staticRoutes = [
  { url: "/", changefreq: "weekly", priority: 1.0 },
  // Core services
  { url: "/online-consultations", changefreq: "weekly", priority: 0.9 },
  { url: "/book-appointment", changefreq: "weekly", priority: 0.9 },
  {
    url: "/personalized-astrology-reports",
    changefreq: "weekly",
    priority: 0.9,
  },
  { url: "/free-online-kundli", changefreq: "weekly", priority: 0.9 },
  { url: "/kundli-matching", changefreq: "weekly", priority: 0.8 },
  // Shop
  { url: "/shop", changefreq: "weekly", priority: 0.8 },
  { url: "/products", changefreq: "weekly", priority: 0.7 },
  // Courses & services
  { url: "/courses/", changefreq: "weekly", priority: 0.8 },
  { url: "/services", changefreq: "weekly", priority: 0.8 },
  // Blog
  { url: "/blog", changefreq: "weekly", priority: 0.7 },
  // About & contact
  { url: "/about-us", changefreq: "monthly", priority: 0.6 },
  { url: "/contact-us", changefreq: "monthly", priority: 0.6 },
  { url: "/register", changefreq: "monthly", priority: 0.5 },
  // Legal
  { url: "/terms-conditions", changefreq: "yearly", priority: 0.3 },
  { url: "/privacy-policy", changefreq: "yearly", priority: 0.3 },
  { url: "/shipping-delivery-policy", changefreq: "yearly", priority: 0.3 },
  { url: "/cancellation-refund-policy", changefreq: "yearly", priority: 0.3 },
];

async function fetchDynamicRoutes(apiUrl) {
  const routes = [];

  const fetchers = [
    {
      endpoint: `${apiUrl}/blogs`,
      extract: (json) => json?.data?.blogs ?? [],
      map: (item) =>
        item.slug
          ? { url: `/${item.slug}`, changefreq: "weekly", priority: 0.6 }
          : null,
    },
    {
      endpoint: `${apiUrl}/courses`,
      extract: (json) => json?.data ?? [],
      map: (item) =>
        item.slug
          ? {
              url: `/courses/${item.slug}`,
              changefreq: "weekly",
              priority: 0.7,
            }
          : null,
    },
    {
      endpoint: `${apiUrl}/products`,
      extract: (json) => json?.data ?? [],
      map: (item) =>
        item.slug
          ? {
              url: `/product/${item.slug}`,
              changefreq: "weekly",
              priority: 0.7,
            }
          : null,
    },
    {
      endpoint: `${apiUrl}/report`,
      extract: (json) => json?.data ?? [],
      map: (item) =>
        item._id
          ? {
              url: `/personalized-astrology-reports/${item.slug}`,
              changefreq: "monthly",
              priority: 0.6,
            }
          : null,
    },
  ];

  await Promise.allSettled(
    fetchers.map(async ({ endpoint, extract, map }) => {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const items = extract(json);
        items.forEach((item) => {
          const route = map(item);
          if (route) routes.push(route);
        });
        console.info(`[sitemap] ${items.length} routes from ${endpoint}`);
      } catch (e) {
        console.warn(`[sitemap] Skipped ${endpoint} — ${e.message}`);
      }
    }),
  );

  return routes;
}

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:3000/api/v1";

  const dynamicRoutes =
    command === "build" ? await fetchDynamicRoutes(apiUrl) : [];

  const allRoutes = [...staticRoutes, ...dynamicRoutes];
  const allPaths = allRoutes.map((r) => r.url);
  const changefreqMap = Object.fromEntries(
    allRoutes.map((r) => [r.url, r.changefreq]),
  );
  const priorityMap = Object.fromEntries(
    allRoutes.map((r) => [r.url, r.priority]),
  );

  return {
    plugins: [
      previewCacheHeadersPlugin(),
      deferNonCriticalCSS(),
      injectApiPreconnect(apiUrl),
      react(),
      tailwindcss(),
      ...(command === "build"
        ? [
            sitemap({
              hostname: HOSTNAME,
              dynamicRoutes: allPaths, // string[] — fixes the TypeError
              changefreq: changefreqMap, // { path → changefreq }
              priority: priorityMap, // { path → priority }
              readable: true,
            }),
          ]
        : []),
    ],
    build: {
      cssCodeSplit: true,
      sourcemap: false,
      minify: "esbuild",
      cssMinify: true,
      reportCompressedSize: false, // speeds up build; gzip sizes checked via nginx
      chunkSizeWarningLimit: 500,
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;

            const pkg = id.match(
              /node_modules[/\\]((?:@[^/\\]+[/\\])?[^/\\]+)/,
            )?.[1];

            if (!pkg) return "vendor";

            // React core
            if (["react", "react-dom", "scheduler", "react-is"].includes(pkg)) {
              return "vendor-react";
            }

            // React Router + Remix router
            if (
              [
                "react-router-dom",
                "react-router",
                "@remix-run/router",
              ].includes(pkg)
            ) {
              return "vendor-router";
            }

            // Framer Motion — split so it only loads with lazy pages that use it
            if (pkg === "framer-motion" || pkg.startsWith("framer-")) {
              return "vendor-motion";
            }

            // Swiper
            if (pkg === "swiper") {
              return "vendor-swiper";
            }

            // Phone input — only loaded by phoneInput.js (lazy), keep out of initial bundle
            if (
              [
                "react-phone-input-2",
                "react-phone-number-input",
                "libphonenumber-js",
              ].includes(pkg)
            ) {
              return undefined;
            }

            // SEO helmet — only used by lazy pages
            if (pkg === "react-helmet-async") {
              return undefined;
            }

            // Everything else (axios, zustand, lucide-react, react-hot-toast, etc.)
            return "vendor";
          },
        },
      },
    },
    optimizeDeps: {
      include: ["react-phone-input-2"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
      allowedHosts: true,
    },
  };
});
