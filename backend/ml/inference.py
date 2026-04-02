"""
ML Inference Module - Single image and batch classification.
Uses MobileNetV2 binary classifier for wildfire detection.
Model: loaded once at startup, kept in memory.
"""

import os
import gc
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from typing import Optional, Dict, Any
import threading

IMAGE_SIZE = 224
CONFIDENCE_THRESHOLD = 0.5

# Global model holder with thread lock
_model = None
_model_path = None
_model_lock = threading.Lock()


def load_classification_model(model_path: str):
    """Load and return the model, clearing TF session first."""
    tf.keras.backend.clear_session()
    gpus = tf.config.experimental.list_physical_devices("GPU")
    if gpus:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)

    model = load_model(model_path, compile=False)
    print(f"[Inference] Model loaded from: {model_path}")
    return model


def set_active_model(model_path: str):
    """Set the global active model from a file path."""
    global _model, _model_path
    with _model_lock:
        if _model is not None:
            del _model
            gc.collect()
            tf.keras.backend.clear_session()
        _model = load_classification_model(model_path)
        _model_path = model_path


def get_model():
    """Get the current active model, or None if not loaded."""
    return _model


def classify_wildfire_image(image_path: str, model=None) -> Dict[str, Any]:
    """
    Classify a single image file as wildfire or no wildfire.
    
    Returns:
        dict with: label, confidence, raw_score
    """
    global _model
    m = model or _model
    if m is None:
        return {"error": "No model loaded"}

    try:
        img = load_img(image_path, target_size=(IMAGE_SIZE, IMAGE_SIZE))
        img_array = img_to_array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        prediction = float(m.predict(img_array, verbose=0)[0][0])

        label = "Wildfire" if prediction >= CONFIDENCE_THRESHOLD else "No Wildfire"
        confidence = prediction if prediction >= CONFIDENCE_THRESHOLD else 1.0 - prediction

        return {
            "label": label,
            "confidence": round(confidence, 4),
            "raw_score": round(prediction, 4),
            "is_wildfire": prediction >= CONFIDENCE_THRESHOLD,
        }
    except Exception as e:
        return {"error": str(e)}


def classify_image_array(img_array: np.ndarray, model=None) -> Dict[str, Any]:
    """
    Classify from a pre-processed numpy array (batch_size=1, H, W, 3).
    """
    global _model
    m = model or _model
    if m is None:
        return {"error": "No model loaded"}

    try:
        prediction = float(m.predict(img_array, verbose=0)[0][0])
        label = "Wildfire" if prediction >= CONFIDENCE_THRESHOLD else "No Wildfire"
        confidence = prediction if prediction >= CONFIDENCE_THRESHOLD else 1.0 - prediction
        return {
            "label": label,
            "confidence": round(confidence, 4),
            "raw_score": round(prediction, 4),
            "is_wildfire": prediction >= CONFIDENCE_THRESHOLD,
        }
    except Exception as e:
        return {"error": str(e)}
