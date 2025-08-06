importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');

const MODEL_PATH = `yolov5n_web_model/model.json`;
const LABELS_PATH = `yolov5n_web_model/labels.json`;
const INPUT_DIM = 640;
const CLASS_THRESHOLD = 0.2;

let _model = null;
let _labels = [];

// Load model and class labels
async function loadModelAndLabels() {
    await tf.ready();
    _labels = await (await fetch(LABELS_PATH)).json();
    _model = await tf.loadGraphModel(MODEL_PATH);

    // Warm up model for faster first inference
    const dummyInput = tf.ones(_model.inputs[0].shape);
    await _model.executeAsync(dummyInput);
    tf.dispose(dummyInput);

    postMessage({ type: 'model-loaded' });
}
loadModelAndLabels();

// Preprocess image for model input
function preprocessImage(imageData) {
    // tf.tidy() manages memory for temporary tensors
    return tf.tidy(() => {
        const img = tf.browser.fromPixels(imageData);
        // Resize and normalize for model input
        return tf.image
            .resizeBilinear(img, [INPUT_DIM, INPUT_DIM])
            .div(255.0)
            .expandDims(0); // Add batch dimension
    });
}

// Run the YOLO model and return outputs
async function runInference(tensor) {
    // executeAsync returns boxes, scores, and classes for each detection
    const output = await _model.executeAsync(tensor);
    tf.dispose(tensor);
    // Unpack the YOLO model outputs
    const [boxes, scores, classes] = output.slice(0, 3);
    const [boxesData, scoresData, classesData] = await Promise.all([boxes.data(), scores.data(), classes.data()]);
    output.forEach(t => t.dispose());

    return {
        boxes: boxesData,
        scores: scoresData,
        classes: classesData,
        output
    };
}

// Process model output and send results
function* processPrediction({ boxes, scores, classes }, width, height) {

    for (let i = 0; i < scores.length; i++) {
        if (scores[i] < CLASS_THRESHOLD) continue;
        const label = _labels[classes[i]];
        if (label !== 'kite') continue;

        // Coordinates are normalized, map to image space
        let [x1, y1, x2, y2] = boxes.slice(i * 4, (i + 1) * 4);
        x1 *= width;
        x2 *= width;
        y1 *= height;
        y2 *= height;

        const boxWidth = x2 - x1;
        const boxHeight = y2 - y1;
        const centerX = x1 + boxWidth / 2;
        const centerY = y1 + boxHeight / 2;

        yield {
            x: centerX,
            y: centerY,
            score: (scores[i] * 100).toFixed(2),
        };
    }
}

self.onmessage = async ({ data }) => {
    if (data.type !== 'predict') return
    if (!_model) return;

    const imageData = new ImageData(
        new Uint8ClampedArray(data.buffer),
        data.width,
        data.height
    );
    const input = preprocessImage(imageData);

    const inferenceResults = await runInference(input);

    for (const prediction of processPrediction(inferenceResults, data.width, data.height)) {
        postMessage({
            type: 'prediction',
            ...prediction
        });
    }

};

console.log('🧠 YOLOv5n Web Worker initialized');
