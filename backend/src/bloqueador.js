import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

// Lista de sites bloqueados
const blockedSites = ["facebook.com", "youtube.com", "twitter.com"];

// Middleware para bloquear sites
app.use((req, res, next) => {
  const host = req.headers.host;

  if (blockedSites.some(site => host.includes(site))) {
    res.send(`
      <html>
        <head><title>Bloqueado</title></head>
        <body style="font-family:sans-serif;text-align:center;margin-top:20%">
          <h1>🚫 Acesso Bloqueado</h1>
          <p>Você não pode acessar este site.</p>
        </body>
      </html>
    `);
  } else {
    next();
  }
});

// Proxy reverso: encaminha todas as requisições
app.use("/", createProxyMiddleware({
  target: "http://example.com", // destino default (não usado para bloqueados)
  changeOrigin: true,
  router: (req) => {
    // usa o host real da requisição
    return `http://${req.headers.host}`;
  },
  secure: false,
  logLevel: "debug"
}));

app.listen(3005, () => console.log("Proxy rodando em http://localhost:3000"));
