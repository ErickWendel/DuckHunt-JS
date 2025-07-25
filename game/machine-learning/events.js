export default class Events {

    static dispatchTrainModel(data = {}) {
        const event = new CustomEvent('train-model', {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onTrainModel(callback) {
        document.addEventListener('train-model', (event) => {
            callback(event.detail);
        });
    }

    static dispatchStopCapture() {
        document.dispatchEvent(new CustomEvent('stop-capture'));
    }

    static onStopCapture(callback) {
        document.addEventListener('stop-capture', e => callback(e.detail));
    }

    static dispatchStartCapture() {
        document.dispatchEvent(new CustomEvent('start-capture'));
    }

    static onStartCapture(callback) {
        document.addEventListener('start-capture', e => callback(e.detail));
    }
    static dispatchTrainingComplete(data) {
        const event = new CustomEvent('training-complete', {
            detail: data
        });
        document.dispatchEvent(event);
    }
    static onShoot(callback) {
        document.addEventListener('shoot', (event) => {
            callback(event.detail);
        });
    }

    static dispatchOnShoot(data) {
        const event = new CustomEvent('shoot', {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onTrainingComplete(callback) {
        document.addEventListener('training-complete', (event) => {
            callback(event.detail);
        });
    }

    static dispatchRunModel(data) {
        const event = new CustomEvent('run-model', {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onRunModel(callback) {
        document.addEventListener('run-model', (event) => {
            callback(event.detail);
        });
    }
}