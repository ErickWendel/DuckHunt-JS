import Events from "./events";
import { buildLayout } from "./layout";

// ======== Web Worker ========

/**
 * Cria um Web Worker a partir de um arquivo ESM via fetch.
 */
export async function createAIWorkerFromURL(path = 'worker.js') {
    const response = await fetch(path);
    const code = await response.text();
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    return new Worker(url, { type: 'module' });
}

// ======== Screen Capture via getDisplayMedia + ImageCapture ========

let imageCapture;

/**
 * Inicia a captura da tela.
 */
export async function startScreenCapture() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "never" },
        audio: false
    });

    const track = stream.getVideoTracks()[0];
    imageCapture = new ImageCapture(track);
    return stream
}

async function stopScreenCapture() {
    if (imageCapture) {
        const track = imageCapture.track;
        track.stop();
        imageCapture = null;
        console.log('Screen capture stopped.');
    } else {
        console.warn('No screen capture to stop.');
    }
}


/**
 * Retorna a referência do canvas do jogo.
 */
function getCanvas() {
    return document.querySelector('#gameWrapper > canvas');
}

/**
 * Captura a área do canvas usando ImageCapture + crop baseado no boundingClientRect.
 */
export async function takeScreenshotOfCanvasArea() {
    if (!imageCapture) {
        console.error('Screen capture not initialized.');
        return;
    }

    const bitmap = await imageCapture.grabFrame();
    const { left, top, width, height } = getCanvas().getBoundingClientRect();

    const scaleX = bitmap.width / window.innerWidth;
    const scaleY = bitmap.height / window.innerHeight;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = bitmap.width;
    tempCanvas.height = bitmap.height;

    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(bitmap, 0, 0);

    const cropped = tempCtx.getImageData(
        Math.floor(left * scaleX),
        Math.floor(top * scaleY),
        Math.floor(width * scaleX),
        Math.floor(height * scaleY)
    );

    return cropped;
}

// ======== Event Handlers Setup ========

/**
 * Configura os listeners dos eventos personalizados da interface.
 */
function setupEventHandlers({ worker }) {
    let _intervalId = 0;
    let _fnHandler = null;

    Events.onStartCapture(async () => {
        worker.postMessage({ type: 'clean-database' });
        Events.onShoot(async (data) => {
            const { x, y } = data;
            console.log(`🖱️ Click at: (${x}, ${y})`)
            const imageData = await takeScreenshotOfCanvasArea();

            worker.postMessage({
                type: 'train-example',
                buffer: imageData.data.buffer,
                width: imageData.width,
                height: imageData.height,
                clickX: x,
                clickY: y
            }, [imageData.data.buffer]);

        });


        // _fnHandler = async (e) => {
        //     const rect = webglCanvas.getBoundingClientRect();
        //     const scaleX = webglCanvas.width / rect.width;
        //     const scaleY = webglCanvas.height / rect.height;

        //     const clickX = Math.floor((e.clientX - rect.left) * scaleX);
        //     const clickY = Math.floor((e.clientY - rect.top) * scaleY);

        //     console.log('🖱️ Click at:', clickX, clickY);



        // };

        // webglCanvas.addEventListener('click', _fnHandler);

        await startScreenCapture();
    });

    Events.onStopCapture(() => {
        // if (_fnHandler) {
        //     getCanvas().removeEventListener('click', _fnHandler);
        // }
        stopScreenCapture()
        console.log('🟢 Screen capture stopped.');
    });

    Events.onTrainModel(() => {
        worker.postMessage({ type: 'train-model' });
    });
    let isRunning = false;

    Events.onRunModel(async () => {
        if (isRunning) {
            console.log('⏹️ AI stopped.');
            clearInterval(_intervalId);
            isRunning = false;
            return;
        }
        isRunning = true;
        console.log('▶️ AI running...');
        await startScreenCapture();

        _intervalId = setInterval(async () => {
            const imageData = await takeScreenshotOfCanvasArea();
            worker.postMessage({
                type: 'predict',
                buffer: imageData.data.buffer,
                width: imageData.width,
                height: imageData.height
            }, [imageData.data.buffer]);

            //     worker.postMessage({
            //         type: 'train-example',
            //         buffer: imageData.data.buffer,
            //         width: imageData.width,
            //         height: imageData.height,
            //         clickX: 0,
            //         clickY: 0
            //     }, [imageData.data.buffer]);

        }, 1000 / 10); // 10 FPS

    });
}

// ======== Worker Message Handling ========

/**
 * Escuta mensagens vindas do Worker.
 */
function handleWorkerMessages(worker, previewCtx) {
    worker.onmessage = ({ data }) => {
        const { type, buffer, width, height, epoch, loss, x: scaledX, y: scaledY } = data;

        if (type === 'preview') {
            const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
            previewCtx.putImageData(imageData, 0, 0);
        }

        if (type === 'training-progress') {
            console.log(`📈 Epoch ${epoch}, loss: ${loss}`);
        }

        if (type === 'model-trained') {
            console.log('✅ Model trained!');
        }

        if (type === 'prediction') {
            const { x, y } = data;
            console.log(`🎯 AI predicted at: (${x}, ${y})`);
            Events.dispatchOnShoot({ x, y });
        }
    };
}

// ======== App Bootstrap ========

/**
 * Inicializa layout, worker e lógica de eventos.
 */
export default async function main() {
    const container = buildLayout();
    const worker = await createAIWorkerFromURL('./worker.js');

    const previewCanvas = document.querySelector('#previewCanvas');
    previewCanvas.width = 64;
    previewCanvas.height = 64;

    previewCanvas.style.width = "256px";
    previewCanvas.style.height = "256px";
    previewCanvas.style.imageRendering = "pixelated";
    previewCanvas.style.display = "block";
    previewCanvas.style.margin = "20px auto";

    const previewCtx = previewCanvas.getContext('2d');

    setupEventHandlers({ worker });
    handleWorkerMessages(worker, previewCtx);

    return container;
}
