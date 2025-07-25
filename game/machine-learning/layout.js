import Events from "./events";

export function buildLayout() {
    const container = document.createElement('div');
    Object.assign(container.style, {
        display: 'flex',
        flexDirection: 'row',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
    });

    const gameWrapper = document.createElement('div');
    gameWrapper.id = 'gameWrapper';
    Object.assign(gameWrapper.style, {
        flex: '0 0 70%',
        background: '#111',
        position: 'relative',
    });

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

    const createButton = (label) => {
        const btn = document.createElement('button');
        btn.innerText = label;
        Object.assign(btn.style, {
            fontSize: '1.2rem',
            padding: '10px 12px',
            cursor: 'pointer',
        });
        return btn;
    };

    const captureBtn = createButton('📹 Capture');
    const trainBadBtn = createButton('❌ Train Bad');
    const trainGoodBtn = createButton('✅ Train Good');
    const trainModelBtn = createButton('🧠 Train Model');
    const runBtn = createButton('▶️ Run AI');

    // Disable bad/good training initially
    trainBadBtn.disabled = true;
    trainGoodBtn.disabled = true;
    trainBadBtn.style.opacity = '0.6';
    trainGoodBtn.style.opacity = '0.6';

    // Track selection
    const resetTrainingSelection = () => {
        trainBadBtn.style.border = '';
        trainGoodBtn.style.border = '';
    };

    // Row 1: capture + train examples
    const row1 = document.createElement('div');
    Object.assign(row1.style, {
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        flexWrap: 'wrap',
    });
    row1.append(captureBtn, trainBadBtn, trainGoodBtn);

    // Row 2: train model + run ai
    const row2 = document.createElement('div');
    Object.assign(row2.style, {
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        flexWrap: 'wrap',
    });
    row2.append(trainModelBtn, runBtn);

    controls.append(row1, row2);

    const previewCanvas = document.createElement('canvas');
    previewCanvas.id = 'previewCanvas';
    previewCanvas.width = 64;
    previewCanvas.height = 64;
    Object.assign(previewCanvas.style, {
        border: '1px solid #333',
        imageRendering: 'pixelated',
    });
    controls.append(previewCanvas);

    container.append(gameWrapper, controls);
    document.body.appendChild(container);

    let isCapturing = false;
    let isRunning = false;

    const toggleCaptureText = () => {
        captureBtn.innerText = captureBtn.innerText === '📹 Capture' ? '🛑 Stop Capture' : '📹 Capture';
    };
    const toggleRunText = () => {
        runBtn.innerText = runBtn.innerText === '▶️ Run AI' ? '⏹️ Stop AI' : '▶️ Run AI';
    };

    captureBtn.addEventListener('click', () => {
        toggleCaptureText();
        isCapturing = !isCapturing;

        if (isCapturing) {
            Events.dispatchStartCapture();
            console.log('🟢 Screen capture started.');
            trainBadBtn.disabled = false;
            trainGoodBtn.disabled = false;
            trainBadBtn.style.opacity = '1';
            trainGoodBtn.style.opacity = '1';
        } else {
            Events.dispatchStopCapture();
            console.log('🔴 Screen capture stopped.');
            trainBadBtn.disabled = true;
            trainGoodBtn.disabled = true;
            trainBadBtn.style.opacity = '0.6';
            trainGoodBtn.style.opacity = '0.6';
            resetTrainingSelection();
        }
    });

    trainBadBtn.addEventListener('click', () => {
        if (trainBadBtn.disabled) return;
        Events.dispatchTrainingConfig('bad-example');
        resetTrainingSelection();
        trainBadBtn.style.border = '3px solid red';
        console.log('❌ Training BAD example...');
    });

    trainGoodBtn.addEventListener('click', () => {
        if (trainGoodBtn.disabled) return;
        Events.dispatchTrainingConfig('good-example');
        resetTrainingSelection();
        trainGoodBtn.style.border = '3px solid green';
        console.log('✅ Training GOOD example...');
    });

    trainModelBtn.addEventListener('click', () => {
        Events.dispatchTrainModel();
        console.log('🧠 Training model...');
    });

    runBtn.addEventListener('click', () => {
        toggleRunText();
        isRunning = !isRunning;
        if (isRunning) {
            Events.dispatchRunModel();
            console.log('▶️ Running AI...');
        } else {
            Events.dispatchStopCapture();
            console.log('⏹️ AI stopped.');
        }
    });

    return gameWrapper;
}
