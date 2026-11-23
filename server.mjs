import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 8770;
const HOST = '127.0.0.1';
const DIST_DIR = path.join(__dirname, 'dist');
const MODEL_DIR = path.join(__dirname, 'models');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

// Find available python binary
function getPythonBin() {
  const candidates = [
    process.env.PYTHON_BIN,
    'C:\\Users\\vamsh\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
    'python',
    'python3'
  ];
  for (const c of candidates) {
    if (c && (fs.existsSync(c) || c === 'python' || c === 'python3')) {
      return c;
    }
  }
  return 'python';
}

const PYTHON_BIN = getPythonBin();

// Persistent PyTorch Worker for Zero-Latency Inference
let pyWorker = null;
let workerReady = false;
const pendingInferences = [];

function spawnPyWorker() {
  const scriptPath = path.join(MODEL_DIR, 'plant_disease_model.py');
  if (!fs.existsSync(scriptPath)) return;

  try {
    const child = spawn(PYTHON_BIN, [scriptPath, '--worker'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';
    child.stdout.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.status === 'ready') {
            workerReady = true;
            console.log('PyTorch ShuffleNet V2 Model Worker loaded and ready.');
            continue;
          }
          const resolver = pendingInferences.shift();
          if (resolver) resolver.resolve(parsed);
        } catch (err) {
          console.error('PyTorch worker response parse error:', line, err);
        }
      }
    });

    child.stderr.on('data', d => {
      console.warn('[PyTorch Worker log]:', d.toString().trim());
    });

    child.on('exit', code => {
      console.warn(`PyTorch worker exited (code ${code}). Restarting...`);
      workerReady = false;
      pyWorker = null;
      while (pendingInferences.length > 0) {
        const item = pendingInferences.shift();
        item.reject(new Error(`Worker exited with code ${code}`));
      }
      setTimeout(spawnPyWorker, 2000);
    });

    pyWorker = child;
  } catch (err) {
    console.error('Failed to spawn PyTorch worker:', err);
  }
}

// Start worker immediately
spawnPyWorker();

function executeInference(reqData) {
  return new Promise((resolve, reject) => {
    // If worker is running and ready, send request over stdin
    if (pyWorker && !pyWorker.killed && workerReady) {
      const timeout = setTimeout(() => {
        const idx = pendingInferences.findIndex(p => p.resolve === resolve);
        if (idx !== -1) pendingInferences.splice(idx, 1);
        reject(new Error('PyTorch inference timeout (10s)'));
      }, 10000);

      pendingInferences.push({
        resolve: res => { clearTimeout(timeout); resolve(res); },
        reject: err => { clearTimeout(timeout); reject(err); }
      });

      pyWorker.stdin.write(JSON.stringify(reqData) + '\n');
      return;
    }

    // Fallback: spawn one-shot python process
    const scriptPath = path.join(MODEL_DIR, 'plant_disease_model.py');
    const tmpFile = path.join(os.tmpdir(), `leaf_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
    let b64 = reqData.base64 || '';
    if (b64.includes(',')) b64 = b64.split(',')[1];
    fs.writeFileSync(tmpFile, Buffer.from(b64, 'base64'));

    const child = spawn(PYTHON_BIN, [scriptPath, tmpFile], { cwd: __dirname });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    child.on('close', code => {
      try { fs.unlinkSync(tmpFile); } catch (_) {}
      if (code === 0 && stdout.trim()) {
        try {
          const preds = JSON.parse(stdout.trim());
          resolve({
            status: 'success',
            predictedClass: preds[0]?.class || null,
            confidence: preds[0]?.confidence || 0,
            top3: preds
          });
          return;
        } catch (e) {
          reject(e);
          return;
        }
      }
      reject(new Error(`One-shot inference failed (code ${code}): ${stderr}`));
    });
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) { // 25MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  // CORS headers for local dev and rover integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API Endpoints ---
  if (pathname === '/api/model-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      model1: {
        id: 'shufflenet_v2_x0_5',
        name: 'Plant Disease Classifier (ShuffleNet V2 x0.5)',
        framework: 'PyTorch 2.15.0+cpu',
        inputSize: 224,
        classes: 38,
        checkpoint: 'models/shufflenet_v2_x0_5-model-63.pth',
        checkpointBytes: 1998109,
        liveWorkerActive: workerReady
      },
      model2: {
        id: 'crop_treatment_advisory',
        name: 'Crop Treatment & Spray Calculator',
        rules: 26,
        standards: ['CIBRC', 'TNAU Agronomy Guidelines']
      }
    }));
    return;
  }

  if (pathname === '/api/predict' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const imagePayload = body.image || body.base64 || '';
      if (!imagePayload) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Missing image data in request body' }));
        return;
      }

      const result = await executeInference({
        action: 'predict',
        base64: imagePayload,
        top_k: body.top_k || 3
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ...result,
        engine: 'ShuffleNet V2 x0.5 (PyTorch CPU Neural Network)'
      }));
    } catch (err) {
      console.error('Prediction API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  if (pathname === '/api/spray-calculator' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const dose = Number(body.dose) || 2.0;
      const area = Number(body.area) || 0.25;
      const waterRate = Number(body.waterRate) || 400;
      const tankVol = Number(body.tankVol) || 16;
      const unit = body.unit || 'g';

      const totalWater = waterRate * area;
      const totalProduct = dose * totalWater;
      const perTank = dose * tankVol;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        productTotal: `${totalProduct.toFixed(1)} ${unit}`,
        waterTotal: `${totalWater.toFixed(0)} L`,
        perTank: `${perTank.toFixed(1)} ${unit} in ${tankVol} L tank`,
        calculation: { totalProduct, totalWater, perTank, dose, area, waterRate, tankVol, unit }
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // --- Static Files ---
  let targetPath = pathname;
  if (targetPath.endsWith('/')) {
    targetPath += 'index.html';
  }

  const normalizedPath = path.normalize(targetPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(DIST_DIR, normalizedPath);

  // Security check: ensure path is within DIST_DIR
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Internal Server Error: ${err.code}`);
      }
      return;
    }

    if (stats.isDirectory()) {
      res.writeHead(302, { Location: pathname + '/' });
      res.end();
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Agrova Farmer server running at http://${HOST}:${PORT}/`);
  console.log(`Serving files from: ${DIST_DIR}`);
  console.log(`Using Python binary: ${PYTHON_BIN}`);
});
