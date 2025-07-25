importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js');

let labels = [];
let _model = null; // Move model outside so it's accessible for prediction

const DB_NAME = 'AI-Training-DB';
const STORE_NAME = 'samples';
let db = null;

// Open IndexedDB and create object store if not exists
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
async function saveSample(inputTensor, label) {
    const flattened = await inputTensor.array(); // shape: [4096]
    const sample = {
        input: flattened,
        label,
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
async function removeAllSamples() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
    });
}

async function loadAllSamples() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
// function preprocess(imageData) {
//     return tf.tidy(() => {
//         return tf.browser.fromPixels(imageData, 1)
//             .div(255)
//             .resizeBilinear([64, 64])
//             .flatten();
//     });
// }

openDatabase().then(() => {
    console.log('📦 IndexedDB ready!');
}).catch(console.error);

async function tryLoadModel() {
    try {
        _model = await tf.loadLayersModel('indexeddb://duck-hunt-model');
        postMessage({ type: 'model-loaded' });
        console.log('✅ Model loaded from IndexedDB');
    } catch (err) {
        console.warn('❌ No saved model found:', err);
    }
}
tryLoadModel()
self.onmessage = async (e) => {
    const { type, buffer, width, height, clickX, clickY } = e.data;

    if (type === 'clean-database') {
        await removeAllSamples();
        labels = [];
        console.log('🗑️ All samples removed from database.');
        return;
    }


    if (type === 'train-example') {
        const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
        const inputTensor = await preprocessAndSendPreview(imageData);

        const canvasWidth = width;   // já vem na mensagem
        const canvasHeight = height;

        await saveSample(inputTensor, [
            clickX / canvasWidth,
            clickY / canvasHeight
        ]);

        console.count(`📸 Added training sample`);
    }

    if (type === 'train-model') {
        if (_model) await tf.io.removeModel('indexeddb://duck-hunt-model');
        console.log('🗑️ Previous model removed from IndexedDB')

        const samples = await loadAllSamples();
        const xs = tf.stack(samples.map(s => tf.tensor(s.input)));
        const ys = tf.tensor2d(samples.map(s => s.label));
        const model = createModel();

        await model.fit(xs, ys, {
            epochs: 10,
            batchSize: 4,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    postMessage({ type: 'training-progress', epoch, loss: logs.loss });
                }
            }
        });
        await model.save('indexeddb://duck-hunt-model');
        console.log('💾 Model saved to IndexedDB!');
        tryLoadModel()

        postMessage({ type: 'model-trained' });
    }

    if (type === 'predict') {

        const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
        const inputTensor = await preprocessAndSendPreview(imageData);


        const prediction = _model.predict(inputTensor.expandDims(0));
        const [normX, normY] = await prediction.data();

        // Aqui você precisa saber o tamanho original do canvas.
        // Pode usar `width` e `height` da imagem como no treino:
        const predictedX = normX * width;
        const predictedY = normY * height;

        postMessage({ type: 'prediction', x: predictedX, y: predictedY });
        return;
    }
};

async function preprocessAndSendPreview(imageData) {
    return tf.tidy(() => {
        const tensor = tf.browser.fromPixels(imageData, 1); // grayscale
        const resized = tensor.div(255).resizeBilinear([64, 64]); // normalize + resize

        resized.data().then((grayData) => {
            const size = 64 * 64;
            const rgba = new Uint8ClampedArray(size * 4);

            for (let i = 0; i < size; i++) {
                const v = grayData[i] * 255;
                rgba[i * 4 + 0] = v;
                rgba[i * 4 + 1] = v;
                rgba[i * 4 + 2] = v;
                rgba[i * 4 + 3] = 255;
            }

            postMessage({
                type: 'preview',
                buffer: rgba.buffer,
                width: 64,
                height: 64
            }, [rgba.buffer]);
        });

        return resized.flatten();
    });
}

function createModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [4096], units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 2 })); // Predict X, Y
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError', metrics: ['accuracy'] });
    return model;
}
console.log('🧠 AI Worker initialized!');
