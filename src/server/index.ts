import { createApp } from './app'
import { config } from './config'

const app = createApp()

app.listen(config.port, config.host, () => {
  console.info(`Matchday Ops AI API listening on http://${config.host}:${config.port}`)
})
