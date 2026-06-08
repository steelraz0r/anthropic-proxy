const https = require("https");
const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {

  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Anthropic proxy OK");
    return;
  }

  if (req.method !== "POST" || req.url !== "/v1/messages") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {

    const apiKey = req.headers["x-api-key"] || "";
    const anthropicVersion = req.headers["anthropic-version"] || "2023-06-01";

    const options = {
      hostname: "api.anthropic.com",
      port: 443,
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const proxyReq = https.request(options, proxyRes => {
      res.writeHead(proxyRes.statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      proxyRes.pipe(res);
    });

    proxyReq.on("error", err => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log("Proxy running on port " + PORT);
});
