import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';

function App() {
  const [activeTab, setActiveTab] = useState('send');
  const [sendMode, setSendMode] = useState('text');

  // Input States
  const [textData, setTextData] = useState('');
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [expiryMode, setExpiryMode] = useState('burn');
  const [pin, setPin] = useState('');

  // Results & UI States
  const [generatedPin, setGeneratedPin] = useState(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [receivedData, setReceivedData] = useState(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [lockedFileInfo, setLockedFileInfo] = useState(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSensitive, setIsSensitive] = useState(false);

  // Pro UX States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  const [toastMessage, setToastMessage] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [recentVaults, setRecentVaults] = useState([]);

  const fileInputRef = useRef(null);
  const triggerFileInput = () => fileInputRef.current.click();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinFromUrl = urlParams.get('pin');

    if (pinFromUrl && pinFromUrl.length === 6) {
      setPin(pinFromUrl);
      setActiveTab('receive');
    }

    const savedHistory = localStorage.getItem('vaultclip_recent');
    if (savedHistory) { setRecentVaults(JSON.parse(savedHistory)); }
  }, []);

  useEffect(() => {
    let timer;
    if (receivedData && receivedData.createdAt && receivedData.expiryMode !== 'burn') {
      timer = setInterval(() => {
        const createdTime = new Date(receivedData.createdAt).getTime();
        const expiryHours = receivedData.expiryMode === '1h' ? 1 : 24;
        const expiryTime = createdTime + (expiryHours * 60 * 60 * 1000);
        const distance = expiryTime - new Date().getTime();

        if (distance < 0) {
          clearInterval(timer); setTimeLeft("EXPIRED & BURNED 🔥");
        } else {
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
    } else if (receivedData && receivedData.expiryMode === 'burn') {
      setTimeLeft("Burn on Close 🔥");
    }
    return () => clearInterval(timer);
  }, [receivedData]);

  const showToast = (message) => { setToastMessage(message); setTimeout(() => { setToastMessage(''); }, 3000); };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) { if (droppedFile.size > 104857600) return setErrorMessage("Limit 100MB!"); setFile(droppedFile); setErrorMessage(''); }
  };
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) { if (selectedFile.size > 104857600) return setErrorMessage("Limit 100MB!"); setFile(selectedFile); setErrorMessage(''); }
  };

  const copyToClipboard = (text, isLink = false) => {
    const formattedText = isLink ? text : text.replace(/\n/g, '\r\n');
    navigator.clipboard.writeText(formattedText); showToast(isLink ? "Link copied! 🔗" : "Copied! 📋");
  };

  const handleNativeShare = async (url) => {
    if (navigator.share) {
      try { await navigator.share({ title: 'VaultClip - Secure', url: url }); showToast("Shared! 🚀"); }
      catch (error) { console.log('Share cancelled'); }
    } else { copyToClipboard(url, true); }
  };

  const downloadFile = (url, fileName) => {
    const link = document.createElement('a'); link.href = url; link.setAttribute('download', fileName); document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
  };

  const handleTextChange = (e) => {
    const text = e.target.value; setTextData(text);
    if (/\b(?:\d[ -]*?){13,16}\b/.test(text) || /(api[_-]?key|password|secret|token)[\s:=]+["']?[a-zA-Z0-9\-_]+["']?/i.test(text)) {
      setIsSensitive(true); setExpiryMode('burn');
    } else { setIsSensitive(false); }
  };

  // --- SIMPLE SEND LOGIC ---
  const handleSend = async () => {
    try {
      setErrorMessage(''); setIsUploading(true); setUploadProgress(0);

      const progressInterval = setInterval(() => { setUploadProgress(prev => prev >= 90 ? 90 : prev + Math.floor(Math.random() * 15)); }, 300);

      const formData = new FormData();
      formData.append('type', sendMode); formData.append('password', password); formData.append('expiryMode', expiryMode);

      if (sendMode === 'text') { formData.append('textData', textData); }
      else { formData.append('file', file); }

      const response = await fetch('https://vaultclip-backend.onrender.com/api/send', { method: 'POST', body: formData });
      const data = await response.json();

      clearInterval(progressInterval); setUploadProgress(100);

      setTimeout(() => {
        if (response.ok) {
          setGeneratedPin(data.pin);

          const finalSecureLink = `${window.location.origin}/?pin=${data.pin}`;
          setGeneratedLink(finalSecureLink);

          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ff69b4', '#00ffff', '#ffff00'] });

          const newVault = { pin: data.pin, type: sendMode, name: sendMode === 'file' ? file.name : 'Encrypted Text', time: new Date().toLocaleTimeString(), link: finalSecureLink };
          const updatedVaults = [newVault, ...recentVaults].slice(0, 5);
          setRecentVaults(updatedVaults); localStorage.setItem('vaultclip_recent', JSON.stringify(updatedVaults));

          setTextData(''); setFile(null); setPassword(''); setExpiryMode('burn'); setIsSensitive(false);
        } else { setErrorMessage(data.error); }
        setIsUploading(false);
      }, 500);
    } catch (error) { setErrorMessage("Server Error."); setIsUploading(false); }
  };

  // --- SIMPLE RECEIVE LOGIC ---
  const handleReceive = async () => {
    if (pin.length !== 6) return setErrorMessage("Invalid PIN format.");

    try {
      setErrorMessage(''); setIsUploading(true); setUploadProgress(40);
      const response = await fetch('https://vaultclip-backend.onrender.com/api/receive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin, password: unlockPassword }) });
      const data = await response.json();
      setUploadProgress(100);

      setTimeout(() => {
        if (response.ok) {
          if (data.requiresPassword) { setRequiresPassword(true); setLockedFileInfo({ type: data.type, fileName: data.fileName }); setIsUploading(false); return; }

          setReceivedData({ type: data.type, text: data.textData, fileName: data.fileName, fileUrl: data.fileUrl, createdAt: data.createdAt, expiryMode: data.expiryMode, originalPin: pin });
          window.history.replaceState({}, document.title, "/"); setPin(''); setRequiresPassword(false); setUnlockPassword(''); setLockedFileInfo(null); setAiResult('');
        } else { setErrorMessage(data.error); }
        setIsUploading(false);
      }, 400);
    } catch (error) { setErrorMessage("Server Error."); setIsUploading(false); }
  };

  const handleProcessWithAI = async () => {
    try {
      setIsAiLoading(true);
      const response = await fetch('https://vaultclip-backend.onrender.com/api/process-with-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ textData: receivedData.text }) });
      const data = await response.json();
      if (response.ok) { setAiResult(data.aiResult); showToast("✨ AI Magic Complete!"); } else { showToast("❌ AI Error: " + data.error); }
    } catch (error) { showToast("❌ Failed to reach AI."); } finally { setIsAiLoading(false); }
  };

  // --- IMAGE OCR LOGIC (KEPT INTACT) ---
  const handleOCR = async () => {
    try {
      setIsAiLoading(true);
      const response = await fetch(`https://vaultclip-backend.onrender.com/api/ocr/${receivedData.originalPin}`);
      const data = await response.json();
      if (response.ok) { setAiResult(data.extractedText); showToast("🪄 Text Extracted Successfully!"); } else { showToast("❌ OCR Error: " + data.error); }
    } catch (error) { showToast("❌ Failed to process Image."); } finally { setIsAiLoading(false); }
  };

  const handleTabSwitch = (tab) => { setActiveTab(tab); setGeneratedPin(null); setGeneratedLink(''); setReceivedData(null); setRequiresPassword(false); setLockedFileInfo(null); setErrorMessage(''); setIsSensitive(false); setAiResult(''); };

  const getFileIcon = (filename) => {
    if (!filename) return "🔒"; const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return "🖼️"; if (['mp4', 'mkv'].includes(ext)) return "🎥";
    if (['zip', 'rar'].includes(ext)) return "🗜️"; if (ext === 'pdf') return "📕"; if (['exe', 'apk'].includes(ext)) return "⚙️"; return "📄";
  };

  const isCode = (text) => { return /[{};]/.test(text) && /(function|const|let|var|import|class|<div|<html|public class)/.test(text); };
  const clearAllHistory = () => { setRecentVaults([]); localStorage.removeItem('vaultclip_recent'); showToast("🧹 History Cleared!"); };
  const removeIndividualVault = (indexToRemove) => { const updatedVaults = recentVaults.filter((_, index) => index !== indexToRemove); setRecentVaults(updatedVaults); if (updatedVaults.length === 0) { localStorage.removeItem('vaultclip_recent'); } else { localStorage.setItem('vaultclip_recent', JSON.stringify(updatedVaults)); } };

  return (
    <div className={`min-h-screen font-mono flex flex-col items-center py-12 px-4 transition-colors duration-500 selection:bg-pink-300 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-[#F4F0EA] text-slate-900'}`}>

      {toastMessage && (<div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full font-bold shadow-[4px_4px_0px_0px_rgba(255,105,180,1)] border-2 border-pink-500 animate-bounce">{toastMessage}</div>)}

      {showInstructions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white text-black border-4 border-black rounded-xl p-8 max-w-lg w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
            <button onClick={() => setShowInstructions(false)} className="absolute top-4 right-4 text-3xl font-black hover:text-pink-500">×</button>
            <h2 className="text-3xl font-black mb-6 uppercase border-b-4 border-pink-500 inline-block">How to Use VaultClip</h2>
            <ul className="space-y-4 font-bold text-lg">
              <li className="flex items-center gap-3"><span>1️⃣</span> Upload your file or paste secret text.</li>
              <li className="flex items-center gap-3"><span>2️⃣</span> Add a password or set Self-Destruct timer.</li>
              <li className="flex items-center gap-3"><span>3️⃣</span> Share the generated 6-digit PIN or Link.</li>
              <li className="flex items-center gap-3"><span>🔥</span> Once read (in burn mode), data is destroyed forever!</li>
              <li className="flex items-center gap-3"><span>🪄</span> <b>AI Tools:</b> Auto-summarize text, format code, and Extract text from Images.</li>
            </ul>
            <button onClick={() => setShowInstructions(false)} className="w-full mt-8 bg-cyan-300 border-4 border-black py-3 font-black text-xl hover:bg-cyan-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">GOT IT!</button>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 flex gap-4">
        <button onClick={() => setShowInstructions(true)} className="text-2xl font-black border-2 border-current rounded-full w-10 h-10 flex items-center justify-center hover:scale-110 transition-transform">?</button>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-3xl hover:scale-110 transition-transform">{isDarkMode ? '☀️' : '🌙'}</button>
      </div>

      <div className="text-center mb-10 mt-8">
        <h1 className="text-5xl md:text-7xl font-black mb-3 tracking-tighter cursor-pointer" onClick={() => window.location.href = "/"} style={{ textShadow: isDarkMode ? '4px 4px 0px #ec4899' : '4px 4px 0px #000' }}>
          Vault<span className="text-pink-500">Clip</span>
        </h1>
        <p className={`text-lg font-bold border-b-4 inline-block pb-1 uppercase tracking-tight ${isDarkMode ? 'border-pink-500 text-pink-300' : 'border-black text-black'}`}>Secure. Fast. Burn-After-Reading.</p>
      </div>

      <div className="w-full max-w-2xl bg-white text-slate-900 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all relative">

        {isUploading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-40 flex flex-col justify-center items-center p-8">
            <div className="w-full max-w-sm bg-gray-200 border-4 border-black rounded-full h-8 mb-4 overflow-hidden relative">
              <div className="bg-pink-500 h-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <h2 className="text-2xl font-black uppercase text-black animate-pulse">{uploadProgress === 100 ? 'Securing Data! 🚀' : `Encrypting... ${uploadProgress}%`}</h2>
          </div>
        )}

        <div className="flex border-b-4 border-black text-xl font-bold">
          <button onClick={() => handleTabSwitch('send')} className={`flex-1 py-4 transition-all ${activeTab === 'send' ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`}>🚀 SEND</button>
          <div className="w-1.5 bg-black"></div>
          <button onClick={() => handleTabSwitch('receive')} className={`flex-1 py-4 transition-all ${activeTab === 'receive' ? 'bg-cyan-300' : 'bg-white hover:bg-gray-100'}`}>📥 RECEIVE</button>
        </div>

        {errorMessage && <div className="bg-red-500 text-white font-bold p-3 text-center border-b-4 border-black">⚠️ {errorMessage}</div>}

        <div className="p-6 md:p-8">
          {activeTab === 'send' ? (
            generatedPin ? (
              <div className="text-center py-4">
                <h2 className="text-2xl font-black mb-6 uppercase text-pink-600">Data Secured! 🔒</h2>
                <div className="flex flex-col md:flex-row gap-6 items-center justify-center mb-8">
                  <div className="bg-white p-2 border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatedLink)}`} alt="Scan to Receive" className="w-32 h-32" />
                  </div>
                  <div className="flex flex-col gap-4 w-full text-left">
                    <div>
                      <p className="font-bold text-sm text-gray-500 mb-1">1. SHARE VIA PIN</p>
                      <div className="text-5xl font-black tracking-widest bg-yellow-100 border-4 border-black py-2 px-6 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-block">{generatedPin}</div>
                    </div>
                    <div className="w-full">
                      <p className="font-bold text-sm text-gray-500 mb-1">2. DIRECT LINK</p>
                      <div className="flex w-full">
                        <input type="text" readOnly value={generatedLink} className="w-full bg-gray-100 border-4 border-r-0 border-black rounded-l-lg px-2 py-2 font-bold text-xs sm:text-sm focus:outline-none truncate" />
                        <button onClick={() => copyToClipboard(generatedLink, true)} className="bg-cyan-300 border-4 border-r-0 border-black px-3 sm:px-4 font-black hover:bg-cyan-400 text-sm sm:text-base">COPY</button>
                        <button onClick={() => handleNativeShare(generatedLink)} className="bg-green-400 border-4 border-black rounded-r-lg px-3 sm:px-4 font-black hover:bg-green-500 text-sm sm:text-base">SHARE</button>
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setGeneratedPin(null)} className="font-bold text-xl py-3 px-12 bg-white border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all w-full md:w-auto">SEND MORE</button>
              </div>
            ) : (
              <>
                <div className="flex gap-4 mb-6">
                  <label className="font-bold text-lg cursor-pointer flex items-center"><input type="radio" checked={sendMode === 'text'} onChange={() => setSendMode('text')} className="mr-2 w-5 h-5 accent-pink-500" />Secret Text</label>
                  <label className="font-bold text-lg cursor-pointer flex items-center"><input type="radio" checked={sendMode === 'file'} onChange={() => setSendMode('file')} className="mr-2 w-5 h-5 accent-pink-500" />Secure File</label>
                </div>

                {sendMode === 'text' ? (
                  <div className="relative">
                    <textarea value={textData} onChange={handleTextChange} placeholder="Paste code or data here..." className={`w-full h-40 border-4 border-black rounded-lg p-4 font-mono shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 transition-colors ${isSensitive ? 'bg-red-50 focus:ring-red-300' : 'focus:ring-pink-200'}`} style={{ whiteSpace: 'pre-wrap', tabSize: 4 }} />
                  </div>
                ) : (
                  <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={triggerFileInput} className={`w-full border-4 border-dashed border-black rounded-lg p-10 text-center cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors ${isDragging ? 'bg-pink-200 border-pink-500' : 'bg-white hover:bg-pink-50'}`}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    {file ? <div className="font-bold text-xl text-pink-600 flex items-center justify-center gap-2"><span className="text-3xl">{getFileIcon(file.name)}</span> <span className="truncate max-w-xs">{file.name}</span></div> : (
                      <div className="font-bold text-xl uppercase">{isDragging ? 'Drop it like it\'s hot! 🔥' : 'Drag Image or File here'} <br /><span className="text-sm font-normal normal-case block mt-2 text-gray-500 italic">Max file size 100MB supported</span></div>
                    )}
                  </div>
                )}

                <div className="mt-8 flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block font-bold mb-2">Password (Optional)</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Lock it down" className="w-full border-4 border-black rounded-lg px-4 py-3 focus:outline-none focus:ring-4 focus:ring-yellow-200" />
                  </div>
                  <div className="flex-1">
                    <label className="block font-bold mb-2">Self-Destruct</label>
                    <div className="relative">
                      <select value={expiryMode} onChange={(e) => setExpiryMode(e.target.value)} disabled={isSensitive} className={`w-full bg-white border-4 border-black rounded-lg px-4 py-3 pr-10 font-bold focus:outline-none focus:ring-4 focus:ring-yellow-200 appearance-none ${isSensitive ? 'opacity-60 cursor-not-allowed bg-red-100 text-red-700' : 'cursor-pointer'}`}>
                        <option value="burn">Burn after reading</option><option value="1h">After 1 Hour</option><option value="24h">After 24 Hours</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black"><svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg></div>
                    </div>
                  </div>
                </div>
                <button onClick={handleSend} disabled={sendMode === 'text' && !textData} className={`w-full mt-8 font-black text-2xl py-4 border-4 border-black rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all ${(sendMode === 'text' && !textData) ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-pink-400 text-black cursor-pointer active:bg-pink-500'}`}>
                  ENCRYPT & GENERATE PIN
                </button>
              </>
            )
          ) : (
            receivedData ? (
              <div className="w-full text-center">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black text-red-500 uppercase">🔥 Data Accessed</h2>
                  <div className="bg-red-100 border-2 border-red-500 text-red-700 px-3 py-1 font-bold rounded-full text-sm animate-pulse">
                    ⏳ {timeLeft}
                  </div>
                </div>

                {receivedData.type === 'text' ? (
                  <>
                    {isCode(receivedData.text) ? (
                      <div className="text-left bg-gray-900 text-green-400 border-4 border-black rounded-lg p-4 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-auto max-h-64">
                        <pre style={{ whiteSpace: 'pre-wrap', tabSize: 4 }} className="font-mono text-sm leading-relaxed">{receivedData.text}</pre>
                      </div>
                    ) : (
                      <textarea readOnly value={receivedData.text} className={`w-full h-48 border-4 border-black rounded-lg p-4 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none`} style={{ whiteSpace: 'pre-wrap', tabSize: 4 }} />
                    )}

                    {aiResult && (
                      <div className="bg-[#fdf4ff] border-4 border-[#d946ef] rounded-lg p-4 mb-6 text-left shadow-[4px_4px_0px_0px_rgba(217,70,239,1)]">
                        <h3 className="font-black text-[#d946ef] flex items-center gap-2 mb-2"><span className="text-xl">✨</span> AI Insights</h3>
                        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">{aiResult}</p>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <button onClick={() => copyToClipboard(receivedData.text)} className="flex-1 font-bold text-lg py-3 bg-yellow-300 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all">📋 COPY</button>
                      {!aiResult && (
                        <button onClick={handleProcessWithAI} disabled={isAiLoading} className={`flex-1 font-bold text-lg py-3 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all text-white ${isAiLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-500 hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]'}`}>
                          {isAiLoading ? '⏳ ANALYZING...' : '✨ ASK AI'}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 text-left flex items-center gap-4">
                      <div className="text-5xl">{getFileIcon(receivedData.fileName)}</div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-sm text-gray-500 mb-1 uppercase">File Ready</p>
                        <p className="font-black text-pink-600 truncate w-full text-xl">{receivedData.fileName}</p>
                      </div>
                    </div>

                    {aiResult && (
                      <div className="bg-[#fdf4ff] border-4 border-[#d946ef] rounded-lg p-4 mb-6 text-left shadow-[4px_4px_0px_0px_rgba(217,70,239,1)]">
                        <h3 className="font-black text-[#d946ef] flex items-center gap-2 mb-2"><span className="text-xl">🪄</span> Extracted Text</h3>
                        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">{aiResult}</p>
                        <button onClick={() => copyToClipboard(aiResult)} className="mt-3 text-xs font-bold bg-pink-200 px-3 py-1 border-2 border-black rounded hover:bg-pink-300">Copy Result</button>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <button onClick={() => downloadFile(receivedData.fileUrl, receivedData.fileName)} className="flex-[2] font-black text-2xl py-4 bg-pink-400 text-white border-4 border-black rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all">⬇️ DOWNLOAD</button>

                      {getFileIcon(receivedData.fileName) === "🖼️" && !aiResult && (
                        <button onClick={handleOCR} disabled={isAiLoading} className={`flex-1 font-black text-lg py-4 border-4 border-black rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all text-black ${isAiLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-cyan-300 hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]'}`}>
                          {isAiLoading ? '⏳ SCANNING' : '🪄 EXTRACT TEXT'}
                        </button>
                      )}
                    </div>
                  </>
                )}
                <button onClick={() => setReceivedData(null)} className="mt-2 font-bold underline hover:text-pink-500 transition-colors">Receive Another</button>
              </div>
            ) : requiresPassword ? (
              <div className="relative overflow-hidden w-full max-w-md mx-auto border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-gray-100">
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] filter blur-[2px]"></div>
                <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center text-center bg-white/60 backdrop-blur-md h-full w-full">
                  <span className="text-6xl mb-4 drop-shadow-md">{lockedFileInfo?.type === 'file' ? getFileIcon(lockedFileInfo?.fileName) : '📝'}</span>
                  <h3 className="text-2xl font-black uppercase mb-1">Locked {lockedFileInfo?.type === 'file' ? 'File' : 'Secret'}</h3>
                  <p className="font-bold text-pink-600 mb-6 truncate w-full px-4 bg-white border-2 border-black rounded-md py-1">{lockedFileInfo?.fileName || 'Encrypted Text'}</p>
                  <input type="password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} placeholder="Enter Password" className="w-full text-center text-xl font-black border-4 border-black rounded-lg py-3 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-cyan-200 bg-white" />
                  <button onClick={handleReceive} className="w-full font-black text-xl py-3 bg-pink-400 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all text-white">UNLOCK TO VIEW</button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm mx-auto text-center">
                <h2 className="text-3xl font-black mb-6 uppercase">Enter PIN</h2>

                {/* REVERTED: Simple 6-digit numeric PIN */}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="6"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-5xl tracking-widest font-black border-4 border-black rounded-xl py-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-cyan-200 placeholder-gray-300"
                />

                <button onClick={handleReceive} disabled={pin.length !== 6} className={`w-full font-black text-2xl py-4 border-4 border-black rounded-lg transition-all ${pin.length === 6 ? "bg-yellow-400 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] cursor-pointer" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>FETCH DATA</button>
              </div>
            )
          )}
        </div>
      </div>

      {recentVaults.length > 0 && activeTab === 'send' && !generatedPin && (
        <div className="w-full max-w-2xl mt-8">
          <div className="flex justify-between items-end mb-3 border-b-4 border-black pb-1">
            <h3 className={`font-black uppercase inline-block ${isDarkMode ? 'text-pink-400' : 'text-black'}`}>🕒 Your Recent Vaults</h3>
            <button onClick={clearAllHistory} className="text-sm font-bold text-red-500 hover:text-red-700 underline flex items-center gap-1 transition-colors">
              <span className="hidden sm:inline">Clear All</span> 🗑️
            </button>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {recentVaults.map((vault, index) => (
              <div key={index} className="bg-white text-black border-4 border-black rounded-lg p-3 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-2xl">{vault.type === 'file' ? '📁' : '📝'}</span>
                  <div className="truncate">
                    <p className="font-bold truncate max-w-[100px] sm:max-w-xs">{vault.name}</p>
                    <p className="text-xs text-gray-500 font-bold">{vault.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-block bg-yellow-200 border-2 border-black px-2 py-1 font-black rounded text-sm">{vault.pin}</span>
                  <button onClick={() => copyToClipboard(vault.link, true)} className="bg-cyan-300 border-2 border-black px-2 sm:px-3 py-1 font-bold rounded hover:bg-cyan-400 text-sm">Copy Link</button>
                  <button onClick={() => removeIndividualVault(index)} className="bg-red-400 border-2 border-black px-2 py-1 font-black rounded hover:bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:translate-x-px active:shadow-none transition-all">✖</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;