import { useCallback, useEffect, useRef, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import bottomNavFrame from './public/Frame.svg'
import captureButtonSvg from './public/button.svg'
import scanIndicatorSvg from './public/scanner.svg'
import centerScanIcon from './public/Vector.svg'
import addPlantButtonSvg from './public/addplant.svg'
import heroPlantImage from './public/1.png'
import waterTaskImage from './public/2.png'
import cutTaskImage from './public/3.png'
import repotTaskImage from './public/4.png'
import collectionPlantImage from './public/5.png'

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

function DesktopOnlyNotice() {
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

function PlantOverviewPage() {
  const navigate = useNavigate()

  return (
    <main className="plant-page-shell">
      <section className="plant-hero" aria-label="Plant overview hero">
        <img src={heroPlantImage} alt="Plant hero" className="hero-image" />
      </section>

      <section className="plant-content">
        <div className="plant-header-row">
          <h1 className="plant-name">Coco</h1>
          <div className="plant-age-pill">
            <button type="button" aria-label="Previous week">&#8249;</button>
            <span>6 weeks</span>
            <button type="button" aria-label="Next week">&#8250;</button>
          </div>
        </div>

        <div className="plant-stats-list">
          <article className="plant-stat-card">
            <span>Water</span>
            <strong className="ok">50% good</strong>
          </article>
          <article className="plant-stat-card">
            <span>Soil</span>
            <strong className="bad">10% bad</strong>
          </article>
          <article className="plant-stat-card">
            <span>Fertilizer</span>
            <strong className="ok">20% good</strong>
          </article>
          <article className="plant-stat-card">
            <span>Temperature</span>
            <strong className="ok">22C good</strong>
          </article>
        </div>

        <h2 className="plant-section-title">To Do</h2>
        <div className="plant-todo-list">
          <article className="plant-todo-card">
            <img src={waterTaskImage} alt="Water task" className="todo-image" />
            <button type="button" className="plant-todo-action">Water me</button>
          </article>
          <article className="plant-todo-card">
            <img src={cutTaskImage} alt="Cut task" className="todo-image" />
            <button type="button" className="plant-todo-action">Cut me</button>
          </article>
          <article className="plant-todo-card">
            <img src={repotTaskImage} alt="Repot task" className="todo-image" />
            <button type="button" className="plant-todo-action">Repot me</button>
          </article>
        </div>

        <h2 className="plant-section-title">See Your Collection</h2>
        <article className="collection-card">
          <img src={collectionPlantImage} alt="Collection plant" className="collection-image" />
          <div className="collection-meta">
            <p>Alberto the Cactus</p>
            <p>2 years old</p>
          </div>
        </article>
      </section>

      <img src={bottomNavFrame} alt="" aria-hidden="true" className="bottom-nav-frame plant-nav-frame" />
      <button
        type="button"
        className="nav-center-button plant-nav-center-button"
        aria-label="Back to scanner"
        onClick={() => navigate('/')}
      >
        <img src={centerScanIcon} alt="" />
      </button>
    </main>
  )
}

function ScannerPage() {
  const navigate = useNavigate()
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
    startCamera()

    return () => {
      clearScanTimers()
      stopCamera()
    }
  }, [clearScanTimers, startCamera, stopCamera])

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
      navigate('/plant')
      addPlantCloseTimerRef.current = null
    }, 260)
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
      <button
        type="button"
        className="nav-center-button"
        aria-label="Open add plant page"
        onClick={() => navigate('/plant')}
      >
        <img src={centerScanIcon} alt="" />
      </button>

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

function App() {
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

  if (!isMobileViewport) {
    return <DesktopOnlyNotice />
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ScannerPage />} />
        <Route path="/plant" element={<PlantOverviewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
