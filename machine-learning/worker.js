// Importa o runtime do TensorFlow.js dentro do Worker (executa no contexto de Web Worker)
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');

// Caminhos do modelo e dos rótulos exportados para uso no browser
const MODEL_PATH = `yolov5n_web_model/model.json`;
const LABELS_PATH = `yolov5n_web_model/labels.json`;

// Dimensão de entrada esperada pelo modelo YOLO (treinado para 640x640)
const INPUT_DIM = 640;

// Pontuação mínima (confiança) para considerar uma detecção como válida
const CLASS_THRESHOLD = 0.4;

let _model = null;   // Instância do modelo carregado
let _labels = [];    // Lista de rótulos (labels) associados às classes do modelo

/**
 * Carrega o modelo e os rótulos:
 * - tf.ready(): garante que o backend do TensorFlow.js está inicializado (CPU/WebGL/WASM)
 * - tf.loadGraphModel(): carrega o modelo exportado no formato GraphModel
 * - Warmup: executa uma inferência com dados fictícios para compilar kernels e
 *   acelerar a primeira inferência real
 */
async function loadModelAndLabels() {
    await tf.ready();

    // Carrega os rótulos de classes (JSON)
    _labels = await (await fetch(LABELS_PATH)).json();

    // Carrega o modelo YOLOv5n no formato GraphModel
    _model = await tf.loadGraphModel(MODEL_PATH);

    // ---- Warmup ----
    const dummyInput = tf.ones(_model.inputs[0].shape);
    await _model.executeAsync(dummyInput);
    tf.dispose(dummyInput);
    // ----------------

    // Notifica a thread principal de que o modelo está pronto
    postMessage({ type: 'model-loaded' });
}
// Carrega assim que o Worker inicializa
loadModelAndLabels();

/**
 * Pré-processa a imagem para o formato aceito pelo YOLO:
 * - tf.browser.fromPixels(): converte ImageBitmap/ImageData para tensor [H, W, 3]
 * - tf.image.resizeBilinear(): redimensiona para [INPUT_DIM, INPUT_DIM]
 * - .div(255): normaliza os valores para [0, 1]
 * - .expandDims(0): adiciona dimensão batch [1, H, W, 3]
 *
 * Uso de tf.tidy():
 * - Garante que tensores temporários serão descartados automaticamente,
 *   evitando vazamento de memória.
 */
function preprocessImage(input) {
    return tf.tidy(() => {
        const img = tf.browser.fromPixels(input);
        return tf.image
            .resizeBilinear(img, [INPUT_DIM, INPUT_DIM])
            .div(255)
            .expandDims(0);
    });
}

/**
 * Executa o modelo e retorna as saídas como arrays JS:
 * - executeAsync(): executa o modelo de forma assíncrona
 * - .data(): extrai os dados de cada tensor como TypedArray
 * - Sempre liberar tensores com dispose() para evitar acúmulo de memória
 */
async function runInference(tensor) {
    const output = await _model.executeAsync(tensor);
    tf.dispose(tensor);

    // Assume que as 3 primeiras saídas são: caixas (boxes), pontuações (scores) e classes
    const [boxes, scores, classes] = output.slice(0, 3);

    const [boxesData, scoresData, classesData] = await Promise.all([
        boxes.data(),
        scores.data(),
        classes.data()
    ]);

    output.forEach(t => t.dispose());

    return {
        boxes: boxesData,
        scores: scoresData,
        classes: classesData,
    };
}

/**
 * Filtra e processa as predições:
 * - Aplica o limiar de confiança (CLASS_THRESHOLD)
 * - Filtra apenas a classe desejada (exemplo: 'kite')
 * - Converte coordenadas normalizadas para pixels reais
 * - Calcula o centro do bounding box
 *
 * Uso de generator (function*):
 * - Permite enviar cada predição assim que processada, sem criar lista intermediária
 */
function* processPrediction({ boxes, scores, classes }, width, height) {
    for (let index = 0; index < scores.length; index++) {
        if (scores[index] < CLASS_THRESHOLD) continue;

        const label = _labels[classes[index]];
        if (label !== 'kite') continue;

        let [x1, y1, x2, y2] = boxes.slice(index * 4, (index + 1) * 4);

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
            score: (scores[index] * 100).toFixed(2),
        };
    }
}

/**
 * Recebe mensagens da thread principal:
 * Espera mensagens do tipo 'predict' contendo:
 * - image: ImageBitmap ou ImageData
 *
 * Fluxo:
 * 1) Pré-processa imagem para tensor [1, 640, 640, 3]
 * 2) Executa o modelo (runInference)
 * 3) Processa predições (processPrediction)
 * 4) Envia cada predição válida de volta via postMessage
 */
self.onmessage = async ({ data }) => {
    if (data.type !== 'predict') return;
    if (!_model) return;

    const input = preprocessImage(data.image);
    const { width, height } = data.image;

    const inferenceResults = await runInference(input);

    for (const prediction of processPrediction(inferenceResults, width, height)) {
        postMessage({
            type: 'prediction',
            ...prediction
        });
    }
};

// Log de inicialização do Worker
console.log('🧠 YOLOv5n Web Worker initialized');
