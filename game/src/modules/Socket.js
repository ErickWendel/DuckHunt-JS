import io from 'socket.io-client';
class Socket {

  static connect({
    url,
    eventEmitter
  }) {
    this.url = url;

    const socket = this.socket = io(url);
    socket.io.on('close', this._onClose.bind(this));
    socket.io.on('open', this._onOpen.bind(this));
    socket.on('error', this._onError.bind(this));

    [
      'connection',
      'shoot',
      'move-aim',
      'end',
    ].map((e) => socket.on(e, (msg) => eventEmitter.emit(e, msg)));

  }

  static _onError(error) {
    // eslint-disable-next-line no-console
    console.error('socket error!', error);
  }

  static _onClose(message) {
    // eslint-disable-next-line no-console
    console.log('on close!', message);
  }

  static _onOpen() {
    // eslint-disable-next-line no-console
    console.log('connection succeded!');
  }

  static emit(channel, data) {
    this.socket.emit(channel, data);
  }
}

export default Socket;