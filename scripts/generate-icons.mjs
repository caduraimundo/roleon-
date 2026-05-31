import sharp from 'sharp'
import { readFileSync } from 'fs'
import { mkdir } from 'fs/promises'

await mkdir('public/icons', { recursive: true })

const svg192 = readFileSync('public/icons/icon-192.svg')
const svg512 = readFileSync('public/icons/icon-512.svg')

await sharp(svg192).resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp(svg512).resize(512, 512).png().toFile('public/icons/icon-512.png')

console.log('Ícones gerados com sucesso')
