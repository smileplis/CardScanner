import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileDown, Trash2, Loader2, Scan, Building2, User, Phone, Mail, Globe, MapPin, X, CreditCard, Camera } from 'lucide-react';
import { BusinessCard } from './types';
import { fileToBase64, generateCSV, downloadCSV } from './utils';
import { motion, AnimatePresence } from 'motion/react';
import CameraView from './components/CameraView';

export default function App() {
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from cache on mount
  useEffect(() => {
    const cachedCards = localStorage.getItem('business-cards');
    if (cachedCards) {
      try {
        setCards(JSON.parse(cachedCards));
      } catch (e) {
        console.error("Failed to load cards from cache", e);
      }
    }
  }, []);

  // Save to cache whenever cards change
  useEffect(() => {
    localStorage.setItem('business-cards', JSON.stringify(cards));
  }, [cards]);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    setError(null);
    setIsScanning(true);

    try {
      const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const images = files.filter(f => validImageTypes.includes(f.type));
      
      if (images.length === 0) {
        throw new Error('Please select valid image files (JPG, PNG, WEBP).');
      }

      const imagePayloads = await Promise.all(
        images.map(async (file) => ({
          data: await fileToBase64(file),
          mimeType: file.type
        }))
      );

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagePayloads }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan images.');
      }

      const data = await response.json();
      
      if (data.cards && Array.isArray(data.cards)) {
        const newCards: BusinessCard[] = data.cards.map((card: any) => ({
          id: generateId(),
          name: card.name || '',
          jobTitle: card.jobTitle || '',
          company: card.company || '',
          email: card.email || '',
          phone: card.phone || '',
          website: card.website || '',
          address: card.address || '',
          createdAt: Date.now()
        }));

        setCards(prev => [...newCards, ...prev]);
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    if (cards.length === 0) return;
    const csv = generateCSV(cards);
    downloadCSV(csv, `business-cards-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDelete = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };
  
  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all scanned cards?")) {
        setCards([]);
    }
  };

  return (
    <div className="h-screen w-full bg-[#F9FAFB] flex flex-col font-sans text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="h-16 px-6 md:px-8 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <Scan className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">CardVault</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:block text-sm text-gray-500 mr-2">{cards.length} items in cache</div>
          {cards.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Cache
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={cards.length === 0}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Export CSV</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
          
          {/* Upload Area */}
          <section>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isScanning && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg py-12 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                dragActive 
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-500' 
                  : 'border-gray-300 hover:border-indigo-400 hover:text-indigo-500 bg-gray-50 text-gray-400'
              } ${isScanning ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleChange}
                className="hidden"
              />
              
              {isScanning ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Scanning Cards...</span>
                  <span className="text-[10px] text-gray-500">Extracting details using Gemini AI</span>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 mb-2" strokeWidth={1.5} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Click to upload or drag & drop</span>
                  <span className="text-[10px] font-medium">JPG, PNG, or WEBP (Multiple allowed)</span>
                </motion.div>
              )}
            </div>
            
            {!isScanning && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  Use Camera
                </button>
              </div>
            )}
            
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">{error}</div>
                  <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 mt-0.5">
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Results Grid */}
          <section className="flex-1 pb-8">
            {cards.length === 0 && !isScanning ? (
              <div className="text-center py-24 text-gray-400">
                <div className="mx-auto w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 bg-gray-50">
                  <CreditCard className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium">No business cards scanned yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {cards.map((card) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={card.id}
                      className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-200 p-8 flex flex-col justify-between relative overflow-hidden group min-h-[250px] transition-shadow"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full opacity-50 transition-colors group-hover:bg-indigo-100/70"></div>
                      
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                        title="Delete card"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="relative z-10 mb-6">
                        <h2 className="text-2xl font-light tracking-tight text-gray-900 truncate pr-8" title={card.name}>{card.name || 'Unknown Name'}</h2>
                        <p className="text-indigo-600 font-medium tracking-widest uppercase text-[10px] mt-1 truncate" title={card.jobTitle}>{card.jobTitle || 'No Title'}</p>
                        {card.company && <p className="text-xs font-medium text-gray-500 mt-1 truncate" title={card.company}>{card.company}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 relative z-10 mt-auto">
                        <div className="flex flex-col gap-1">
                          <p className="font-semibold text-gray-400 uppercase tracking-tighter mb-1">Contact</p>
                          <p className="truncate" title={card.email}>{card.email || '—'}</p>
                          <p className="truncate" title={card.phone}>{card.phone || '—'}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="font-semibold text-gray-400 uppercase tracking-tighter mb-1">Location / Web</p>
                          <p className="truncate" title={card.address}>{card.address || '—'}</p>
                          <p className="truncate" title={card.website}>{card.website || '—'}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Camera Overlay */}
      {showCamera && (
        <CameraView
          onClose={() => setShowCamera(false)}
          onCapture={(file) => {
            setShowCamera(false);
            processFiles([file]);
          }}
        />
      )}

      {/* Bottom Status Bar */}
      <footer className="h-10 bg-white border-t border-gray-200 px-6 flex items-center justify-between text-[11px] text-gray-400 shrink-0">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            System Ready
          </span>
          <span className="hidden sm:inline">Engine: Gemini AI</span>
        </div>
        <div className="flex items-center space-x-4 uppercase tracking-widest font-bold text-[10px]">
          <span className="hidden sm:inline">Syncing to local storage</span>
          <span className="text-indigo-500">Storage: {cards.length} items</span>
        </div>
      </footer>
    </div>
  );
}
