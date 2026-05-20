const fs = require("fs");
const http = require("http");
const path = require("path");

const port = Number(process.env.PORT) || 19006;
const host = process.env.HOST || "127.0.0.1";
const distRoot = path.resolve(__dirname, "..", "dist");

const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(contents);
  });
}

http
  .createServer((req, res) => {
    const requestedPath = decodeURIComponent(req.url.split("?")[0]);
    const normalizedPath =
      requestedPath === "/" || requestedPath === "" ? "/index.html" : requestedPath;
    const filePath = path.join(distRoot, normalizedPath);

    if (!filePath.startsWith(distRoot)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath);
      return;
    }

    sendFile(res, path.join(distRoot, "index.html"));
  })
  .listen(port, host, () => {
    console.log(`Serving ${distRoot} at http://${host}:${port}`);
  });
