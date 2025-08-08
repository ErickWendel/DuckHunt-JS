import { buildLayout } from "./layout";

export default async function main(game) {
    const container = buildLayout(game.app);
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

    game.stage.aim.visible = false;

    worker.onmessage = ({ data }) => {
        const { type, x, y } = data;

        if (type === 'prediction') {
            console.log(`🎯 AI predicted at: (${x}, ${y})`);
            container.updateHUD(data);
            game.stage.aim.visible = true;

            game.stage.aim.setPosition(data.x, data.y);
            const position = game.stage.aim.getGlobalPosition();

            game.handleClick({
                global: position,
            });

        }

    };

    setInterval(async () => {
        const canvas = game.app.renderer.extract.canvas(game.stage);
        const bitmap = await createImageBitmap(canvas);

        worker.postMessage({
            type: 'predict',
            image: bitmap,
        }, [bitmap]);

    }, 200); // every 200ms

    return container;
}
