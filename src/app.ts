import express from 'express'
import * as bodyParser from 'body-parser'
import indexRoutes from './routes/index'
import * as path from 'path'

const app = express()
const port = 3000

// Use body-parser middleware
app.use(bodyParser.json({ limit: '10mb' })) // Adjust size as needed
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))

// Serve the static CSS files
app.use('/css', express.static(path.join(__dirname, '../css')))

// All routes for the app are here
app.use('/', indexRoutes)

app.listen(port, () => {
  console.log(`App is listening on port ${port}`)
  console.log(`Open http://localhost:${port} in your browser`)
})

module.exports = app

// 3296179
// 10278879
