import fs from 'fs'

export function getVersion() {
  const raw = fs.readFileSync('../../package.json', 'utf8')
  const json = JSON.parse(raw)

  return json.version
}
