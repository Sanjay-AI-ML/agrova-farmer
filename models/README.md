# Agrova Machine Learning Models

This directory contains the edge intelligence models for the Agrova autonomous agricultural rover system:

1. **Model 1: Plant Disease Classification Model** (`plant_disease_model.py`, `shufflenet_v2_x0_5-model-63.pth`, `labels.json`)
2. **Model 2: Crop Treatment Advisory Model** (`crop_advisory.py`, `advisory.json`)

---

## 1. Model 1: Plant Disease Classification (ShuffleNet V2 x0.5)

### Overview
A lightweight convolutional neural network optimized for low-latency inference on the rover's onboard edge computer (e.g., Raspberry Pi 5, Jetson Orin Nano).

- **Architecture:** ShuffleNet V2 ($0.5\times$ width multiplier)
- **Input Resolution:** $224 \times 224 \times 3$ (RGB)
- **Normalization:** ImageNet mean `[0.485, 0.456, 0.406]` and std `[0.229, 0.224, 0.225]`
- **Classes:** 38 crop condition classes across 14 crops (Apple, Blueberry, Cherry, Corn, Grape, Orange, Peach, Bell Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato).
- **Weights Checkpoint:** `shufflenet_v2_x0_5-model-63.pth` ($\approx 2.0\text{ MB}$)
- **Target Runtime:** ONNX Runtime / PyTorch C++ / TensorRT.

### Export to ONNX
```python
from pathlib import Path
from plant_disease_model import export_onnx

export_onnx(Path("plant_shufflenet_v2_x0_5.onnx"))
```

---

## 2. Model 2: Crop Treatment Advisory Model

### Overview
A rule-grounded agronomic advisory model designed to prevent automated chemical misuse and provide safe, regulated treatment recommendations and precise spray tank dosage calculations.

### Features
- **Pathogen Identification:** Categorizes detections into fungal, bacterial, oomycete, virus-vector, trunk, and mite conditions.
- **Candidate Active Ingredients:** Lists vetted chemical options (e.g., mancozeb, copper oxychloride, captan, chlorothalonil, abamectin) aligned with CIBRC (Central Insecticides Board & Registration Committee, India) guidelines.
- **Spray Tank Dosage Calculator:** Calculates exact spray volume and product quantities based on:
  - $\text{Total Water (L)} = \text{Water Rate (L/ha)} \times \text{Field Area (ha)}$
  - $\text{Total Product} = \text{Label Dose per Litre} \times \text{Total Water}$
  - $\text{Dose per Rover Tank} = \text{Label Dose per Litre} \times \text{Tank Volume (16 L)}$
- **Regulatory & Safety Safeguards:** Strict refusal to prescribe arbitrary doses without verified label recommendations; mandatory PPE and weather interlocks.

### Usage Example
```python
from crop_advisory import find_advice, spray_requirement

# 1. Lookup agronomic advice
advice = find_advice("Tomato___Early_blight")
print(advice["action"])
# -> "Remove lower infected leaves; stake plants; protectant fungicide."
print(advice["candidates"])
# -> ['mancozeb', 'chlorothalonil']

# 2. Calculate spray requirements for a 0.5 ha field with a 16 L rover tank
calc = spray_requirement(label_dose_per_litre=2.0, area_ha=0.5, water_l_per_ha=400, tank_l=16, unit='g')
print(calc["product_total"])  # 400.0 g
print(calc["per_tank"])       # 32.0 g in 16 L tank
```

---

## Web Client Integration

Both models are also exposed to the client-side Agrova Farmer web interface via `dist/crop-advisory.js`, enabling real-time advice lookup and tank dose calculations directly on the farmer's mobile device or dashboard without requiring a continuous cloud backend.
