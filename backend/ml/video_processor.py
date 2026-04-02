"""
Video Processing Module - Sliding window heatmap detection for wildfire.
Ported directly from the Kaggle notebook logic.
"""

import os
import cv2
import gc
import time
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
from typing import Optional, Dict, Any, Callable
import psutil

# Parameters from notebook
IMAGE_SIZE = 224
CONFIDENCE_THRESHOLD = 0.6
DETECT_INTERVAL = 30        # Process every 30th frame
WINDOW_SIZE = 32
PROCESS_SCALE = 0.15        # Downscale frame for faster processing
BATCH_SIZE = 2
MAX_FRAMES = 500


def print_memory_usage():
    process = psutil.Process(os.getpid())
    mb = process.memory_info().rss / 1024 / 1024
    print(f"[Memory] {mb:.2f} MB")


def load_video_model(model_path: str):
    """Load model with memory growth enabled."""
    tf.keras.backend.clear_session()
    gpus = tf.config.experimental.list_physical_devices("GPU")
    if gpus:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
    model = load_model(model_path, compile=False)
    print(f"[VideoProcessor] Model loaded: {model_path}")
    return model


def process_frame_batch(model, batch_windows, batch_positions, heatmap):
    """Process a batch of windows and update heatmap."""
    if not batch_windows:
        return heatmap

    try:
        batch_array = np.array(batch_windows)
        predictions = model.predict(batch_array, verbose=0)

        for i, (x, y) in enumerate(batch_positions):
            confidence = float(predictions[i][0])
            heatmap[y:y + WINDOW_SIZE, x:x + WINDOW_SIZE] = np.maximum(
                heatmap[y:y + WINDOW_SIZE, x:x + WINDOW_SIZE],
                confidence,
            )

        del batch_array, predictions
        gc.collect()

        if np.random.random() < 0.1:
            tf.keras.backend.clear_session()

        return heatmap
    except Exception as e:
        print(f"[VideoProcessor] Batch processing error: {e}")
        return heatmap


def process_video(
    model_path: str,
    video_path: str,
    output_path: str,
    progress_callback: Optional[Callable] = None,
) -> Dict[str, Any]:
    """
    Main video processing pipeline.
    
    Returns dict with processing statistics:
        total_frames, wildfire_frames, detection_percentage,
        max_confidence, avg_confidence, processing_time_seconds
    """
    print_memory_usage()
    
    # Configure TF threads
    tf.config.threading.set_inter_op_parallelism_threads(2)
    tf.config.threading.set_intra_op_parallelism_threads(2)

    model = load_video_model(model_path)
    if model is None:
        raise RuntimeError("Failed to load model")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = max(1, int(cap.get(cv2.CAP_PROP_FPS)))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    actual_frames = min(frame_count, MAX_FRAMES)

    proc_width = int(width * PROCESS_SCALE)
    proc_height = int(height * PROCESS_SCALE)

    print(f"[VideoProcessor] {width}x{height} @ {fps}fps | {frame_count} frames → processing {actual_frames}")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    step_size = WINDOW_SIZE

    frame_idx = 0
    start_time = time.time()
    fire_regions = []

    # Stats tracking
    total_confidences = []
    wildfire_frame_count = 0

    try:
        while frame_idx < actual_frames:
            ret, frame = cap.read()
            if not ret:
                break

            output_frame = frame.copy()

            if frame_idx % DETECT_INTERVAL == 0:
                proc_frame = cv2.resize(frame, (proc_width, proc_height))
                fire_regions = []
                heatmap = np.zeros((proc_height, proc_width), dtype=np.float32)

                batch_windows = []
                batch_positions = []

                for y in range(0, proc_height - WINDOW_SIZE, step_size):
                    for x in range(0, proc_width - WINDOW_SIZE, step_size):
                        window = proc_frame[y:y + WINDOW_SIZE, x:x + WINDOW_SIZE]
                        if window.shape[0] == 0 or window.shape[1] == 0:
                            continue
                        window_resized = cv2.resize(window, (IMAGE_SIZE, IMAGE_SIZE))
                        img_array = img_to_array(window_resized) / 255.0
                        batch_windows.append(img_array)
                        batch_positions.append((x, y))

                        if len(batch_windows) >= BATCH_SIZE:
                            heatmap = process_frame_batch(model, batch_windows, batch_positions, heatmap)
                            batch_windows = []
                            batch_positions = []

                if batch_windows:
                    heatmap = process_frame_batch(model, batch_windows, batch_positions, heatmap)

                # Check if this frame has wildfire
                frame_max_conf = float(np.max(heatmap))
                if frame_max_conf >= CONFIDENCE_THRESHOLD:
                    wildfire_frame_count += 1
                total_confidences.append(frame_max_conf)

                fire_mask = (heatmap > CONFIDENCE_THRESHOLD).astype(np.uint8) * 255
                kernel = np.ones((3, 3), np.uint8)
                fire_mask = cv2.morphologyEx(fire_mask, cv2.MORPH_CLOSE, kernel)
                contours, _ = cv2.findContours(fire_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                for contour in contours:
                    if cv2.contourArea(contour) < 50:
                        continue
                    x, y, w, h = cv2.boundingRect(contour)
                    x_orig = int(x / PROCESS_SCALE)
                    y_orig = int(y / PROCESS_SCALE)
                    w_orig = int(w / PROCESS_SCALE)
                    h_orig = int(h / PROCESS_SCALE)
                    cy = min(y + h // 2, heatmap.shape[0] - 1)
                    cx = min(x + w // 2, heatmap.shape[1] - 1)
                    conf = float(heatmap[cy, cx])
                    fire_regions.append((x_orig, y_orig, w_orig, h_orig, conf))

                # Overlay heatmap visualization
                heatmap_vis = cv2.resize(heatmap, (width, height))
                heatmap_colored = cv2.applyColorMap(
                    (heatmap_vis * 255).astype(np.uint8), cv2.COLORMAP_HOT
                )
                # Blend only where there's fire signal
                fire_mask_full = (heatmap_vis > 0.3).astype(np.uint8)
                for c in range(3):
                    output_frame[:, :, c] = np.where(
                        fire_mask_full > 0,
                        cv2.addWeighted(output_frame[:, :, c], 0.6, heatmap_colored[:, :, c], 0.4, 0),
                        output_frame[:, :, c],
                    )

                del heatmap, fire_mask, proc_frame
                gc.collect()

            # Draw bounding boxes
            for x, y, w, h, conf in fire_regions:
                # Color based on confidence
                if conf >= 0.8:
                    color = (0, 0, 255)      # Red - high
                elif conf >= 0.65:
                    color = (0, 100, 255)    # Orange - medium
                else:
                    color = (0, 200, 255)    # Yellow - low

                cv2.rectangle(output_frame, (x, y), (x + w, y + h), color, 2)
                label = f"FIRE {conf:.0%}"
                cv2.putText(output_frame, label, (x, max(y - 5, 15)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # Add HUD overlay
            cv2.putText(output_frame, f"Frame {frame_idx}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            if fire_regions:
                max_c = max(r[4] for r in fire_regions)
                alert_text = f"WILDFIRE DETECTED - {max_c:.0%} conf"
                cv2.putText(output_frame, alert_text, (10, height - 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

            out.write(output_frame)

            del output_frame, frame
            frame_idx += 1

            if frame_idx % 50 == 0:
                elapsed = time.time() - start_time
                fps_real = frame_idx / elapsed if elapsed > 0 else 0
                pct = int((frame_idx / actual_frames) * 100)
                print(f"[VideoProcessor] {frame_idx}/{actual_frames} ({pct}%) @ {fps_real:.1f} FPS")
                print_memory_usage()
                gc.collect()

                if progress_callback:
                    progress_callback(frame_idx, actual_frames)

                if frame_idx % 300 == 0:
                    tf.keras.backend.clear_session()

    except Exception as e:
        print(f"[VideoProcessor] Error: {e}")
        raise
    finally:
        cap.release()
        out.release()
        if "model" in locals():
            del model
        gc.collect()
        tf.keras.backend.clear_session()

    processing_time = time.time() - start_time
    analyzed_frames = len(total_confidences)
    detection_pct = (wildfire_frame_count / max(analyzed_frames, 1)) * 100
    max_conf = max(total_confidences) if total_confidences else 0.0
    avg_conf = sum(total_confidences) / len(total_confidences) if total_confidences else 0.0

    print(f"[VideoProcessor] Done: {frame_idx} frames in {processing_time:.1f}s")
    print(f"[VideoProcessor] Detection: {detection_pct:.1f}% | Max conf: {max_conf:.3f}")

    return {
        "total_frames": frame_idx,
        "wildfire_frames": wildfire_frame_count,
        "detection_percentage": round(detection_pct, 2),
        "max_confidence": round(max_conf, 4),
        "avg_confidence": round(avg_conf, 4),
        "processing_time_seconds": round(processing_time, 2),
    }
