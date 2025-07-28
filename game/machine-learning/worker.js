importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');

const MODEL_PATH = `yolov5n_web_model/model.json`;
const LABELS_PATH = `yolov5n_web_model/labels.json`;
const INPUT_DIM = 640;
const CLASS_THRESHOLD = 0.2;

let model, labels;

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

function preprocessImage(imageData) {
    let xRatio, yRatio;
    const input = tf.tidy(() => {
        const img = tf.browser.fromPixels(imageData);
        const [h, w] = img.shape;
        xRatio = w / INPUT_DIM;
        yRatio = h / INPUT_DIM;
        return tf.image
            .resizeBilinear(img, [INPUT_DIM, INPUT_DIM])
            .div(255.0)
            .expandDims(0);
    });
    return [input, xRatio, yRatio];
}

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

    // Dispose tensors to avoid memory leaks
    boxes.dispose && boxes.dispose();
    scores.dispose && scores.dispose();
    classes.dispose && classes.dispose();

    if (Array.isArray(output)) {
        output.forEach(t => t.dispose && t.dispose());
    } else if (output.dispose) {
        output.dispose();
    }

    for (let i = 0; i < scoresData.length; i++) {
        if (scoresData[i] < CLASS_THRESHOLD) continue;
        const label = labels[classesData[i]];
        if (label !== 'kite') continue;

        let [x1, y1, x2, y2] = boxesData.slice(i * 4, (i + 1) * 4);

        if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) {
            x1 *= width;
            x2 *= width;
            y1 *= height;
            y2 *= height;
        } else {
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

self.onmessage = async ({ data }) => {
    if (data.type === 'predict') {
        await predict(data.buffer, data.width, data.height);
    }
};

console.log('🧠 YOLOv5n Web Worker initialized');
