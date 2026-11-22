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


def predict(image_path: Path, model=None, top_k: int = 3) -> List[Dict[str, Any]]:
    """Classify a leaf photograph."""
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

    img = Image.open(image_path).convert("RGB")
    tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]

    top = probs.topk(min(top_k, len(CLASSES)))
    results = []
    for idx, conf in zip(top.indices.tolist(), top.values.tolist()):
        class_name = CLASSES[idx] if idx < len(CLASSES) else f"class_{idx}"
        results.append({"class": class_name, "confidence": float(conf)})

    return results
