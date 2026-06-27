import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraViewProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraView({ onCapture, onClose }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const startCamera = useCallback(async () => {
    try {
      setIsInitializing(true);
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to actually start playing
        videoRef.current.onplaying = () => setIsInitializing(false);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError(err.message || 'Could not access the camera. Please check permissions.');
      setIsInitializing(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            stopCamera();
            onCapture(file);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      <button 
        onClick={handleClose}
        className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
      >
        <X size={24} />
      </button>

      <div className="relative w-full max-w-2xl aspect-video md:aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-2xl">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white gap-4">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium tracking-wide uppercase">Initializing Camera</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
            <div className="text-red-400 mb-2">
              <Camera size={48} strokeWidth={1} />
            </div>
            <p className="text-lg font-semibold mb-2">Camera Access Denied</p>
            <p className="text-sm text-white/70 max-w-md">{error}</p>
            <button 
              onClick={startCamera}
              className="mt-6 px-6 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button
          onClick={capture}
          disabled={!!error || isInitializing}
          className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center shadow-[0_0_0_4px_rgba(255,255,255,0.2)]"
        >
          <div className="w-16 h-16 bg-white rounded-full border border-gray-200" />
        </button>
      </div>
    </div>
  );
}
