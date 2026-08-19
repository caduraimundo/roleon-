'use client'

import { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function getCroppedBlob(imageSrc: string, cropPixels: Area, mimeType: string): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = cropPixels.width
  canvas.height = cropPixels.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas não suportado')

  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, cropPixels.width, cropPixels.height
  )

  const type = mimeType || 'image/jpeg'
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => { blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem')) },
      type,
      0.92
    )
  })
}

export default function ImageCropModal({
  imageSrc,
  aspect,
  onConfirm,
  onCancel,
}: {
  imageSrc: string
  aspect: number
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [confirming, setConfirming] = useState(false)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels || confirming) return
    setConfirming(true)
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, 'image/jpeg')
      onConfirm(blob)
    } catch {
      setConfirming(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      <button
        onClick={onCancel}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 1001,
          width: 24, height: 24, borderRadius: '50%',
          background: '#F0F0F0', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#1A1A1A', padding: 0,
        }}
        aria-label="Fechar"
      >
        <IconClose />
      </button>

      <div style={{ position: 'relative', flex: 1 }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ width: '100%' }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 44,
              background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: 8,
              color: '#1A1A1A', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              flex: 1, height: 44,
              background: '#0EA5A0', border: 'none', borderRadius: 8,
              color: '#FFFFFF', fontSize: 14, fontWeight: 600,
              cursor: confirming ? 'default' : 'pointer', opacity: confirming ? 0.7 : 1,
            }}
          >{confirming ? 'Processando...' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}
