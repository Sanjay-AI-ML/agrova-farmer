import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLANT_CLASSES,
  ADVISORY_RULES,
  findAdvice,
  sprayRequirement,
  SAFETY_MESSAGES
} from '../dist/crop-advisory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Plant disease model includes 38 classes', () => {
  assert.equal(PLANT_CLASSES.length, 38);
  assert.ok(PLANT_CLASSES.includes('Tomato___Early_blight'));
  assert.ok(PLANT_CLASSES.includes('Potato___Late_blight'));
  assert.ok(PLANT_CLASSES.includes('Apple___Apple_scab'));
  assert.ok(PLANT_CLASSES.includes('Tomato___healthy'));
});

test('Crop advisory model matches fungal, bacterial, oomycete, and mite conditions', () => {
  const tomatoBlight = findAdvice('Tomato___Early_blight', 'en');
  assert.equal(tomatoBlight.status, 'disease_detected');
  assert.equal(tomatoBlight.crop, 'tomato');
  assert.equal(tomatoBlight.kind, 'fungal');
  assert.ok(tomatoBlight.candidates.includes('mancozeb'));
  assert.ok(tomatoBlight.action.length > 0);

  const potatoLate = findAdvice('Potato___Late_blight', 'en');
  assert.equal(potatoLate.kind, 'oomycete');
  assert.ok(potatoLate.action.includes('URGENT'));

  const healthy = findAdvice('Tomato___healthy', 'en');
  assert.equal(healthy.status, 'healthy');
  assert.equal(healthy.candidates.length, 0);

  const unknown = findAdvice('Banana___Panama', 'en');
  assert.equal(unknown.status, 'unmatched');
});

test('Crop advisory provides localized safety in English, Tamil, and Hindi', () => {
  for (const lang of ['en', 'ta', 'hi']) {
    const adv = findAdvice('Tomato___Early_blight', lang);
    assert.ok(adv.safety && adv.safety.length > 10);
    assert.equal(adv.safety, SAFETY_MESSAGES[lang]);
  }
});

test('Spray requirement calculates dosage and rover tank requirements', () => {
  // 2.0 g/L dose, 0.25 ha area, 400 L/ha water rate, 16 L rover tank
  const res = sprayRequirement(2.0, 0.25, 400, 16, 'g');
  assert.equal(res.waterTotal, '100 L');
  assert.equal(res.productTotal, '200.0 g');
  assert.equal(res.perTank, '32.0 g in 16 L tank');
  assert.equal(res.tanksNeeded, 7); // ceil(100 / 16) = 7
  assert.equal(res.raw.dose_per_tank_val ?? res.raw.perTank, 32.0);
});

test('Model checkpoint and metadata exist in models directory', () => {
  const modelsDir = path.join(rootDir, 'models');
  assert.ok(fs.existsSync(path.join(modelsDir, 'shufflenet_v2_x0_5-model-63.pth')));
  assert.ok(fs.existsSync(path.join(modelsDir, 'labels.json')));
  assert.ok(fs.existsSync(path.join(modelsDir, 'advisory.json')));
  assert.ok(fs.existsSync(path.join(modelsDir, 'plant_disease_model.py')));
  assert.ok(fs.existsSync(path.join(modelsDir, 'crop_advisory.py')));
  assert.ok(fs.existsSync(path.join(modelsDir, 'README.md')));

  const stat = fs.statSync(path.join(modelsDir, 'shufflenet_v2_x0_5-model-63.pth'));
  assert.ok(stat.size > 1900000); // ~1.99 MB checkpoint
});
