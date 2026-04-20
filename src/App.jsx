import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import bottomNavFrame from './public/Frame.svg'
import captureButtonSvg from './public/button.svg'
import scanIndicatorSvg from './public/scanner.svg'
import centerScanIcon from './public/Vector.svg'
import addPlantButtonSvg from './public/addplant.svg'

const MOBILE_MAX_WIDTH = 1100

const getIsMobileViewport = () => {
  if (typeof window === 'undefined') {
    return true
  }

  const isTouchDevice =
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches

  const isNarrowViewport = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches

  return isTouchDevice || isNarrowViewport
}

function App() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanProgressTimerRef = useRef(null)
  const scanFinishTimerRef = useRef(null)
  const foundHideTimerRef = useRef(null)
  const recognitionHideTimerRef = useRef(null)
  const addPlantCloseTimerRef = useRef(null)

  const [isCameraReady, setIsCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState('')
  const [scanPhase, setScanPhase] = useState('idle')
  const [scanProgress, setScanProgress] = useState(0)
  const [showRecognitionStatus, setShowRecognitionStatus] = useState(false)
  const [isRecognitionClosing, setIsRecognitionClosing] = useState(false)
  const [isAddPlantClosing, setIsAddPlantClosing] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport)

  useEffect(() => {
    const handleViewportChange = () => {
      setIsMobileViewport(getIsMobileViewport())
    }

    handleViewportChange()
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)

    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
    }
  }, [])

  const clearScanTimers = useCallback(() => {
    if (scanProgressTimerRef.current) {
      clearInterval(scanProgressTimerRef.current)
      scanProgressTimerRef.current = null
    }
    if (scanFinishTimerRef.current) {
      clearTimeout(scanFinishTimerRef.current)
      scanFinishTimerRef.current = null
    }
    if (foundHideTimerRef.current) {
      clearTimeout(foundHideTimerRef.current)
      foundHideTimerRef.current = null
    }
    if (recognitionHideTimerRef.current) {
      clearTimeout(recognitionHideTimerRef.current)
      recognitionHideTimerRef.current = null
    }
    if (addPlantCloseTimerRef.current) {
      clearTimeout(addPlantCloseTimerRef.current)
      addPlantCloseTimerRef.current = null
    }
  }, [])

  const closeRecognitionStatus = useCallback(() => {
    setIsRecognitionClosing(true)

    if (recognitionHideTimerRef.current) {
      clearTimeout(recognitionHideTimerRef.current)
    }

    recognitionHideTimerRef.current = setTimeout(() => {
      setShowRecognitionStatus(false)
      setIsRecognitionClosing(false)
      recognitionHideTimerRef.current = null
    }, 260)
  }, [])

  const stopCamera = useCallback(() => {
    if (!streamRef.current) return
    streamRef.current.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsCameraReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')

    try {
      stopCamera()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsCameraReady(true)
    } catch (error) {
      setCameraError('Camera access failed. Allow camera permission and try again.')
    }
  }, [stopCamera])

  useEffect(() => {
    if (!isMobileViewport) {
      clearScanTimers()
      stopCamera()
      return
    }

    startCamera()

    return () => {
      clearScanTimers()
      stopCamera()
    }
  }, [clearScanTimers, isMobileViewport, startCamera, stopCamera])

  const handleCapture = () => {
    if (!videoRef.current || !isCameraReady) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    setCapturedPhoto(dataUrl)
    setScanPhase('scanning')
    setScanProgress(0)
    setShowRecognitionStatus(true)
    setIsRecognitionClosing(false)
    setIsAddPlantClosing(false)

    clearScanTimers()

    const durationMs = 3200
    const tickMs = 80
    let elapsedMs = 0

    scanProgressTimerRef.current = setInterval(() => {
      elapsedMs += tickMs
      const progress = Math.min(100, Math.round((elapsedMs / durationMs) * 100))
      setScanProgress(progress)
    }, tickMs)

    scanFinishTimerRef.current = setTimeout(() => {
      clearScanTimers()
      setScanProgress(100)
      setScanPhase('found')

      foundHideTimerRef.current = setTimeout(() => {
        closeRecognitionStatus()
      }, 2000)
    }, durationMs)
  }

  const handleAddPlantClick = () => {
    clearScanTimers()
    closeRecognitionStatus()
    setIsAddPlantClosing(true)

    if (addPlantCloseTimerRef.current) {
      clearTimeout(addPlantCloseTimerRef.current)
    }

    addPlantCloseTimerRef.current = setTimeout(() => {
      setCapturedPhoto('')
      setScanPhase('idle')
      setScanProgress(0)
      setShowRecognitionStatus(false)
      setIsRecognitionClosing(false)
      setIsAddPlantClosing(false)
      addPlantCloseTimerRef.current = null
    }, 260)
  }

  if (!isMobileViewport) {
    return (
      <main className="desktop-only-shell" role="alert" aria-live="polite">
        <section className="desktop-only-card">
          <h1>Mobile app only</h1>
          <p>This experience is designed for phone screens.</p>
          <p>Open this app on your mobile device to use the camera scanner.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="camera-stage" aria-label="Live camera view">
        <video ref={videoRef} playsInline muted autoPlay className="camera-preview" />
        {capturedPhoto ? (
          <img
            src={capturedPhoto}
            alt="Captured result"
            className={`captured-photo-overlay${scanPhase === 'scanning' ? ' is-scanning' : ''}`}
          />
        ) : null}
        {cameraError ? <p className="status error camera-error">{cameraError}</p> : null}

        <div className="capture-stack">
          <p className={`position-hint${scanPhase === 'idle' ? ' is-visible' : ''}`}>Position plant in frame</p>
          <div className="scan-wrap" aria-hidden="true">
            <img src={scanIndicatorSvg} alt="" className="scan-indicator" />
            <span className="scan-line" />
            {showRecognitionStatus ? (
              <div className={`scan-status${isRecognitionClosing ? ' is-closing' : ''}`} aria-live="polite">
                <p className="scan-status-text">{scanPhase === 'found' ? 'Plant found' : 'Scanning...'}</p>
                <div className="scan-progress-track" role="presentation">
                  <span
                    className={`scan-progress-fill${scanPhase === 'found' ? ' is-found' : ''}`}
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleCapture}
            className={`capture-btn${scanPhase === 'found' ? ' is-hidden' : ''}`}
            disabled={!isCameraReady || scanPhase === 'scanning'}
            aria-label="Take photo"
          >
            <img src={captureButtonSvg} alt="" aria-hidden="true" />
          </button>
        </div>
      </section>

      <img src={bottomNavFrame} alt="" aria-hidden="true" className="bottom-nav-frame" />
      <div className="nav-center-button" aria-hidden="true">
        <img src={centerScanIcon} alt="" />
      </div>

      {scanPhase === 'found' ? (
        <button
          type="button"
          className={`add-plant-button${isAddPlantClosing ? ' is-closing' : ''}`}
          aria-label="Add plant to collection"
          onClick={handleAddPlantClick}
        >
          <img src={addPlantButtonSvg} alt="" aria-hidden="true" />
        </button>
      ) : null}
    </main>
  )
}

export default App
