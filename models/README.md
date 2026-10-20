# Experimental BarangAI model

This private repository includes the reviewed EfficientNet-B0 v3 checkpoint used by the local presentation demo. It contains model weights and metadata, not training photos, credentials or resident records. Keep this repository private: this upload does not establish public redistribution rights for the mixed-source training data or resulting weights.

- File: `efficientnet_b0-v3.pt`, 16,357,535 bytes.
- SHA-256: `06b5ad7c02112c599c056b9be52fe771a3bdfdb08577897d1a962c1dd2c1f409`.
- Categories, in checkpoint order: flooding, potholes, fallen_trees, uncollected_garbage, damaged_signage.
- Runtime: the existing API adapter, CPU Torch 2.11.0 and TorchVision 0.26.0. Install and launch using the root README's local presentation commands.
- The local launcher supplies the exact approved hash and a demo-only 0.8 confidence cutoff. Old checkpoint preprocessing is retained; do not apply the newer letterbox transform to these weights.

The tiny development test scored 24/26, macro F1 0.75; **both held-out tree photos were misclassified as flooding**. These are not field-accuracy results. The 0.8 cutoff is not calibrated. Resident category selection and staff verification remain necessary. See [v3 results](../ml/TRAINING-RESULTS-V3-2026-10-20.md) and [later comparison](../ml/TRAINING-RESULTS-V4-2026-10-20.md) for limitations and why v3 remains the demo model.

The Render Free deployment still excludes the model and Torch runtime. Adding this file to GitHub does not enable hosted AI. A separate resource benchmark and deployment change are required.
