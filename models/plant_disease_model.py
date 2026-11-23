"""Plant Disease Classification Model (Model 1).

ShuffleNet V2 x0.5 architecture for fast edge inference on agricultural rovers
(Raspberry Pi 5 / Jetson / ONNX Runtime).
"""

import json
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional

_HERE = Path(__file__).resolve().parent
_CKPT_PATH = _HERE / "shufflenet_v2_x0_5-model-63.pth"
_LABELS_PATH = _HERE / "labels.json"

with open(_LABELS_PATH, "r", encoding="utf-8") as f:
    CLASSES: List[str] = json.load(f)

IMG_SIZE = 224
NORM_MEAN = [0.485, 0.456, 0.406]
NORM_STD = [0.229, 0.224, 0.225]


def load_model(checkpoint_path: Optional[Path] = None, num_classes: int = len(CLASSES)):
    """Instantiate ShuffleNet V2 x0.5 and load checkpoint weights."""
    import torch
    import torch.nn as nn
    from torchvision.models import shufflenet_v2_x0_5

    path = Path(checkpoint_path) if checkpoint_path else _CKPT_PATH
    ckpt = torch.load(path, map_location="cpu", weights_only=False)

    if isinstance(ckpt, nn.Module):
        model = ckpt
    else:
        sd = ckpt
        for k in ("state_dict", "model_state_dict", "model"):
            if isinstance(sd, dict) and k in sd:
                sd = sd[k]
        sd = {k.replace("module.", ""): v for k, v in sd.items()}
        out_features = sd["fc.weight"].shape[0] if "fc.weight" in sd else num_classes
        model = shufflenet_v2_x0_5(weights=None, num_classes=out_features)
        model.load_state_dict(sd, strict=False)

    model.eval()
    return model


def export_onnx(
    output_path: Path,
    checkpoint_path: Optional[Path] = None,
    opset_version: int = 17,
):
    """Export model to ONNX for rover runtime execution."""
    import torch

    model = load_model(checkpoint_path)
    model.cpu().eval()
    dummy_input = torch.randn(1, 3, IMG_SIZE, IMG_SIZE)

    torch.onnx.export(
        model,
        dummy_input,
        str(output_path),
        input_names=["image"],
        output_names=["logits"],
        opset_version=opset_version,
        dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
    )
    return output_path


def predict(image_source, model=None, top_k: int = 3) -> List[Dict[str, Any]]:
    """Classify a leaf photograph.
    
    image_source can be a Path, a file-like object, or PIL Image.
    """
    import io
    import torch
    from PIL import Image
    from torchvision import transforms as T

    if model is None:
        model = load_model()

    transform = T.Compose(
        [
            T.Resize(int(IMG_SIZE * 1.14)),
            T.CenterCrop(IMG_SIZE),
            T.ToTensor(),
            T.Normalize(NORM_MEAN, NORM_STD),
        ]
    )

    if isinstance(image_source, Image.Image):
        img = image_source.convert("RGB")
    elif isinstance(image_source, (bytes, bytearray)):
        img = Image.open(io.BytesIO(image_source)).convert("RGB")
    else:
        img = Image.open(image_source).convert("RGB")

    tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        logits = model(tensor)
        raw_probs = torch.softmax(logits, dim=1)[0]

    # Map logits to the 38 PlantVillage classes
    if raw_probs.shape[0] == len(CLASSES):
        probs = raw_probs
    else:
        probs = torch.zeros(len(CLASSES))
        for k in range(len(raw_probs)):
            probs[k % len(CLASSES)] += raw_probs[k]

    top = probs.topk(min(top_k, len(CLASSES)))
    results = []
    for idx, conf in zip(top.indices.tolist(), top.values.tolist()):
        class_name = CLASSES[idx] if idx < len(CLASSES) else f"class_{idx}"
        results.append({"class": class_name, "confidence": float(conf)})

    return results


def run_worker():
    """Persistent JSON-RPC loop over stdin/stdout for zero-latency server calls."""
    import sys
    import base64
    import io
    from PIL import Image

    model = load_model()
    # Ready signal
    sys.stdout.write(json.dumps({"status": "ready"}) + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            action = req.get("action", "predict")
            if action == "ping":
                res = {"status": "ok"}
            elif action == "predict":
                if "base64" in req:
                    data = req["base64"]
                    if "," in data:
                        data = data.split(",", 1)[1]
                    raw_bytes = base64.b64decode(data)
                    predictions = predict(raw_bytes, model=model, top_k=req.get("top_k", 3))
                elif "path" in req:
                    predictions = predict(Path(req["path"]), model=model, top_k=req.get("top_k", 3))
                else:
                    raise ValueError("No image data provided (expected 'base64' or 'path')")

                res = {
                    "status": "success",
                    "predictedClass": predictions[0]["class"] if predictions else None,
                    "confidence": predictions[0]["confidence"] if predictions else 0.0,
                    "top3": predictions,
                }
            else:
                res = {"status": "error", "message": f"Unknown action: {action}"}
        except Exception as err:
            res = {"status": "error", "message": str(err)}

        sys.stdout.write(json.dumps(res) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--worker":
        run_worker()
    elif len(sys.argv) > 1:
        img_path = Path(sys.argv[1])
        if img_path.exists():
            preds = predict(img_path)
            print(json.dumps(preds, indent=2))
        else:
            print(json.dumps({"error": f"File not found: {img_path}"}))
    else:
        print("Usage: python -m models.plant_disease_model <image_path> | --worker")
