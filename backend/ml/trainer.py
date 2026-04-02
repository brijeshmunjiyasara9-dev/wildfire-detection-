"""
Model Training Module - MobileNetV2 transfer learning for wildfire detection.
Ported from the Kaggle notebook with MLOps enhancements.
"""

import os
import json
import gc
import time
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, LambdaCallback
from PIL import ImageFile
from typing import Optional, Dict, Any, Callable, List

ImageFile.LOAD_TRUNCATED_IMAGES = True

IMAGE_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 15
LEARNING_RATE = 0.001
CHANNELS = 3


def build_model(base_model_path: Optional[str] = None) -> Model:
    """
    Build MobileNetV2 transfer learning model.
    If base_model_path provided, load and continue fine-tuning.
    """
    if base_model_path and os.path.exists(base_model_path):
        print(f"[Trainer] Loading base model from: {base_model_path}")
        model = load_model(base_model_path, compile=False)
    else:
        print("[Trainer] Building fresh MobileNetV2 model...")
        base_model = MobileNetV2(
            weights="imagenet",
            include_top=False,
            input_shape=(IMAGE_SIZE, IMAGE_SIZE, CHANNELS),
        )
        for layer in base_model.layers:
            layer.trainable = False

        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = Dense(128, activation="relu")(x)
        predictions = Dense(1, activation="sigmoid")(x)
        model = Model(inputs=base_model.input, outputs=predictions)

    model.compile(
        optimizer=Adam(learning_rate=LEARNING_RATE),
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )
    return model


def prepare_data(dataset_path: str):
    """
    Prepare ImageDataGenerators from a dataset directory.
    Expected structure: dataset_path/{train,valid,test}/{wildfire,nowildfire}/
    """
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=20,
        width_shift_range=0.1,
        height_shift_range=0.1,
        shear_range=0.2,
        zoom_range=0.1,
        horizontal_flip=True,
        fill_mode="nearest",
    )
    val_datagen = ImageDataGenerator(rescale=1.0 / 255)

    train_gen = train_datagen.flow_from_directory(
        os.path.join(dataset_path, "train"),
        target_size=(IMAGE_SIZE, IMAGE_SIZE),
        batch_size=BATCH_SIZE,
        class_mode="binary",
        shuffle=True,
    )
    val_gen = val_datagen.flow_from_directory(
        os.path.join(dataset_path, "valid"),
        target_size=(IMAGE_SIZE, IMAGE_SIZE),
        batch_size=BATCH_SIZE,
        class_mode="binary",
        shuffle=False,
    )
    return train_gen, val_gen


def run_training_job(
    job_id: str,
    dataset_path: str,
    output_model_path: str,
    base_model_path: Optional[str] = None,
    epochs: int = EPOCHS,
    learning_rate: float = LEARNING_RATE,
    batch_size: int = BATCH_SIZE,
    log_callback: Optional[Callable] = None,
) -> Dict[str, Any]:
    """
    Full training pipeline. Returns final metrics dict.
    """
    epoch_logs: List[dict] = []
    start_time = time.time()

    tf.keras.backend.clear_session()
    gpus = tf.config.experimental.list_physical_devices("GPU")
    if gpus:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)

    print(f"[Trainer] Job {job_id} starting...")

    train_gen, val_gen = prepare_data(dataset_path)
    print(f"[Trainer] Train: {train_gen.samples} | Val: {val_gen.samples}")

    model = build_model(base_model_path)

    # Re-compile with job-specific settings
    model.compile(
        optimizer=Adam(learning_rate=learning_rate),
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )

    def on_epoch_end(epoch, logs):
        entry = {
            "epoch": epoch + 1,
            "loss": round(float(logs.get("loss", 0)), 4),
            "accuracy": round(float(logs.get("accuracy", 0)), 4),
            "val_loss": round(float(logs.get("val_loss", 0)), 4),
            "val_accuracy": round(float(logs.get("val_accuracy", 0)), 4),
            "timestamp": time.time(),
        }
        epoch_logs.append(entry)
        if log_callback:
            log_callback(json.dumps(epoch_logs))
        print(f"[Trainer] Epoch {entry['epoch']}: acc={entry['accuracy']:.4f} val_acc={entry['val_accuracy']:.4f}")

    os.makedirs(os.path.dirname(os.path.abspath(output_model_path)), exist_ok=True)
    best_model_path = output_model_path.replace(".keras", "_best.keras")

    callbacks = [
        EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True),
        ModelCheckpoint(best_model_path, monitor="val_loss", save_best_only=True),
        LambdaCallback(on_epoch_end=on_epoch_end),
    ]

    history = model.fit(
        train_gen,
        steps_per_epoch=train_gen.samples // batch_size,
        validation_data=val_gen,
        validation_steps=val_gen.samples // batch_size,
        epochs=epochs,
        callbacks=callbacks,
    )

    # Use best model weights
    if os.path.exists(best_model_path):
        model = load_model(best_model_path, compile=False)

    model.save(output_model_path)
    print(f"[Trainer] Model saved to: {output_model_path}")

    # Final metrics
    final_acc = max(h["accuracy"] for h in epoch_logs) if epoch_logs else 0.0
    best_entry = min(epoch_logs, key=lambda h: h["val_loss"]) if epoch_logs else {}

    processing_time = time.time() - start_time

    del model
    gc.collect()
    tf.keras.backend.clear_session()

    return {
        "final_accuracy": round(best_entry.get("val_accuracy", final_acc), 4),
        "final_val_loss": round(best_entry.get("val_loss", 0.0), 4),
        "train_images": train_gen.samples,
        "val_images": val_gen.samples,
        "epochs_completed": len(epoch_logs),
        "training_log": json.dumps(epoch_logs),
        "output_path": output_model_path,
        "processing_time_seconds": round(processing_time, 2),
    }
