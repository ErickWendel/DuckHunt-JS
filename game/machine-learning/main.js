import Events from "./events";
import { buildLayout } from "./layout";


// ======== Screen Capture via getDisplayMedia + ImageCapture ========

let imageCapture;

/**
 * Inicia a captura da tela.
 */
export async function startScreenCapture() {
    if (imageCapture) return Promise.resolve(); // Already running

    return new Promise(async (resolve, reject) => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "never" },
                audio: false
            });

            const track = stream.getVideoTracks()[0];

            // Wait until the video track is "live" and ready
            if (track.readyState === 'live') {
                imageCapture = new ImageCapture(track);
                resolve(); // ✅ Screen capture is ready
            } else {
                // Listen for 'unmute' which signals frames are flowing
                track.addEventListener('unmute', () => {
                    imageCapture = new ImageCapture(track);
                    resolve(); // ✅ Screen capture is ready and active
                }, { once: true });

                // Optional: handle track end before it starts
                track.addEventListener('ended', () => {
                    reject(new Error('Screen capture was closed before it started'));
                }, { once: true });
            }
        } catch (err) {
            reject(err);
        }
    });
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
    Events.onCapturePermission(async () => {
        await startScreenCapture();
        Events.dispatchStartCapture()
        console.log('🟢 Screen capture started.');
    })
    Events.onStartCapture(async (type) => {

        _fnHandler = Events.onDuckMoved(async (data) => {
            if (!imageCapture) return
            const { x, y, spriteId } = data;
            console.log(`Duck position updated: x = ${x}, y = ${y}`, spriteId);

            console.log(`🖱️ Click at: (${x}, ${y})`)
            const imageData = await takeScreenshotOfCanvasArea();
            if (!imageData) { return console.error('Failed to capture image data'); }
            worker.postMessage({
                type: 'add-sample',
                buffer: imageData.data.buffer,
                width: imageData.width,
                height: imageData.height,
                clickX: x,
                clickY: y
            }, [imageData.data.buffer]);

        });


        // _fnHandler = Events.onShoot(async (data) => {
        //     if (!_trainingType) return


        //     const { x, y } = data;
        //     console.log(`🖱️ Click at: (${x}, ${y})`)
        //     const imageData = await takeScreenshotOfCanvasArea();
        //     if (!imageData) { return console.error('Failed to capture image data'); }
        //     worker.postMessage({
        //         type: 'add-sample',
        //         buffer: imageData.data.buffer,
        //         width: imageData.width,
        //         height: imageData.height,
        //         clickX: x,
        //         clickY: y
        //     }, [imageData.data.buffer]);

        // });


        worker.postMessage({ type: 'clean-database' });

    });

    Events.onStopCapture(() => {
        document.removeEventListener('shoot', _fnHandler);
        _fnHandler = null;
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
            if (!imageData) return;
            worker.postMessage({
                type: 'predict',
                buffer: imageData.data.buffer,
                width: imageData.width,
                height: imageData.height
            }, [imageData.data.buffer]);

        }, 500); // 2 FPS

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
    const worker = new Worker(new URL('./worker.js', import.meta.url));


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
