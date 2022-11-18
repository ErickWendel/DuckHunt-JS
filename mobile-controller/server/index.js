import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { createServer } from 'node:http'

import cors from 'cors'
import express from 'express'
import { Server } from 'socket.io'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: false
  }
})

app.use(cors())
app.use('/', express.static(join(root, 'public')))


io.on('connection', async function (socket) {
  console.log('somebody connected!', socket.id)

  // send to itself to register connectionId
  socket.emit('connection', { id: socket.id })

  socket.on('shoot', async function (data) {
    const gameScreen = io.to(data.connectedGameScreenId)
    gameScreen.emit('shoot', {
      x: data.x,
      y: data.y
    })
  })

  socket.on('move', async function (data) {
    const gameScreen = io.to(data.connectedGameScreenId)
    gameScreen.emit('move-aim', data)
  })

  socket.on('end', async function (message) {
    const gameScreen = io.to(message.connectedGameScreenId)
    gameScreen.emit('end')
  })
})

const port = process.env.PORT || 3000
server.listen(port, () => console.log(`server running at ${port}`))