import "dotenv/config"
import express from "express"
import cors from "cors"
import routes from "./infrastructure/router"

function abrirPagina(url: string): void {
  window.open(url, '_blank'); // Abre en una nueva pestaña o ventana
}

const port = process.env.PORT || 3001
const path = `${process.cwd()}/`
const app = express()
var history = require('connect-history-api-fallback')

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: false, limit: '50mb' }))
app.use(`/`,routes)
app.use(history())
app.use(express.static(path + 'dist/Ecommerce_Local/dist/'))
app.use(express.static(path + 'tmp'))

app.listen(port, () => console.log(`Ready...${port}`))
abrirPagina(`${process.env.URL}`);