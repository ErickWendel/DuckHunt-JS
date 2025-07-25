importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js');

let _model = null;
const DB_NAME = 'AI-Training-DB';
const STORE_NAME = 'samples';
let db = null;

// === IndexedDB ===
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve();
        };

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { autoIncrement: true });
            }
        };
    });
}

async function saveSample(inputTensor, label, type = 'positive') {
    const flattened = Array.from(await inputTensor.data());
    const sample = {
        input: flattened,
        label,
        type,
        timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.add(sample);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

function removeAllSamples() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
    });
}

function loadAllSamples() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// === Preprocessing ===
function preprocessImage(imageData) {
    return tf.tidy(() => {
        const tensor = tf.browser.fromPixels(imageData, 3); // RGB
        const normalized = tensor.div(255).resizeBilinear([64, 64]);
        return normalized; // shape: [64, 64, 3]
    });
}

function sendPreview(tensor) {
    tensor.data().then((rgbData) => {
        const size = 64 * 64;
        const rgba = new Uint8ClampedArray(size * 4);

        for (let i = 0; i < size; i++) {
            const r = rgbData[i * 3 + 0] * 255;
            const g = rgbData[i * 3 + 1] * 255;
            const b = rgbData[i * 3 + 2] * 255;

            rgba[i * 4 + 0] = r;
            rgba[i * 4 + 1] = g;
            rgba[i * 4 + 2] = b;
            rgba[i * 4 + 3] = 255;
        }

        postMessage({
            type: 'preview',
            buffer: rgba.buffer,
            width: 64,
            height: 64
        }, [rgba.buffer]);
    });
}

// === Model Handling ===
function createModel() {
    const model = tf.sequential();

    model.add(tf.layers.conv2d({ inputShape: [64, 64, 3], kernelSize: 3, filters: 16, activation: 'relu' }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    model.add(tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 2, activation: 'sigmoid' })); // [x, y]

    model.compile({ optimizer: 'adam', loss: 'meanSquaredError', metrics: ['mse'] });
    return model;
}

async function tryLoadModel() {
    try {
        _model = await tf.loadLayersModel('indexeddb://duck-hunt-model');
        postMessage({ type: 'model-loaded' });
        console.log('✅ Model loaded from IndexedDB');
    } catch (err) {
        console.warn('❌ No saved model found:', err);
    }
}

async function handleExample(type, buffer, width, height, clickX, clickY) {
    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const inputTensor = preprocessImage(imageData);
    sendPreview(inputTensor);

    await saveSample(inputTensor, [clickX / width, clickY / height], type);
    console.count(`📸 Added ${type} training sample`);
}

async function handleTrainModel() {
    if (_model) await tf.io.removeModel('indexeddb://duck-hunt-model');
    console.log('🗑️ Previous model removed');

    const allSamples = await loadAllSamples();

    if (!allSamples.length) {
        console.warn('⚠️ No samples available to train.');
        return;
    }

    const xs = tf.stack(
        allSamples.map(s =>
            tf.tensor(s.input, [64, 64, 3])
        )
    );

    const ys = tf.tensor2d(
        allSamples.map(s =>
            s.type === 'negative' ? [-1, -1] : s.label
        )
    );

    const model = createModel();

    await model.fit(xs, ys, {
        epochs: 20,
        batchSize: 4,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                postMessage({ type: 'training-progress', epoch, loss: logs.loss });
            }
        }
    });

    await model.save('indexeddb://duck-hunt-model');
    console.log('💾 Model saved!');
    tryLoadModel();
    postMessage({ type: 'model-trained' });
}

async function handlePrediction(buffer, width, height) {
    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const inputTensor = preprocessImage(imageData);
    sendPreview(inputTensor);

    const prediction = _model.predict(inputTensor.expandDims(0));
    const [normX, normY] = await prediction.data();
    const confidence = 1 - tf.losses.meanSquaredError([[0.5, 0.5]], prediction).dataSync()[0];

    console.log(`🔮 Prediction: (${normX}, ${normY}), confidence: ${confidence}`);

    if (confidence >= 0.7) {
        const x = Math.max(0, Math.min(1, normX)) * width;
        const y = Math.max(0, Math.min(1, normY)) * height;

        postMessage({ type: 'prediction', x, y });
    }
}

// === Init ===
openDatabase().then(() => console.log('📦 IndexedDB ready!')).catch(console.error);
tryLoadModel();

self.onmessage = async ({ data }) => {
    const { type, buffer, width, height, clickX, clickY } = data;

    switch (type) {
        case 'clean-database':
            await removeAllSamples();
            console.log('🗑️ All samples removed');
            break;

        case 'good-example':
            await handleExample('positive', buffer, width, height, clickX, clickY);
            break;

        case 'bad-example':
            await handleExample('negative', buffer, width, height, clickX, clickY);
            break;

        case 'train-model':
            await handleTrainModel();
            break;

        case 'predict':
            await handlePrediction(buffer, width, height);
            break;
    }
};

console.log('🧠 AI Worker initialized!');
