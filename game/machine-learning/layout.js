import Events from "./events";

export function buildLayout() {
    // Main layout
    const container = document.createElement('div');
    Object.assign(container.style, {
        display: 'flex',
        flexDirection: 'row',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
    });

    // Left side: game view
    const gameWrapper = document.createElement('div');
    gameWrapper.id = 'gameWrapper';
    Object.assign(gameWrapper.style, {
        flex: '0 0 70%',
        background: '#111',
        position: 'relative',
    });

    // Right side: controls panel
    const controls = document.createElement('div');
    controls.id = 'controls';
    Object.assign(controls.style, {
        flex: '0 0 30%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: '20px',
        padding: '30px',
        background: 'rgba(255, 255, 255, 0.95)',
        overflowY: 'auto',
    });

    // Button row (horizontal layout)
    const buttonsRow = document.createElement('div');
    Object.assign(buttonsRow.style, {
        display: 'flex',
        flexDirection: 'row',
        gap: '15px',
    });

    // Buttons
    const captureBtn = document.createElement('button');
    captureBtn.innerText = '📹 Capture';



    const trainBtn = document.createElement('button');
    trainBtn.innerText = '🧠 Train';


    const runBtn = document.createElement('button');
    runBtn.innerText = '▶️ Run AI';

    [captureBtn, trainBtn, runBtn].forEach(btn =>
        Object.assign(btn.style, {
            fontSize: '1.2rem',
            padding: '10px 6px',
            cursor: 'pointer',
        })
    );

    buttonsRow.append(captureBtn, trainBtn, runBtn);
    controls.append(buttonsRow);
    container.append(gameWrapper, controls);
    document.body.appendChild(container);

    const previewCanvas = document.createElement('canvas');
    previewCanvas.id = 'previewCanvas';
    previewCanvas.width = 64;
    previewCanvas.height = 64;
    previewCanvas.style.border = '1px solid #333';
    previewCanvas.style.imageRendering = 'pixelated';

    controls.append(previewCanvas);

    // Hook events
    const toggleCaptureText = () => {
        captureBtn.innerText = captureBtn.innerText === '📹 Capture' ? '🛑 Stop Capture' : '📹 Capture';
    }

    const toggleRunText = () => {
        runBtn.innerText = runBtn.innerText === '▶️ Run AI' ? '⏹️ Stop AI' : '▶️ Run AI';
    }

    let isCapturing = false;
    let isRunning = false;
    captureBtn.addEventListener('click', () => {
        toggleCaptureText();
        if (isCapturing) {
            Events.dispatchStopCapture();
            console.log('🔴 Screen capture stopped.');
            isCapturing = false;
            return
        }
        Events.dispatchStartCapture();
        isCapturing = true;
        console.log('🟢 Screen capture started.');
    });

    trainBtn.addEventListener('click', () => {
        console.log('🧠 Training...');
        Events.dispatchTrainModel();
    });

    runBtn.addEventListener('click', () => {
        console.log('▶️ Running AI...');
        toggleRunText();
        if (isRunning) {
            Events.dispatchStopCapture();
            isRunning = false;
            console.log('⏹️ AI stopped.');
            return;
        }

        isRunning = true;
        Events.dispatchRunModel();
    });

    return gameWrapper;
}
