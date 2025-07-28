import Events from "./events";
import { buildLayout } from "./layout";

function setupEventHandlers({ worker }) {


    Events.onRunModel((imageData) => {


        worker.postMessage({
            type: 'predict',
            buffer: imageData.data.buffer,
            width: imageData.width,
            height: imageData.height
        }, [imageData.data.buffer]);
    });
}

// ======== Worker Message Handling ========

/**
 * Escuta mensagens vindas do Worker.
 */
function handleWorkerMessages(worker) {

    worker.onmessage = ({ data }) => {
        const { type, buffer, width, height, x, y, score } = data;

        if (type === 'prediction') {

            console.log(`🎯 AI predicted at: (${x}, ${y})`);

            Events.dispatchOnShoot({ x, y, score }); // ⬅️ Hook for your shooting logic
        }

    };

}

// ======== App Bootstrap ========

/**
 * Inicializa layout, worker e lógica de eventos.
 */
export default async function main(game) {
    const container = buildLayout(game.app);
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

    game.stage.aim.visible = false;

    Events.onShoot((data) => {

        container.updateHUD(data);

        game.stage.aim.visible = true;

        game.stage.aim.setPosition(data.x, data.y);
        const position = game.stage.aim.getGlobalPosition();
        game.handleClick({
            data: {
                global: position,
            }
        });
    });

    setInterval(() => {
        const canvas = game.renderer.extract.canvas(game.stage);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        Events.dispatchRunModel(imageData);

    }, 200); // every 200ms

    setupEventHandlers({ worker });
    handleWorkerMessages(worker);

    return container;
}
