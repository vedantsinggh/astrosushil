import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import process from "node:process";
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

// Testing deployment (infrastructure/testing/docs/frontend-builds.md). Only
// VITE_DEPLOY_ENV=testing changes anything; production builds leave it unset.
function assertTestingApiUrl(apiUrl) {
  if (!apiUrl) {
    throw new Error(
      "[testing build] VITE_API_URL is required when VITE_DEPLOY_ENV=testing (use /api/v1).",
    );
  }
  let host = "";
  try {
    host = new URL(apiUrl).hostname.toLowerCase();
  } catch {
    host = ""; // relative URL such as /api/v1: same origin, allowed
  }
  if (host === "astrosushil.com" || host.endsWith(".astrosushil.com")) {
    throw new Error(
      `[testing build] VITE_API_URL must not point at the production API (${host}).`,
    );
  }
}

function testingHtml({ isTesting, noindex }) {
  return {
    name: "testing-html",
    apply: "build",
    transformIndexHtml(html) {
      let out = html;
      if (noindex) {
        const robots = /<meta name="robots" content="[^"]*"\s*\/?>/;
        const tag = '<meta name="robots" content="noindex, nofollow" />';
        out = robots.test(out)
          ? out.replace(robots, tag)
          : out.replace("<meta charset", `${tag}\n    <meta charset`);
      }
      if (isTesting) {
        // Keep testing traffic out of the client's Google Ads, GTM, Clarity and Meta Pixel data.
        const trigger = "setTimeout(loadTrackers, delay);";
        if (out.split(trigger).length !== 2) {
          throw new Error(
            "[testing build] tracker loader not found in index.html; update testingHtml in vite.config.js.",
          );
        }
        out = out.replace(
          trigger,
          "/* trackers disabled: VITE_DEPLOY_ENV=testing */",
        );
        // The inline banner prefetch falls back to the production API when VITE_API_URL is
        // missing. assertTestingApiUrl makes that branch unreachable; rewrite it to same-origin so
        // the built HTML holds no production API host at all.
        out = out.split('"https://api.astrosushil.com/api/v1"').join('"/api/v1"');
      }
      return out;
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
      extract: (json) => json?.data?.items ?? [],
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
      extract: (json) => json?.data?.products ?? [],
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
  const isTesting = env.VITE_DEPLOY_ENV === "testing";
  const noindex = env.VITE_NOINDEX === "true";
  if (isTesting && command === "build") assertTestingApiUrl(env.VITE_API_URL);
  const apiUrl = env.VITE_API_URL || "http://localhost:3000/api/v1";

  // Testing builds skip the sitemap: it lists production URLs and fetches routes from the API.
  const withSitemap = command === "build" && !isTesting;
  const dynamicRoutes = withSitemap ? await fetchDynamicRoutes(apiUrl) : [];

  const allRoutes = [...staticRoutes, ...dynamicRoutes];
  const allPaths = allRoutes.map((r) => r.url);
  const changefreqMap = Object.fromEntries(
    allRoutes.map((r) => [r.url, r.changefreq]),
  );
  const priorityMap = Object.fromEntries(
    allRoutes.map((r) => [r.url, r.priority]),
  );

  return {
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": path.resolve(__dirname, "./src"),
        react: fileURLToPath(new URL("./node_modules/react", import.meta.url)),
        "react-dom": fileURLToPath(new URL("./node_modules/react-dom", import.meta.url)),
      },
    },
    optimizeDeps: {
      include: ["react-phone-input-2"],
      rolldownOptions: {
        plugins: [
          {
            name: "force-local-react",
            resolveId(source) {
              const localReact = fileURLToPath(new URL("./node_modules/react", import.meta.url));
              const localReactDom = fileURLToPath(new URL("./node_modules/react-dom", import.meta.url));
              if (source === "react") return path.join(localReact, "index.js");
              if (source === "react/jsx-runtime") return path.join(localReact, "jsx-runtime.js");
              if (source === "react/jsx-dev-runtime") return path.join(localReact, "jsx-dev-runtime.js");
              if (source === "react-dom") return path.join(localReactDom, "index.js");
              if (source === "react-dom/client") return path.join(localReactDom, "client.js");
            },
          },
        ],
      },
    },
    plugins: [
      previewCacheHeadersPlugin(),
      deferNonCriticalCSS(),
      injectApiPreconnect(apiUrl),
      testingHtml({ isTesting, noindex }),
      react(),
      tailwindcss(),
      ...(withSitemap
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
    preview: {
      host: "0.0.0.0",
      port: 4173,
      allowedHosts: true,
    },
  };
});
