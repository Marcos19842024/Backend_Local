import "dotenv/config"
import express from "express"
import cors from "cors"
import routes from "./infrastructure/router"

var history = require('connect-history-api-fallback')
const port = process.env.PORT || 3001
const path = `${process.cwd()}/`
const app = express()

app.use(history())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: false, limit: '50mb' }))
app.use(express.static(path + 'dist/ecommerce/dist/'))
app.use(express.static(path + 'tmp'))
app.use(`/`,routes)

app.listen(port, () => console.log(`Ready...${port}`))