export default class Events {

    static dispatchTrainModel(data = {}) {
        const event = new CustomEvent('train-model', {
            detail: data
        });
        return document.dispatchEvent(event);
    }

    static onTrainModel(callback) {
        return document.addEventListener('train-model', (event) => {
            callback(event.detail);
        });
    }

    static onTrainModel(callback) {
        return document.addEventListener('train-model', (event) => {
            callback(event.detail);
        });
    }
    static dispatchTrainingConfig(data) {
        const event = new CustomEvent('training-config', {
            detail: data
        });
        return document.dispatchEvent(event);
    }

    static onTrainingConfig(callback) {
        return document.addEventListener('training-config', (event) => {
            callback(event.detail);
        });
    }

    static dispatchStopCapture() {
        return document.dispatchEvent(new CustomEvent('stop-capture'));
    }

    static onStopCapture(callback) {
        return document.addEventListener('stop-capture', e => callback(e.detail));
    }

    static dispatchStartCapture() {
        return document.dispatchEvent(new CustomEvent('start-capture'));
    }

    static onStartCapture(callback) {
        return document.addEventListener('start-capture', e => callback(e.detail));
    }

    static dispatchTrainingComplete(data) {
        const event = new CustomEvent('training-complete', {
            detail: data
        });
        return document.dispatchEvent(event);
    }

    static onShoot(callback) {
        return document.addEventListener('shoot', (event) => {
            callback(event.detail);
        });
    }

    static dispatchOnShoot(data) {
        const event = new CustomEvent('shoot', {
            detail: data
        });
        return document.dispatchEvent(event);
    }

    static onTrainingComplete(callback) {
        return document.addEventListener('training-complete', (event) => {
            callback(event.detail);
        });
    }

    static dispatchRunModel(data) {
        const event = new CustomEvent('run-model', {
            detail: data
        });
        return document.dispatchEvent(event);
    }

    static onRunModel(callback) {
        return document.addEventListener('run-model', (event) => {
            callback(event.detail);
        });
    }
}