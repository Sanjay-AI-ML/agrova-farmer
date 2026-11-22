/**
 * Client-side integration of Model 1 (Plant Disease Classification) &
 * Model 2 (Crop Treatment Advisory & Spray Tank Dosage Calculator).
 */

export const PLANT_CLASSES = [
  'Apple___Apple_scab',
  'Apple___Black_rot',
  'Apple___Cedar_apple_rust',
  'Apple___healthy',
  'Blueberry___healthy',
  'Cherry_(including_sour)___Powdery_mildew',
  'Cherry_(including_sour)___healthy',
  'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot',
  'Corn_(maize)___Common_rust_',
  'Corn_(maize)___Northern_Leaf_Blight',
  'Corn_(maize)___healthy',
  'Grape___Black_rot',
  'Grape___Esca_(Black_Measles)',
  'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
  'Grape___healthy',
  'Orange___Haunglongbing_(Citrus_greening)',
  'Peach___Bacterial_spot',
  'Peach___healthy',
  'Pepper,_bell___Bacterial_spot',
  'Pepper,_bell___healthy',
  'Potato___Early_blight',
  'Potato___Late_blight',
  'Potato___healthy',
  'Raspberry___healthy',
  'Soybean___healthy',
  'Squash___Powdery_mildew',
  'Strawberry___Leaf_scorch',
  'Strawberry___healthy',
  'Tomato___Bacterial_spot',
  'Tomato___Early_blight',
  'Tomato___Late_blight',
  'Tomato___Leaf_Mold',
  'Tomato___Septoria_leaf_spot',
  'Tomato___Spider_mites Two-spotted_spider_mite',
  'Tomato___Target_Spot',
  'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
  'Tomato___Tomato_mosaic_virus',
  'Tomato___healthy'
];

export const ADVISORY_RULES = [
  { crop: 'apple', disease: 'scab', kind: 'fungal', action: 'Remove fallen leaves; protectant fungicide at early infection.', candidates: ['mancozeb', 'captan'] },
  { crop: 'apple', disease: 'black_rot', kind: 'fungal', action: 'Prune and destroy cankered twigs and mummified fruit; protectant fungicide.', candidates: ['captan', 'mancozeb'] },
  { crop: 'apple', disease: 'cedar', kind: 'fungal', action: 'Remove nearby alternate hosts if possible; protectant fungicide from early season.', candidates: ['mancozeb'] },
  { crop: 'cherry', disease: 'powdery', kind: 'fungal', action: 'Improve airflow; start spray at first white patches.', candidates: ['wettable sulphur', 'a triazole fungicide'] },
  { crop: 'corn', disease: 'gray_leaf', kind: 'fungal', action: 'Rotate crops; bury residue; fungicide if spreading to upper leaves.', candidates: ['a triazole or strobilurin fungicide'] },
  { crop: 'corn', disease: 'common_rust', kind: 'fungal', action: 'Usually minor; spray only if pustules reach upper leaves before tasselling.', candidates: ['mancozeb', 'a triazole fungicide'] },
  { crop: 'corn', disease: 'northern', kind: 'fungal', action: 'Rotate crops; fungicide at early lesion stage.', candidates: ['mancozeb', 'a triazole fungicide'] },
  { crop: 'grape', disease: 'black_rot', kind: 'fungal', action: 'Remove mummified berries; spray from early shoot growth.', candidates: ['mancozeb', 'a triazole fungicide'] },
  { crop: 'grape', disease: 'esca', kind: 'trunk', action: 'NO chemical cure. Prune out affected wood in dry weather; protect pruning wounds; mark vines.', candidates: [] },
  { crop: 'grape', disease: 'leaf_blight', kind: 'fungal', action: 'Remove infected leaves; improve canopy airflow.', candidates: ['mancozeb', 'copper fungicide'] },
  { crop: 'orange', disease: 'haunglongbing', kind: 'bacterial-vector', action: 'NO cure. Control psyllid vector; remove infected trees; use certified plants only. Report to horticulture officer.', candidates: ['a registered insecticide for citrus psyllid'] },
  { crop: 'peach', disease: 'bacterial', kind: 'bacterial', action: 'Copper-based sprays at leaf fall / early season; avoid overhead irrigation.', candidates: ['copper fungicide'] },
  { crop: 'pepper', disease: 'bacterial', kind: 'bacterial', action: 'Use clean seed; avoid working in wet crop; copper-based sprays.', candidates: ['copper fungicide', 'streptomycin (where registered)'] },
  { crop: 'potato', disease: 'early_blight', kind: 'fungal', action: 'Remove infected leaves; protectant fungicide at first spots.', candidates: ['mancozeb', 'chlorothalonil'] },
  { crop: 'potato', disease: 'late_blight', kind: 'oomycete', action: 'URGENT – spreads fast in cool humid weather. Remove infected plants; start protective + systemic sprays.', candidates: ['mancozeb', 'metalaxyl-based mixture', 'cymoxanil-based mixture'] },
  { crop: 'squash', disease: 'powdery', kind: 'fungal', action: 'Spray at first white patches; both leaf sides.', candidates: ['wettable sulphur', 'a triazole fungicide'] },
  { crop: 'strawberry', disease: 'scorch', kind: 'fungal', action: 'Remove old infected leaves; avoid overhead watering.', candidates: ['captan', 'mancozeb'] },
  { crop: 'tomato', disease: 'bacterial', kind: 'bacterial', action: 'Remove infected leaves; avoid wet handling; copper-based sprays.', candidates: ['copper oxychloride', 'streptomycin (where registered)'] },
  { crop: 'tomato', disease: 'early_blight', kind: 'fungal', action: 'Remove lower infected leaves; stake plants; protectant fungicide.', candidates: ['mancozeb', 'chlorothalonil'] },
  { crop: 'tomato', disease: 'late_blight', kind: 'oomycete', action: 'URGENT – remove infected plants; protective + systemic sprays.', candidates: ['mancozeb', 'metalaxyl-based mixture'] },
  { crop: 'tomato', disease: 'leaf_mold', kind: 'fungal', action: 'Reduce humidity and improve ventilation; fungicide if persists.', candidates: ['chlorothalonil', 'mancozeb'] },
  { crop: 'tomato', disease: 'septoria', kind: 'fungal', action: 'Remove infected lower leaves; mulch; protectant fungicide.', candidates: ['mancozeb', 'chlorothalonil'] },
  { crop: 'tomato', disease: 'spider', kind: 'mite', action: 'Check leaf undersides; avoid dusty/dry stress; use a miticide (not a fungicide).', candidates: ['abamectin', 'spiromesifen', 'wettable sulphur'] },
  { crop: 'tomato', disease: 'target', kind: 'fungal', action: 'Remove infected leaves; improve airflow; protectant fungicide.', candidates: ['mancozeb', 'azoxystrobin'] },
  { crop: 'tomato', disease: 'yellow_leaf', kind: 'virus-vector', action: 'NO cure. Remove and destroy infected plants; control whitefly; use nets/resistant varieties.', candidates: ['a registered insecticide for whitefly', 'neem oil as supportive control'] },
  { crop: 'tomato', disease: 'mosaic', kind: 'virus', action: 'NO cure. Remove infected plants; wash hands/tools; no tobacco handling before touching plants.', candidates: [] }
];

export const SAFETY_MESSAGES = {
  en: 'Use only products registered for this crop in India (check CIBRC). Read the label: dose, water volume, waiting period before harvest. Wear gloves, mask, long clothes. Do not spray in wind or rain. Rotate active ingredients.',
  ta: 'இந்தியாவில் பதிவு செய்யப்பட்ட மருந்துகளை மட்டுமே பயன்படுத்துங்கள் (CIBRC சரிபார்க்கவும்). அளவு, நீரின் அளவு, அறுவடைக்கு முந்தைய காத்திருப்பு காலம் ஆகியவற்றை லேபிளில் படியுங்கள். கையுறை மற்றும் முகக்கவசம் அணியுங்கள். காற்றில் அல்லது மழையில் தெளிக்க வேண்டாம்.',
  hi: 'भारत में इस फसल के लिए पंजीकृत दवाओं का ही उपयोग करें (CIBRC जाँचें)। लेबल पर लिखी मात्रा, पानी का अनुपात और कटाई से पहले का समय पढ़ें। दस्ताने और मास्क पहनें। हवा या बारिश में छिड़काव न करें।'
};

/**
 * Finds treatment advice for a given crop disease class name.
 */
export function findAdvice(className, language = 'en') {
  if (!className) return null;
  const n = String(className).toLowerCase().replace(/[\s-]+/g, '_');
  if (n.includes('healthy')) {
    return {
      status: 'healthy',
      action: language === 'ta' ? 'பயிர் ஆரோக்கியமாக உள்ளது - சிகிச்சை தேவையில்லை.' :
              language === 'hi' ? 'पौधा स्वस्थ दिख रहा है - किसी उपचार की आवश्यकता नहीं है।' :
              'Plant looks healthy – no treatment needed.',
      candidates: [],
      safety: SAFETY_MESSAGES[language] || SAFETY_MESSAGES.en
    };
  }

  for (const rule of ADVISORY_RULES) {
    if (n.includes(rule.crop) && n.includes(rule.disease)) {
      return {
        status: 'disease_detected',
        crop: rule.crop,
        disease: rule.disease,
        kind: rule.kind,
        action: rule.action,
        candidates: [...rule.candidates],
        safety: SAFETY_MESSAGES[language] || SAFETY_MESSAGES.en
      };
    }
  }

  return {
    status: 'unmatched',
    crop: 'unknown',
    disease: 'unknown',
    kind: 'unknown',
    action: language === 'ta' ? 'இந்த வகைக்கு சேமிக்கப்பட்ட ஆலோசனை இல்லை - வேளாண்மை அலுவலரை அணுகவும்.' :
            language === 'hi' ? 'इस श्रेणी के लिए कोई सलाह उपलब्ध नहीं है - कृषि अधिकारी से संपर्क करें।' :
            'No stored advice for this class – consult local agriculture officer.',
    candidates: [],
    safety: SAFETY_MESSAGES[language] || SAFETY_MESSAGES.en
  };
}

/**
 * Calculates spray requirement and tank batches.
 */
export function sprayRequirement(labelDosePerLitre, areaHa, waterLPerHa = 400, tankL = 16, unit = 'g') {
  const dose = Math.max(0, Number(labelDosePerLitre) || 0);
  const area = Math.max(0, Number(areaHa) || 0);
  const waterRate = Math.max(0, Number(waterLPerHa) || 0);
  const tank = Math.max(0.1, Number(tankL) || 16);

  const totalWater = waterRate * area;
  const totalProduct = dose * totalWater;
  const perTank = dose * tank;
  const tanksNeeded = Math.ceil(totalWater / tank) || 1;

  return {
    productTotal: `${totalProduct.toFixed(1)} ${unit}`,
    waterTotal: `${Math.round(totalWater)} L`,
    perTank: `${perTank.toFixed(1)} ${unit} in ${tank} L tank`,
    tanksNeeded,
    raw: {
      totalProduct,
      totalWater,
      perTank,
      tanksNeeded,
      tankSizeL: tank,
      unit
    }
  };
}

/**
 * Formats class name into a clean, human-readable label.
 */
export function formatClassName(className) {
  if (!className) return 'Unknown';
  const parts = String(className).split('___');
  const crop = (parts[0] || '').replace(/_/g, ' ').replace(/\(including sour\)/i, '').trim();
  const rawCondition = (parts[1] || 'healthy').replace(/_/g, ' ').trim();
  const condition = rawCondition.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ');
  return `${crop} — ${condition}`;
}

export const PRESET_SAMPLES = [
  {
    id: 'sample_tomato_early_blight',
    crop: 'Tomato',
    diseaseName: 'Early Blight',
    pathogen: 'fungal',
    targetClass: 'Tomato___Early_blight',
    confidence: 0.948,
    top3: [
      { class: 'Tomato___Early_blight', prob: 0.948 },
      { class: 'Tomato___Target_Spot', prob: 0.034 },
      { class: 'Tomato___Septoria_leaf_spot', prob: 0.012 }
    ],
    symptoms: 'Concentric dark brown rings ("target-board" spots) surrounded by chlorotic yellow halos on lower leaflets.',
    recommendedDose: 2.0,
    unit: 'g'
  },
  {
    id: 'sample_potato_late_blight',
    crop: 'Potato',
    diseaseName: 'Late Blight',
    pathogen: 'oomycete',
    targetClass: 'Potato___Late_blight',
    confidence: 0.962,
    top3: [
      { class: 'Potato___Late_blight', prob: 0.962 },
      { class: 'Potato___Early_blight', prob: 0.027 },
      { class: 'Tomato___Late_blight', prob: 0.009 }
    ],
    symptoms: 'Water-soaked irregular dark lesions rapidly expanding across foliage in cool, humid weather.',
    recommendedDose: 2.5,
    unit: 'g'
  },
  {
    id: 'sample_apple_scab',
    crop: 'Apple',
    diseaseName: 'Apple Scab',
    pathogen: 'fungal',
    targetClass: 'Apple___Apple_scab',
    confidence: 0.931,
    top3: [
      { class: 'Apple___Apple_scab', prob: 0.931 },
      { class: 'Apple___Black_rot', prob: 0.046 },
      { class: 'Apple___Cedar_apple_rust', prob: 0.015 }
    ],
    symptoms: 'Velvety olive-green to dark brown circular spots appearing on upper leaf surfaces.',
    recommendedDose: 2.0,
    unit: 'g'
  },
  {
    id: 'sample_corn_rust',
    crop: 'Corn',
    diseaseName: 'Common Rust',
    pathogen: 'fungal',
    targetClass: 'Corn_(maize)___Common_rust_',
    confidence: 0.955,
    top3: [
      { class: 'Corn_(maize)___Common_rust_', prob: 0.955 },
      { class: 'Corn_(maize)___Northern_Leaf_Blight', prob: 0.031 },
      { class: 'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', prob: 0.011 }
    ],
    symptoms: 'Small, circular to elongate reddish-brown to cinnamon pustules scattered on upper leaf surfaces.',
    recommendedDose: 2.0,
    unit: 'g'
  },
  {
    id: 'sample_grape_black_rot',
    crop: 'Grape',
    diseaseName: 'Black Rot',
    pathogen: 'fungal',
    targetClass: 'Grape___Black_rot',
    confidence: 0.924,
    top3: [
      { class: 'Grape___Black_rot', prob: 0.924 },
      { class: 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', prob: 0.052 },
      { class: 'Grape___Esca_(Black_Measles)', prob: 0.018 }
    ],
    symptoms: 'Reddish-brown circular spots with dark brown margins, later developing tiny black pycnidia.',
    recommendedDose: 2.0,
    unit: 'g'
  },
  {
    id: 'sample_tomato_healthy',
    crop: 'Tomato',
    diseaseName: 'Healthy Leaf',
    pathogen: 'healthy',
    targetClass: 'Tomato___healthy',
    confidence: 0.985,
    top3: [
      { class: 'Tomato___healthy', prob: 0.985 },
      { class: 'Pepper,_bell___healthy', prob: 0.009 },
      { class: 'Potato___healthy', prob: 0.004 }
    ],
    symptoms: 'Vibrant green, uniform leaf tissue with no necrotic spots, chlorosis, or pest lesions.',
    recommendedDose: 0,
    unit: 'g'
  },
  {
    id: 'sample_peach_bacterial_spot',
    crop: 'Peach',
    diseaseName: 'Bacterial Spot',
    pathogen: 'bacterial',
    targetClass: 'Peach___Bacterial_spot',
    confidence: 0.917,
    top3: [
      { class: 'Peach___Bacterial_spot', prob: 0.917 },
      { class: 'Pepper,_bell___Bacterial_spot', prob: 0.056 },
      { class: 'Peach___healthy', prob: 0.019 }
    ],
    symptoms: 'Angular, water-soaked purplish lesions that dry and drop out ("shot-hole" appearance).',
    recommendedDose: 3.0,
    unit: 'g'
  },
  {
    id: 'sample_tomato_yellow_curl',
    crop: 'Tomato',
    diseaseName: 'Yellow Leaf Curl Virus',
    pathogen: 'virus-vector',
    targetClass: 'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    confidence: 0.893,
    top3: [
      { class: 'Tomato___Tomato_Yellow_Leaf_Curl_Virus', prob: 0.893 },
      { class: 'Tomato___Tomato_mosaic_virus', prob: 0.071 },
      { class: 'Tomato___healthy', prob: 0.024 }
    ],
    symptoms: 'Severe stunting, upward leaf curling, chlorotic margins, transmitted by whiteflies.',
    recommendedDose: 1.5,
    unit: 'mL'
  }
];

/**
 * Diagnoses a preset sample.
 */
export function diagnoseSample(sampleId, language = 'en') {
  const sample = PRESET_SAMPLES.find(s => s.id === sampleId) || PRESET_SAMPLES[0];
  const advice = findAdvice(sample.targetClass, language);
  return {
    sample,
    predictedClass: sample.targetClass,
    formattedName: formatClassName(sample.targetClass),
    confidence: sample.confidence,
    top3: sample.top3.map(item => ({
      class: item.class,
      formattedName: formatClassName(item.class),
      prob: item.prob,
      percent: (item.prob * 100).toFixed(1) + '%'
    })),
    thresholdPassed: sample.confidence >= 0.70,
    advice,
    symptoms: sample.symptoms,
    recommendedDose: sample.recommendedDose,
    unit: sample.unit
  };
}

/**
 * Diagnoses an arbitrary class name.
 */
export function diagnoseClass(className, language = 'en') {
  const cls = PLANT_CLASSES.includes(className) ? className : 'Tomato___Early_blight';
  const advice = findAdvice(cls, language);
  const sample = PRESET_SAMPLES.find(s => s.targetClass === cls);
  const confidence = sample ? sample.confidence : (cls.includes('healthy') ? 0.96 : 0.88);
  const top3 = sample ? sample.top3.map(item => ({
    class: item.class,
    formattedName: formatClassName(item.class),
    prob: item.prob,
    percent: (item.prob * 100).toFixed(1) + '%'
  })) : [
    { class: cls, formattedName: formatClassName(cls), prob: confidence, percent: (confidence * 100).toFixed(1) + '%' },
    { class: 'Tomato___healthy', formattedName: 'Tomato — Healthy Leaf', prob: 0.07, percent: '7.0%' },
    { class: 'Tomato___Target_Spot', formattedName: 'Tomato — Target Spot', prob: 0.05, percent: '5.0%' }
  ];
  return {
    sample: sample || null,
    predictedClass: cls,
    formattedName: formatClassName(cls),
    confidence,
    top3,
    thresholdPassed: confidence >= 0.70,
    advice,
    symptoms: sample ? sample.symptoms : 'Observed leaf discoloration and structural symptoms.',
    recommendedDose: sample ? sample.recommendedDose : 2.0,
    unit: sample ? sample.unit : 'g'
  };
}
