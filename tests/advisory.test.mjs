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

test('Crop advisory helper functions provide presets, formatting and diagnosis', async () => {
  const { PRESET_SAMPLES, formatClassName, diagnoseSample, diagnoseClass } = await import('../dist/crop-advisory.js');
  assert.ok(PRESET_SAMPLES.length >= 6);
  assert.equal(formatClassName('Tomato___Early_blight'), 'Tomato — Early Blight');
  assert.equal(formatClassName('Apple___Apple_scab'), 'Apple — Apple Scab');

  const diagPreset = diagnoseSample('sample_tomato_early_blight', 'en');
  assert.equal(diagPreset.predictedClass, 'Tomato___Early_blight');
  assert.equal(diagPreset.thresholdPassed, true);
  assert.equal(diagPreset.top3.length, 3);
  assert.ok(diagPreset.top3[0].prob > 0.9);

  const diagClass = diagnoseClass('Potato___Late_blight', 'en');
  assert.equal(diagClass.predictedClass, 'Potato___Late_blight');
  assert.equal(diagClass.thresholdPassed, true);
});

test('Farmer experience renders interactive UI for Model 1 and Model 2', async () => {
  const { createFarmerExperience, FARMER_PAGES } = await import('../dist/farmer.js');
  const { createDemo } = await import('../dist/domain.js');
  const { initializeFarmer } = await import('../dist/farmer-notifications.js');

  assert.ok(FARMER_PAGES.includes('advisor'));
  const demoState = initializeFarmer(createDemo());
  demoState.farmer.onboarded = true;
  demoState.farmer.language = 'en';
  const exp = createFarmerExperience({
    getState: () => demoState,
    save: () => Promise.resolve(),
    render: () => {},
    toast: () => {},
    action: () => {}
  });

  const html = exp.render('advisor');
  // Model 1 assertions
  assert.match(html, /ShuffleNet V2 x0\.5/);
  assert.match(html, /Plant Disease Leaf Scanner/);
  assert.match(html, /data-farm="select-leaf-sample"/);
  assert.match(html, /Tomato/);
  assert.match(html, /Early Blight/);
  assert.match(html, /data-farm="run-model1-scan"/);
  assert.match(html, /data-farm="trigger-leaf-upload"/);
  assert.match(html, /Top-3 Predictions/);

  // Model 2 assertions
  assert.match(html, /Crop Treatment Advisory/);
  assert.match(html, /Rover Spray Tank Dosage Calculator/);
  assert.match(html, /data-farm-input="dose"/);
  assert.match(html, /data-farm-input="area"/);
  assert.match(html, /data-farm-input="waterRate"/);
  assert.match(html, /data-farm-input="tankVol"/);
  assert.match(html, /Total Spray Water/);
  assert.match(html, /Total Chemical Product/);
  assert.match(html, /Rover Tank Refills Needed/);
  assert.match(html, /data-farm="save-spray-plan"/);
});

test('Advisor UI supports Tamil and Hindi localization', async () => {
  const { createFarmerExperience } = await import('../dist/farmer.js');
  const { createDemo } = await import('../dist/domain.js');
  const { initializeFarmer } = await import('../dist/farmer-notifications.js');

  const demoState = initializeFarmer(createDemo());
  demoState.farmer.onboarded = true;

  // Tamil
  demoState.farmer.language = 'ta';
  const expTa = createFarmerExperience({
    getState: () => demoState,
    save: () => Promise.resolve(),
    render: () => {},
    toast: () => {},
    action: () => {}
  });
  const htmlTa = expTa.render('advisor');
  assert.match(htmlTa, /பயிர் மருத்துவர் \/ AI ஆலோசனை/);
  assert.match(htmlTa, /பயிர் இலை நோய் கண்டறிதல்/);
  assert.match(htmlTa, /ரோவர் தெளிப்பு தொட்டி மருந்தளவு கணிப்பொறி/);

  // Hindi
  demoState.farmer.language = 'hi';
  const expHi = createFarmerExperience({
    getState: () => demoState,
    save: () => Promise.resolve(),
    render: () => {},
    toast: () => {},
    action: () => {}
  });
  const htmlHi = expHi.render('advisor');
  assert.match(htmlHi, /फसल डॉक्टर \/ AI सलाह/);
  assert.match(htmlHi, /पत्ती रोग जाँच स्कैनर/);
  assert.match(htmlHi, /रोवर स्प्रे टैंक मात्रा कैलकुलेटर/);
});
