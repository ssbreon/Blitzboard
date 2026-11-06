import { readFile, writeFile } from 'node:fs/promises'

const apiBaseUrl = process.env.VITE_API_BASE_URL
if (!apiBaseUrl) throw new Error('VITE_API_BASE_URL is required for deployment')

const apiUrl = new URL(apiBaseUrl)
if (apiUrl.protocol !== 'https:' || apiUrl.username || apiUrl.password || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash) {
  throw new Error('VITE_API_BASE_URL must be an HTTPS origin without credentials, path, query, or fragment')
}

const configPath = new URL('../dist/staticwebapp.config.json', import.meta.url)
const config = JSON.parse(await readFile(configPath, 'utf8'))
const policyName = 'Content-Security-Policy'
const directives = config.globalHeaders?.[policyName]?.split(';').map((item) => item.trim()).filter(Boolean)
if (!directives) throw new Error(`${policyName} is missing from staticwebapp.config.json`)

const connectIndex = directives.findIndex((item) => item.startsWith('connect-src '))
if (connectIndex < 0) throw new Error(`connect-src is missing from ${policyName}`)
const connectSources = directives[connectIndex].split(/\s+/)
if (!connectSources.includes(apiUrl.origin)) connectSources.push(apiUrl.origin)
directives[connectIndex] = connectSources.join(' ')
config.globalHeaders[policyName] = directives.join('; ')

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`)
