import Util from "./util.js"
import startAnimation from '../animation.js'

const $ = document.querySelector.bind(document)

class App {
  constructor() {
    this.socket = {}

    this.connectedGameScreenId = ""
    this.animationFrameLoop = {}
    this.acceleration = {
      x: 0,
      y: 0,
      z: 0
    }
    this.accelerationIncludingGravity = {
      x: 0,
      y: 0,
      z: 0
    }
    this.alphaZ = 1
    this.betaX = 0
    this.gammaY = 0
    this.type = ""
  }

  static initialize() {
    const app = new App()
    // window.start = app.onStart.bind(app)
    // window.stop = app.onStop.bind(app)
    // alert('ae')

    app.onStart();
    return
  }

  disableCommands() {
    console.log('commands are disabled!')
    // ['start', 'stop'].map(el => $(`#${el}`).toggleAttribute('disabled'))
    // $('#status').innerHTML =
    //   `<br><br><strong>You need to access the game page first! <br>Go to <a target='__blank' href='${this.gameUrl}'>Game URL</a> and follow instructions</strong>`
    return
  }

  connectToSocket(onOpen) {
    const socket = io()
    socket.io.on('open', () => {
      console.log('connection stablished!')
      onOpen()
    })
    socket.io.on('close', () => {
      console.log(`connection closed!`)
    })

    this.socket = socket
  }

  onStop() {
    this._stopLoop()
    this.socket.emit("end", {
      connectedGameScreenId: this.connectedGameScreenId
    })
  }

  _stopLoop() {
    cancelAnimationFrame(this.animationFrameLoop)
  }

  async requestPermissions() {
    if (!window.DeviceOrientationEvent) {
      alert("Sorry, your browser doesn't support Device Orientation")
      return false
    }
    if (!window.DeviceMotionEvent) {
      alert("Sorry, your browser doesn't support Device Motion")
      return false
    }
    if (!Util.isMobileDevice()) {
      return true
    }

    Util.log('is touch device! ')
    return true
  }

  async onStart() {
    try {
      const id = this.connectedGameScreenId = new URLSearchParams(window.location.search).get('id')
      if (!id) {
        return this.disableCommands()
      }

      if (!(await this.requestPermissions())) {
        this.disableCommands()
        return;
      }
      this.connectToSocket(() => {
        this.initSensorsLoop()
        this.initializeDataLoop()
        this.setupShooter()

      });

    } catch (error) {
      Util.log(`error: ${error}`)
    }
  }

  setupShooter() {
    window.document.querySelector('html').onclick = () => {
      startAnimation();
      this.socket.emit('shoot', {
        x: this.alphaZ * -1,
        y: this.gammaY,

        // help on training
        // accelerationX: this.acceleration.x,
        // accelerationY: this.acceleration.y,
        // accelerationZ: this.acceleration.z,
        giroXBeta: this.betaX,
        giroYGamma: this.gammaY,
        giroZAlpha: this.alphaZ,

        connectedGameScreenId: this.connectedGameScreenId
      })
    }
  }
  initSensorsLoop() {
    const isMobile = Util.isMobileDevice()
    const event = isMobile ? 'devicemotion' : 'deviceorientation'
    if (isMobile) {

      const onclick = async () => {
        await DeviceMotionEvent.requestPermission()
        window.removeEventListener('click', onclick);
      }

      window.addEventListener('click', onclick);
    }

    window.addEventListener(event, (event) => {
      // this.acceleration = event.acceleration
      // this.accelerationIncludingGravity = event.accelerationIncludingGravity
      const data = isMobile ? event.rotationRate : event
      this.alphaZ = data.alpha
      this.gammaY = data.gamma
      this.betaX = data.beta
    }, true)
  }

  initializeDataLoop() {
    this.animationFrameLoop = requestAnimationFrame(this.initializeDataLoop.bind(this))
    if (!this.alphaZ) return
    Util.log(`alpha: ${this.alphaZ}\ngamma: ${this.gammaY}\nbeta: ${this.betaX}`)
    Util.log(`acceleration: ${JSON.stringify(this.acceleration)}\n`)
    Util.log(`accelerationIncludingGravity: ${JSON.stringify(this.accelerationIncludingGravity)}\n`)

    if (!this.connectedGameScreenId) return

    this.socket.emit(
      "move", {
        connectedGameScreenId: this.connectedGameScreenId,
        // invert machine
        x: this.alphaZ * -1,
        y: this.gammaY,

        // // help on training
        // accelerationX: this.acceleration.x,
        // accelerationY: this.acceleration.y,
        // accelerationZ: this.acceleration.z,
        giroXBeta: this.betaX,
        giroYGamma: this.gammaY,
        giroZAlpha: this.alphaZ
      }
    )
  }
}

App.initialize()