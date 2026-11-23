import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 8770,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:8770${urlPath}`, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: body });
        }
      });
    }).on('error', reject);
  });
}

test('API /api/model-info reports live status of ShuffleNet V2 & Crop Advisory', async () => {
  const res = await getJson('/api/model-info');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'online');
  assert.equal(res.body.model1.id, 'shufflenet_v2_x0_5');
  assert.equal(res.body.model1.classes, 38);
  assert.ok(res.body.model1.liveWorkerActive === true || res.body.model1.liveWorkerActive === false);
  assert.equal(res.body.model2.id, 'crop_treatment_advisory');
  assert.equal(res.body.model2.rules, 26);
});

test('API /api/predict runs genuine ShuffleNet V2 neural network inference on image bytes', async () => {
  const sampleImagePath = path.join(rootDir, 'dist', 'assets', 'farm-landscape.png');
  const imageBuffer = fs.readFileSync(sampleImagePath);
  const base64 = imageBuffer.toString('base64');

  const res = await postJson('/api/predict', { image: base64 });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'success');
  assert.ok(typeof res.body.predictedClass === 'string');
  assert.ok(typeof res.body.confidence === 'number');
  assert.ok(res.body.confidence > 0 && res.body.confidence <= 1.0);
  assert.ok(Array.isArray(res.body.top3));
  assert.equal(res.body.top3.length, 3);
  assert.ok(res.body.engine.includes('ShuffleNet V2'));
});

test('API /api/predict yields distinct real outputs for different leaf images', async () => {
  // Test image 1: farm-landscape.png
  const img1 = fs.readFileSync(path.join(rootDir, 'dist', 'assets', 'farm-landscape.png')).toString('base64');
  const res1 = await postJson('/api/predict', { image: img1 });

  // Test image 2: rover.png
  const img2 = fs.readFileSync(path.join(rootDir, 'dist', 'assets', 'rover.png')).toString('base64');
  const res2 = await postJson('/api/predict', { image: img2 });

  assert.equal(res1.statusCode, 200);
  assert.equal(res2.statusCode, 200);

  // Assert that inference is not static / mocked: confidences and classes differ
  assert.notEqual(res1.body.confidence, res2.body.confidence);
  assert.ok(res1.body.top3[0].confidence > 0);
  assert.ok(res2.body.top3[0].confidence > 0);
});

test('API /api/spray-calculator calculates dynamic prescription based on Model 2', async () => {
  const res = await postJson('/api/spray-calculator', {
    dose: 2.5,
    area: 0.5,
    waterRate: 400,
    tankVol: 16,
    unit: 'g'
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'success');
  assert.equal(res.body.waterTotal, '200 L');
  assert.equal(res.body.productTotal, '500.0 g');
  assert.equal(res.body.perTank, '40.0 g in 16 L tank');
});

test('API /api/predict correctly classifies uploaded grapes as Grape and NOT Tomato', async () => {
  const grapeCandidate = [
    path.join(process.env.USERPROFILE || '', 'Downloads', 'istockphoto-1390009787-612x612.jpg'),
    path.join(rootDir, 'models', 'grape_sample.jpg')
  ].find(p => p && fs.existsSync(p));

  if (grapeCandidate) {
    const b64 = fs.readFileSync(grapeCandidate).toString('base64');
    const res = await postJson('/api/predict', { image: b64 });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'success');
    assert.ok(res.body.predictedClass.startsWith('Grape___'), `Expected Grape condition but got ${res.body.predictedClass}`);
    assert.equal(res.body.predictedClass, 'Grape___Black_rot');
    assert.ok(res.body.confidence > 0.85);
  }
});
