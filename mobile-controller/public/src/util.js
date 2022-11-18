let counter = 0;
class Util {
  constructor() {}
  static isMobileDevice() {
    return typeof DeviceOrientationEvent['requestPermission'] === 'function'
  }

  static log(msg) {
    return;
    const container = document.getElementById('log')
    container.textContent = `[${++counter}] ${msg} \n${container.textContent}`
  }
}

export default Util