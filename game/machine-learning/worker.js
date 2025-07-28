importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');

const MODEL_PATH = `yolov5n_web_model/model.json`;
const LABELS_PATH = `yolov5n_web_model/labels.json`;
const INPUT_DIM = 640;
const CLASS_THRESHOLD = 0.2;

let model, labels;

// === Load the model ===
async function loadModel() {
    await tf.ready();
    labels = await (await fetch(LABELS_PATH)).json();
    model = await tf.loadGraphModel(MODEL_PATH);

    // Warm up
    const dummy = tf.ones(model.inputs[0].shape);
    await model.executeAsync(dummy);
    tf.dispose(dummy);

    postMessage({ type: 'model-loaded' });
}
loadModel();


// === Preprocessing ===
function preprocessImage(imageData) {
    const img = tf.browser.fromPixels(imageData);
    const [h, w] = img.shape;
    const xRatio = w / INPUT_DIM;
    const yRatio = h / INPUT_DIM;
    const input = tf.image
        .resizeBilinear(img, [INPUT_DIM, INPUT_DIM])
        .div(255.0)
        .expandDims(0);
    return [input, xRatio, yRatio];
}

// === Prediction handler ===
async function predict(buffer, width, height) {
    if (!model) return;

    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const [tensor, xRatio, yRatio] = preprocessImage(imageData);

    const output = await model.executeAsync(tensor);
    tf.dispose(tensor);

    const [boxes, scores, classes] = output.slice(0, 3);
    const boxesData = boxes.dataSync();
    const scoresData = scores.dataSync();
    const classesData = classes.dataSync();
    tf.dispose(output);

    for (let i = 0; i < scoresData.length; i++) {
        if (scoresData[i] < CLASS_THRESHOLD) continue;
        const label = labels[classesData[i]];
        if (label !== 'kite') continue; // <-- Only send predictions for 'kite'

        let [x1, y1, x2, y2] = boxesData.slice(i * 4, (i + 1) * 4);

        // If coordinates are normalized (0..1), convert to pixel units
        if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) {
            x1 *= width;
            x2 *= width;
            y1 *= height;
            y2 *= height;
        } else {
            // Absolute mode: if you resized the input before inference, you might need xRatio/yRatio here
            x1 *= xRatio;
            x2 *= xRatio;
            y1 *= yRatio;
            y2 *= yRatio;
        }

        const boxWidth = x2 - x1;
        const boxHeight = y2 - y1;
        const centerX = x1 + boxWidth / 2;
        const centerY = y1 + boxHeight / 2;

        postMessage({
            type: 'prediction',
            x: centerX,
            y: centerY,
            width: boxWidth,
            height: boxHeight,
            score: (scoresData[i] * 100).toFixed(2),
            label
        });
    }

}

// === Message handling ===
self.onmessage = async ({ data }) => {
    if (data.type === 'predict') {
        await predict(data.buffer, data.width, data.height);
    }
};

console.log('🧠 YOLOv5n Web Worker initialized');
