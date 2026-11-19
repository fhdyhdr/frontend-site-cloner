export type ExportTarget = "static" | "vite" | "next";

export const exportTargets: { id: ExportTarget; label: string }[] = [
  { id: "static", label: "Static" },
  { id: "vite", label: "Vite" },
  { id: "next", label: "Next.js" },
];

/** Steps shown in the download progress indicator. */
export const downloadSteps = [
  { id: "prepare", label: "Preparing files" },
  { id: "compress", label: "Compressing ZIP" },
  { id: "save", label: "Saving download" },
  { id: "done", label: "Done" },
] as const;

export type DownloadStep = (typeof downloadSteps)[number]["id"];

const readme = (title: string, body: string, source = "") => `# ${title}

Generated with Site Cloner.${source ? `\n\nSource: ${source}` : ""}

## Getting started

${body}
`;

/** Starter files for each export target. They are real, runnable scaffolds. */
export function buildScaffold(target: ExportTarget, sourceUrl = ""): Record<string, string> {
  const page = `<main class="page">
  <p class="eyebrow">Cloned site</p>
  <h1>Your site is ready</h1>
  <p>Replace this placeholder with the content captured from your source page.</p>
  <a class="button" href="#">Get started</a>
</main>`;
  const pageJsx = `<main className="page">
        <p className="eyebrow">Cloned site</p>
        <h1>Your site is ready</h1>
        <p>Replace this placeholder with the content captured from your source page.</p>
        <a className="button" href="#">Get started</a>
      </main>`;

  if (target === "vite") {
    return {
      "package.json": JSON.stringify({
        name: "site-clone",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        devDependencies: { vite: "^7.0.0" },
      }, null, 2) + "\n",
      "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cloned Site</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`,
      "src/main.js": `import "./style.css";

document.querySelector("#app").innerHTML = \`${page}\`;
`,
      "src/style.css": `:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 system-ui,sans-serif;background:#f7f7f5;color:#18181b}
.page{max-width:640px;margin:0 auto;padding:96px 24px}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#71717a}
h1{font-size:clamp(2rem,5vw,3rem);line-height:1.1;margin:12px 0 16px}
.button{display:inline-block;margin-top:16px;padding:12px 20px;border-radius:10px;background:#18181b;color:#fafafa;text-decoration:none}
`,
      "vite.config.js": `import { defineConfig } from "vite";

export default defineConfig({});
`,
      "README.md": readme("Site clone (Vite)", "```bash\nnpm install\nnpm run dev\nnpm run build\n```", sourceUrl),
    };
  }

  if (target === "next") {
    return {
      "package.json": JSON.stringify({
        name: "site-clone",
        private: true,
        version: "0.0.0",
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: { next: "^15.0.0", react: "^19.0.0", "react-dom": "^19.0.0" },
      }, null, 2) + "\n",
      "next.config.mjs": `/** @type {import("next").NextConfig} */
const nextConfig = {};

export default nextConfig;
`,
      "app/layout.jsx": `import "./globals.css";

export const metadata = {
  title: "Cloned Site",
  description: "Generated with Site Cloner.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      "app/page.jsx": `export default function Home() {
  return (
    ${pageJsx}
  );
}
`,
      "app/globals.css": `:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 system-ui,sans-serif;background:#f7f7f5;color:#18181b}
.page{max-width:640px;margin:0 auto;padding:96px 24px}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#71717a}
h1{font-size:clamp(2rem,5vw,3rem);line-height:1.1;margin:12px 0 16px}
.button{display:inline-block;margin-top:16px;padding:12px 20px;border-radius:10px;background:#18181b;color:#fafafa;text-decoration:none}
`,
      "README.md": readme("Site clone (Next.js)", "```bash\nnpm install\nnpm run dev\n```", sourceUrl),
    };
  }

  return {
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cloned Site</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    ${page}
    <script src="./script.js"></script>
  </body>
</html>
`,
    "styles.css": `:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 system-ui,sans-serif;background:#f7f7f5;color:#18181b}
.page{max-width:640px;margin:0 auto;padding:96px 24px}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#71717a}
h1{font-size:clamp(2rem,5vw,3rem);line-height:1.1;margin:12px 0 16px}
.button{display:inline-block;margin-top:16px;padding:12px 20px;border-radius:10px;background:#18181b;color:#fafafa;text-decoration:none}
`,
    "script.js": `document.querySelector(".button")?.addEventListener("click", (event) => {
  event.preventDefault();
  console.log("Static export ready.");
});
`,
    "README.md": readme("Site clone (static)", "Open `index.html` in a browser, or serve the folder with any static host.", sourceUrl),
  };
}
