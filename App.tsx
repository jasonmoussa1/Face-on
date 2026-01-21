
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Film, 
  User, 
  Sparkles, 
  Download, 
  AlertCircle, 
  Loader2, 
  X,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  Library,
  Clock,
  MessageSquare,
  Smartphone,
  Maximize2,
  Video,
  Play,
  Ticket,
  ChevronRight
} from 'lucide-react';
import { FaceImage, GenerationState, GenerationAsset, AspectRatio } from './types';
import { swapFacesInPoster, animatePoster } from './services/geminiService';

export default function App() {
  const [poster, setPoster] = useState<string | null>(null);
  const [faces, setFaces] = useState<FaceImage[]>([]);
  const [instructions, setInstructions] = useState('');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("3:4");
  const [previewMode, setPreviewMode] = useState<'image' | 'video'>('image');
  
  // Vault state
  const [history, setHistory] = useState<GenerationAsset[]>([]);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  
  const [generation, setGeneration] = useState<GenerationState>({
    isGenerating: false,
    isAnimating: false,
    error: null,
    resultUrl: null,
    videoUrl: null,
  });
  
  const [needsKey, setNeedsKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setNeedsKey(!hasKey);
      }
    } catch (e) {
      console.error("Failed to check API key", e);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setNeedsKey(false);
    }
  };

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPoster(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const remainingSlots = 4 - faces.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFaces(prev => {
            if (prev.length >= 4) return prev;
            return [...prev, { id: crypto.randomUUID(), data: reader.result as string }];
          });
        };
        reader.readAsDataURL(file);
      });
    }
    e.target.value = '';
  };

  const generate = async () => {
    if (!poster || faces.length === 0) {
      setGeneration(prev => ({ ...prev, error: "Please upload a poster and at least one star identity." }));
      return;
    }
    setGeneration({ isGenerating: true, isAnimating: false, error: null, resultUrl: null, videoUrl: null });
    setPreviewMode('image');

    try {
      const result = await swapFacesInPoster(poster, faces.map(f => f.data), instructions, selectedRatio);
      const newAsset: GenerationAsset = {
        id: crypto.randomUUID(),
        imageUrl: result,
        aspectRatio: selectedRatio,
        timestamp: Date.now()
      };
      setHistory(prev => [newAsset, ...prev]);
      setActiveAssetId(newAsset.id);
      setGeneration(prev => ({ ...prev, isGenerating: false, resultUrl: result }));
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const startAnimation = async () => {
    const currentImageUrl = generation.resultUrl;
    if (!currentImageUrl || !activeAssetId) return;
    setGeneration(prev => ({ ...prev, isAnimating: true, error: null }));
    setPreviewMode('video');
    try {
      const videoUrl = await animatePoster(currentImageUrl, instructions, selectedRatio);
      setHistory(prev => prev.map(asset => asset.id === activeAssetId ? { ...asset, videoUrl } : asset));
      setGeneration(prev => ({ ...prev, isAnimating: false, videoUrl }));
    } catch (err: any) {
      handleApiError(err);
      setPreviewMode('image');
    }
  };

  const loadFromVault = (asset: GenerationAsset) => {
    setActiveAssetId(asset.id);
    setSelectedRatio(asset.aspectRatio);
    setGeneration(prev => ({
      ...prev,
      resultUrl: asset.imageUrl,
      videoUrl: asset.videoUrl || null,
      error: null
    }));
    setPreviewMode(asset.videoUrl ? 'video' : 'image');
  };

  const deleteFromVault = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(a => a.id !== id));
    if (activeAssetId === id) {
      setActiveAssetId(null);
      setGeneration(prev => ({ ...prev, resultUrl: null, videoUrl: null }));
    }
  };

  const handleApiError = (err: any) => {
    if (err.message === "API_KEY_ERROR") {
      setNeedsKey(true);
      setGeneration(prev => ({ ...prev, isGenerating: false, isAnimating: false, error: "Project API key required." }));
    } else {
      setGeneration(prev => ({ 
        ...prev, isGenerating: false, isAnimating: false,
        error: err.message || "Production error. Please try again." 
      }));
    }
  };

  const currentAsset = history.find(a => a.id === activeAssetId);
  const displayRatio = activeAssetId && currentAsset ? currentAsset.aspectRatio : selectedRatio;

  if (needsKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="max-w-md w-full glass-panel border-2 border-white/20 p-10 text-center rounded-[3rem] marquee-border">
          <Ticket className="w-20 h-20 text-yellow-400 mx-auto mb-8 animate-pulse" />
          <h1 className="text-4xl font-black font-cinematic mb-6">Cinema Studio</h1>
          <p className="text-zinc-400 mb-10 font-medium">Authentication required. Please connect your production key from AI Studio.</p>
          <button onClick={handleSelectKey} className="w-full py-5 bg-white text-black font-black font-cinematic text-2xl rounded-full hover:bg-yellow-400 transition-all transform active:scale-95 shadow-xl shadow-white/5">
            Unlock Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-yellow-400 selection:text-black">
      {/* Sleek Cinematic Header */}
      <header className="bg-black/80 backdrop-blur-xl border-b border-white/10 py-8 px-10 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="bg-white p-4 rounded-3xl -rotate-6 shadow-2xl shadow-white/10 group hover:rotate-0 transition-transform cursor-pointer">
               <Film className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-5xl font-black font-cinematic tracking-tight">
                Face<span className="text-yellow-400">Off</span>
              </h1>
              <div className="flex items-center mt-1 space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></div>
                <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-zinc-500">Premiere VFX Engine</p>
              </div>
            </div>
          </div>
          <div className="hidden lg:flex items-center space-x-6">
            <div className="flex flex-col items-end border-r border-white/10 pr-6">
              <span className="text-[10px] font-black font-cinematic text-zinc-600">PRODUCTION BATCH</span>
              <span className="text-sm font-mono text-zinc-300">#AFX-2025-VEO</span>
            </div>
            <div className="bg-zinc-900 px-6 py-2 rounded-full border border-white/5">
              <span className="text-[10px] font-black font-cinematic text-yellow-400">Status: Optimized</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left Column: Input Control */}
        <div className="lg:col-span-5 space-y-12">
          
          {/* Format Selection */}
          <section className="glass-panel p-8 rounded-[2.5rem] relative">
            <h2 className="text-[10px] font-black font-cinematic text-yellow-400 mb-6 uppercase tracking-[0.3em]">Screen Format</h2>
            <div className="grid grid-cols-2 gap-6">
              <button 
                onClick={() => setSelectedRatio("3:4")}
                className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all group ${selectedRatio === "3:4" ? 'border-yellow-400 bg-yellow-400/5' : 'border-white/5 bg-black/40 hover:border-white/20'}`}
              >
                <Maximize2 className={`w-8 h-8 mb-3 transition-colors ${selectedRatio === "3:4" ? 'text-yellow-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                <span className="text-sm font-black font-cinematic tracking-widest">3:4 Theater</span>
              </button>
              <button 
                onClick={() => setSelectedRatio("9:16")}
                className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all group ${selectedRatio === "9:16" ? 'border-yellow-400 bg-yellow-400/5' : 'border-white/5 bg-black/40 hover:border-white/20'}`}
              >
                <Smartphone className={`w-8 h-8 mb-3 transition-colors ${selectedRatio === "9:16" ? 'text-yellow-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                <span className="text-sm font-black font-cinematic tracking-widest">9:16 Mobile</span>
              </button>
            </div>
          </section>

          {/* Master Poster Upload */}
          <section className="bg-zinc-950 border-2 border-white/10 rounded-[3rem] p-3 shadow-2xl relative overflow-hidden group">
            <div className="bg-zinc-900/80 p-6 rounded-t-[2.5rem] flex items-center justify-between border-b border-white/5">
               <h2 className="text-sm font-black font-cinematic flex items-center tracking-widest">
                 <Film className="w-5 h-5 mr-3 text-yellow-400" /> Target Master
               </h2>
               {poster && <button onClick={() => setPoster(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>}
            </div>
            <div className="relative">
              {poster ? (
                <div className="h-[400px] w-full overflow-hidden bg-black flex items-center justify-center rounded-b-[2.5rem]">
                  <img src={poster} alt="Poster" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-[350px] rounded-b-[2.5rem] border-4 border-dashed border-zinc-900 bg-black hover:bg-zinc-900/40 hover:border-white/20 transition-all cursor-pointer group/label">
                  <input type="file" accept="image/*" onChange={handlePosterUpload} className="hidden" />
                  <div className="w-20 h-20 bg-white flex items-center justify-center rounded-full mb-6 group-hover/label:scale-110 shadow-xl transition-all">
                    <Upload className="w-10 h-10 text-black" />
                  </div>
                  <p className="font-cinematic font-black text-xl tracking-widest">Import Script</p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-3">High-res cinematic asset</p>
                </label>
              )}
            </div>
          </section>

          {/* Star Identity Gallery */}
          <section className="glass-panel p-8 rounded-[2.5rem] relative">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[10px] font-black font-cinematic text-yellow-400 uppercase tracking-[0.3em]">Star Identities (Max 4)</h2>
              <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold font-mono text-zinc-400 border border-white/5">{faces.length} / 4</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {faces.map((face) => (
                <div key={face.id} className="relative aspect-square rounded-[1.5rem] overflow-hidden bg-black border-2 border-white/10 group hover:border-white transition-all shadow-lg">
                  <img src={face.data} alt="Face" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                  <button onClick={() => setFaces(f => f.filter(x => x.id !== face.id))} className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 scale-90 group-hover:scale-100">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {faces.length < 4 && (
                <button onClick={() => fileInputRef.current?.click()} className="aspect-square flex flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-zinc-800 bg-black/40 hover:bg-zinc-900 hover:border-yellow-400 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-yellow-400 transition-colors">
                    <Plus className="w-6 h-6 text-zinc-600 group-hover:text-black" />
                  </div>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleFaceUpload} className="hidden" />
          </section>

          {/* Prompting */}
          <section className="glass-panel p-8 rounded-[2.5rem] relative">
            <h2 className="text-[10px] font-black font-cinematic text-yellow-400 mb-6 uppercase tracking-[0.3em]">Production Notes</h2>
            <div className="relative">
              <MessageSquare className="absolute top-4 left-4 w-4 h-4 text-zinc-600" />
              <textarea 
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="ADD ARTISTIC DIRECTION... (e.g. 'HEAVY NOIR SHADOWS', 'BLUE BACKLIGHTING')"
                className="w-full bg-black/40 border-2 border-white/5 rounded-[1.5rem] pl-12 pr-6 py-4 text-sm font-bold text-white focus:border-yellow-400 outline-none transition-all h-32 uppercase font-cinematic placeholder:text-zinc-800"
              />
            </div>
          </section>

          {/* Production Controls */}
          <div className="grid grid-cols-1 gap-6">
            <button
              onClick={generate}
              disabled={generation.isGenerating || generation.isAnimating || !poster || faces.length === 0}
              className={`w-full py-8 rounded-full font-cinematic font-black text-3xl shadow-2xl flex items-center justify-center transition-all transform active:scale-95 ${generation.isGenerating ? 'bg-zinc-900 text-zinc-700' : 'bg-white text-black hover:bg-yellow-400 hover:scale-[1.02] shadow-white/5'}`}
            >
              {generation.isGenerating ? <><Loader2 className="w-10 h-10 mr-4 animate-spin" /> Producing...</> : <><Sparkles className="w-10 h-10 mr-4" /> Start Production</>}
            </button>

            {generation.resultUrl && (
              <button
                onClick={startAnimation}
                disabled={generation.isAnimating}
                className={`w-full py-8 rounded-full font-cinematic font-black text-3xl shadow-2xl flex items-center justify-center transition-all transform active:scale-95 border-2 border-white/10 ${generation.isAnimating ? 'bg-zinc-900 text-zinc-700' : 'bg-black text-white hover:bg-zinc-900 hover:border-yellow-400'}`}
              >
                {generation.isAnimating ? <><Loader2 className="w-10 h-10 mr-4 animate-spin" /> Rendering...</> : <><Play className="w-10 h-10 mr-4 text-yellow-400" /> Animate Scene</>}
              </button>
            )}
          </div>

          {generation.error && (
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-[2rem] p-6 flex items-start text-red-400 animate-in fade-in slide-in-from-bottom-4">
              <AlertCircle className="w-6 h-6 mr-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-black font-cinematic uppercase tracking-widest leading-relaxed">{generation.error}</p>
            </div>
          )}
        </div>

        {/* Right Column: Preview Stage */}
        <div className="lg:col-span-7 space-y-12">
          <div className="sticky top-40 space-y-12">
            <div className="flex items-center justify-between border-b border-white/10 pb-8">
              <div className="flex bg-zinc-950 rounded-full border border-white/10 p-1.5 shadow-2xl">
                <button onClick={() => setPreviewMode('image')} className={`px-10 py-3 rounded-full text-[12px] font-black uppercase font-cinematic transition-all ${previewMode === 'image' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-500 hover:text-white'}`}>Static Reel</button>
                <button onClick={() => setPreviewMode('video')} disabled={!generation.videoUrl && !generation.isAnimating} className={`px-10 py-3 rounded-full text-[12px] font-black uppercase font-cinematic transition-all disabled:opacity-10 ${previewMode === 'video' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10' : 'text-zinc-500 hover:text-white'}`}>VFX Motion</button>
              </div>

              <div className="flex space-x-4">
                {(generation.resultUrl || generation.videoUrl) && (
                   <button onClick={() => { 
                     const a = document.createElement('a'); 
                     a.href = (previewMode === 'video' ? generation.videoUrl : generation.resultUrl)!; 
                     a.download = `FaceOff-Cinematic-${Date.now()}.${previewMode === 'video' ? 'mp4' : 'png'}`; 
                     a.click(); 
                   }} className="bg-zinc-900 border border-white/10 text-white w-14 h-14 flex items-center justify-center rounded-2xl hover:bg-white hover:text-black transition-all shadow-xl"><Download className="w-6 h-6" /></button>
                )}
                <button onClick={() => window.location.reload()} className="bg-zinc-950 border border-white/10 text-zinc-500 w-14 h-14 flex items-center justify-center rounded-2xl hover:border-white hover:text-white transition-all"><RefreshCw className="w-6 h-6" /></button>
              </div>
            </div>

            <div className={`relative mx-auto bg-black marquee-border yellow-glow flex items-center justify-center transition-all duration-1000 overflow-hidden ${displayRatio === "9:16" ? 'aspect-[9/16] h-[75vh]' : 'aspect-[3/4] h-[75vh]'}`}>
              {/* Modern Marquee Highlights */}
              <div className="absolute top-8 left-8 w-4 h-4 bg-yellow-400 rounded-full blur-[1px] shadow-[0_0_15px_rgba(251,191,36,0.8)]"></div>
              <div className="absolute top-8 right-8 w-4 h-4 bg-yellow-400 rounded-full blur-[1px] shadow-[0_0_15px_rgba(251,191,36,0.8)]"></div>
              <div className="absolute bottom-8 left-8 w-4 h-4 bg-yellow-400 rounded-full blur-[1px] shadow-[0_0_15px_rgba(251,191,36,0.8)]"></div>
              <div className="absolute bottom-8 right-8 w-4 h-4 bg-yellow-400 rounded-full blur-[1px] shadow-[0_0_15px_rgba(251,191,36,0.8)]"></div>

              {generation.isGenerating || (generation.isAnimating && previewMode === 'video') ? (
                <div className="text-center p-12 space-y-12 z-20">
                  <div className="relative">
                    <Loader2 className={`w-32 h-32 mx-auto animate-spin stroke-[1px] ${generation.isAnimating ? 'text-yellow-400' : 'text-white'}`} />
                    <Film className="w-12 h-12 absolute inset-0 m-auto text-zinc-600" />
                  </div>
                  <div>
                    <h3 className="text-6xl font-black font-cinematic italic tracking-tighter mb-6">Processing</h3>
                    <div className="flex flex-col space-y-3 text-[12px] font-black uppercase font-cinematic text-zinc-500 tracking-[0.4em]">
                       <p className="animate-pulse text-white">Synthesizing Asset Identity</p>
                       <p className="opacity-40">Neutralizing Light Curves</p>
                    </div>
                  </div>
                  <div className="h-1 bg-zinc-900/50 w-64 mx-auto rounded-full overflow-hidden">
                    <div className={`h-full animate-loading-bar origin-left ${generation.isAnimating ? 'bg-yellow-400' : 'bg-white'}`}></div>
                  </div>
                </div>
              ) : previewMode === 'video' && generation.videoUrl ? (
                <video src={generation.videoUrl} autoPlay loop playsInline className="w-full h-full object-cover rounded-[2.5rem]" />
              ) : generation.resultUrl ? (
                <img src={generation.resultUrl} alt="Result" className="w-full h-full object-cover rounded-[2.5rem]" />
              ) : (
                <div className="text-center p-20 text-zinc-900 space-y-10 group">
                  <Film className="w-32 h-32 mx-auto opacity-10 group-hover:opacity-20 transition-opacity" />
                  <p className="font-cinematic font-black text-3xl tracking-[0.3em] uppercase opacity-10">Production Stage</p>
                </div>
              )}
            </div>

            {/* Archive Section - Refined Film Strip */}
            <section className="glass-panel p-10 rounded-[3rem] relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black font-cinematic text-yellow-400 flex items-center tracking-widest">
                  <Library className="w-5 h-5 mr-3" /> Production Vault
                </h3>
              </div>
              
              <div className="flex space-x-8 overflow-x-auto pb-8 film-strip pr-10">
                {history.length === 0 ? (
                  <div className="w-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-zinc-900 rounded-[2rem] text-zinc-800">
                     <Clock className="w-10 h-10 mb-4 opacity-50" />
                     <p className="text-[12px] font-black font-cinematic uppercase tracking-[0.4em]">Vault Empty</p>
                  </div>
                ) : (
                  history.map((asset) => (
                    <button 
                      key={asset.id} 
                      onClick={() => loadFromVault(asset)}
                      className={`relative flex-shrink-0 w-32 aspect-[3/4] rounded-[1.5rem] border-4 transition-all duration-300 overflow-hidden transform hover:scale-105 active:scale-95 ${activeAssetId === asset.id ? 'border-yellow-400 shadow-xl shadow-yellow-400/10' : 'border-zinc-900 hover:border-white/40'}`}
                    >
                      <img src={asset.imageUrl} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 flex flex-col space-y-1.5">
                        {asset.videoUrl && <div className="bg-yellow-400 p-1.5 rounded-lg shadow-xl"><Video className="w-3.5 h-3.5 text-black" /></div>}
                        <div onClick={(e) => deleteFromVault(e, asset.id)} className="bg-black/80 p-1.5 rounded-lg text-white hover:bg-red-600 transition-colors border border-white/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      {activeAssetId === asset.id && <div className="absolute inset-0 bg-yellow-400/5 ring-2 ring-yellow-400 rounded-[1.2rem]"></div>}
                    </button>
                  ))
                )}
                {/* Visual end spacer */}
                <div className="flex-shrink-0 w-10"></div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="max-w-[1600px] mx-auto p-12 text-center text-[10px] font-bold text-zinc-700 tracking-[0.5em] uppercase border-t border-white/5">
        &copy; 2025 FaceOff VFX Studio &bull; Powered by Google GenAI
      </footer>

      <style>{`
        @keyframes loading-bar { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
        .animate-loading-bar { animation: loading-bar 180s cubic-bezier(0.1, 0, 0.1, 1) forwards; }
        .film-strip {
          scroll-snap-type: x mandatory;
        }
        .film-strip > button {
          scroll-snap-align: start;
        }
      `}</style>
    </div>
  );
}
