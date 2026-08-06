#!/usr/bin/env python3
"""
Export student MLP to ONNX for in-browser inference.
Next.js serves the .onnx file statically; inference runs in WebAssembly.
Fits into: backend/export_onnx.py
"""
import argparse
import sys
from pathlib import Path

import joblib
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

try:
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
except ImportError:
    raise ImportError("pip install skl2onnx onnxruntime")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--student", default="./data/models/titanic_student.pkl")
    parser.add_argument("--out", default="./public/models/titanic.onnx")
    args = parser.parse_args()

    data = joblib.load(args.student)
    model = data["model"]
    n_features = len(data["feature_names"])

    initial_type = [("float_input", FloatTensorType([None, n_features]))]
    onnx_model = convert_sklearn(model, initial_types=initial_type, target_opset=15)

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "wb") as f:
        f.write(onnx_model.SerializeToString())

    print(f"✅ ONNX exported: {args.out} ({Path(args.out).stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
