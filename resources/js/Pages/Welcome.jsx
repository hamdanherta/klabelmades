import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';

const LabelingTool = () => {
    const [view, setView] = useState('home'); // home, labeling
    const [startId, setStartId] = useState(1);
    const [data, setData] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async (id) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/data?start_id=${id}`);
            if (!response.ok) throw new Error("Server error");
            
            const json = await response.json();
            if (json.data && Array.isArray(json.data)) {
                setData(json.data);
                setView('labeling');
                window.scrollTo(0, 0);
            } else {
                throw new Error("Data tidak valid");
            }
        } catch (error) {
            console.error(error);
            alert("Gagal mengambil data. Pastikan server jalan dan dataset.csv ada.");
        }
        setLoading(false);
    };

    const handleLabel = (id, teori, val) => {
        const item = data.find(d => d.id == id && d.teori_warna === teori);
        if (!item) return;

        const newResult = {
            id,
            id_baru: item.id_baru || item.id,
            teori_warna: teori,
            hasil_ektraksi_warna: item.hasil_ektraksi_warna, // Original full string
            warna_kombinasi: item.warna_kombinasi,
            label_kecocokan: val
        };

        setResults(prev => {
            const filtered = prev.filter(r => !(r.id == id && r.teori_warna === teori));
            return [...filtered, newResult];
        });
    };

    const handleDownload = async () => {
        if (results.length === 0) return;
        
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.content : '';

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-CSRF-TOKEN': csrfToken 
                },
                body: JSON.stringify({ results })
            });
            
            if (!response.ok) throw new Error("Gagal download");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const idAwal = results[0]?.id_baru || 'start';
            const idAkhir = results[results.length - 1]?.id_baru || 'end';
            
            a.href = url;
            a.download = `hasil_label_${idAwal}-${idAkhir}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            setResults([]); // Reset memory after download as requested
        } catch (error) {
            alert("Terjadi kesalahan saat mengunduh file.");
        }
    };

    const handleNext = () => {
        if (data.length === 0) return;
        const lastId = parseInt(data[data.length - 1].id);
        fetchData(lastId + 1);
    };

    if (view === 'home') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Head title="Home - Labeling Tool" />
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-100">
                    <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="text-4xl">🎨</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Labeling Tool</h1>
                    <p className="text-slate-500 mb-8 leading-relaxed">Versi Web Responsif untuk riset Desainta. Mulai labeling data Anda sekarang.</p>
                    
                    <div className="space-y-4">
                        <div className="text-left">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Mulai dari ID</label>
                            <input 
                                type="number" 
                                value={startId} 
                                onChange={(e) => setStartId(e.target.value)}
                                className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                            />
                        </div>
                        <button 
                            onClick={() => fetchData(startId)}
                            disabled={loading}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Memuat...' : 'Mulai Sekarang'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            <Head title={`Labeling ID ${data[0]?.id || ''}`} />
            
            {/* Header Sticky */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 sm:px-8 flex items-center justify-between">
                <div>
                    <h2 className="font-black text-slate-800 text-lg">Labeling Session</h2>
                    <p className="text-xs text-slate-500 font-medium">Antrian Simpan: <span className="text-blue-600 font-bold">{results.length}</span> data</p>
                </div>
                <button 
                    onClick={handleDownload}
                    disabled={results.length === 0}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-100 disabled:opacity-30 transition-all"
                >
                    Stop & Simpan
                </button>
            </div>

            <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
                {data.length > 0 ? data.map((item, idx) => {
                    const isLabeled = results.find(r => r.id == item.id && r.teori_warna === item.teori_warna);
                    return (
                        <div key={`${item.id}-${item.teori_warna}`} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transform transition-all hover:shadow-md">
                            <div className="p-4 sm:p-6 flex flex-col sm:row gap-6">
                                {/* Info Section */}
                                <div className="sm:w-32 flex-shrink-0">
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{item.teori_warna}</span>
                                    <h3 className="text-2xl font-black text-slate-800">ID {item.id}</h3>
                                    <div className="mt-1 px-2 py-0.5 bg-slate-100 rounded-md inline-block">
                                        <code className="text-[10px] text-slate-500 font-bold">{item.id_baru || item.id}</code>
                                    </div>
                                </div>

                                {/* Preview Section */}
                                <div className="flex-grow grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {/* Swatch 1 */}
                                    <div className="aspect-square rounded-2xl border border-slate-200 relative group overflow-hidden" style={{ backgroundColor: item.extracted_hex || '#eee' }}>
                                        <div className="absolute inset-0 m-auto w-10 h-10 rounded-lg border-2 border-white shadow-md" style={{ backgroundColor: item.warna_kombinasi }}></div>
                                        <div className="absolute bottom-0 inset-x-0 bg-white/90 py-1 text-[8px] font-bold text-center text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">BG: {item.extracted_hex}</div>
                                    </div>
                                    {/* Swatch 2 */}
                                    <div className="aspect-square rounded-2xl border border-slate-200 relative group overflow-hidden" style={{ backgroundColor: item.warna_kombinasi || '#eee' }}>
                                        <div className="absolute inset-0 m-auto w-10 h-10 rounded-lg border-2 border-white shadow-md" style={{ backgroundColor: item.extracted_hex }}></div>
                                        <div className="absolute bottom-0 inset-x-0 bg-white/90 py-1 text-[8px] font-bold text-center text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">TEXT: {item.warna_kombinasi}</div>
                                    </div>
                                    {/* Example 1 */}
                                    <div className="col-span-2 flex items-center justify-center rounded-2xl shadow-inner border border-slate-200 p-4" style={{ backgroundColor: item.extracted_hex }}>
                                        <span className="font-black text-lg tracking-tighter" style={{ color: item.warna_kombinasi }}>CONTOH TEKS</span>
                                    </div>
                                    {/* Example 2 */}
                                    <div className="col-span-2 flex items-center justify-center rounded-2xl shadow-inner border border-slate-200 p-4" style={{ backgroundColor: item.warna_kombinasi }}>
                                        <span className="font-black text-lg tracking-tighter" style={{ color: item.extracted_hex }}>CONTOH TEKS</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Section */}
                            <div className="px-4 py-4 bg-slate-50/50 flex items-center justify-between border-t border-slate-50">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleLabel(item.id, item.teori_warna, 1)}
                                        className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${isLabeled?.label_kecocokan === 1 ? 'bg-green-600 text-white shadow-lg shadow-green-100 scale-105' : 'bg-white text-slate-600 hover:bg-green-50'}`}
                                    >
                                        Cocok
                                    </button>
                                    <button 
                                        onClick={() => handleLabel(item.id, item.teori_warna, 0)}
                                        className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${isLabeled?.label_kecocokan === 0 ? 'bg-rose-600 text-white shadow-lg shadow-rose-100 scale-105' : 'bg-white text-slate-600 hover:bg-rose-50'}`}
                                    >
                                        Tidak
                                    </button>
                                </div>
                                {isLabeled && (
                                    <span className={`text-xs font-black uppercase tracking-widest ${isLabeled.label_kecocokan === 1 ? 'text-green-600' : 'text-rose-600'}`}>
                                        {isLabeled.label_kecocokan === 1 ? 'Terpilih Cocok' : 'Terpilih Tidak'}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-20 text-slate-400">
                        Tidak ada data yang tersedia untuk ID ini.
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-6 inset-x-0 z-30 px-4 pointer-events-none">
                <button 
                    onClick={handleNext}
                    disabled={loading || data.length === 0}
                    className="max-w-md mx-auto w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all pointer-events-auto shadow-slate-300 disabled:opacity-50"
                >
                    {loading ? (
                        <span>Memuat...</span>
                    ) : (
                        <>
                            <span>Lanjut (6 Data)</span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="9 5l7 7-7 7"></path></svg>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default LabelingTool;
