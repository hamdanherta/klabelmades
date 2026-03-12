import React, { useState, useEffect } from "react";
import { Head } from "@inertiajs/react";

const LabelingTool = () => {
    const [view, setView] = useState("home"); // home, labeling
    const [startId, setStartId] = useState(1);
    const [data, setData] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorModal, setErrorModal] = useState({ show: false, message: "" });
    const [hasSaved, setHasSaved] = useState(false);

    const fetchData = async (id) => {
        const numId = parseInt(id);
        // Validasi: id_baru harus 1, 7, 13, 19, ... (1 + 6k)
        if (isNaN(numId) || (numId - 1) % 6 !== 0) {
            setErrorModal({
                show: true,
                message: `ID Tidak Valid: ${id || "Kosong"}. Harap mulai dari id_baru kelipatan 6 + 1 (Contoh: 1, 7, 13, 19, dst).`,
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/data?start_id=${numId}`);
            const json = await response.json();

            if (!response.ok) {
                throw new Error(json.error || "Gagal mengambil data");
            }

            if (json.data && Array.isArray(json.data)) {
                setData(json.data);
                setView("labeling");
                window.scrollTo(0, 0);
            } else {
                throw new Error("Data tidak valid di server");
            }
        } catch (error) {
            console.error(error);
            setErrorModal({ show: true, message: error.message });
        }
        setHasSaved(false);
        setLoading(false);
    };

    const handleLabel = (id, teori, val) => {
        const item = data.find((d) => d.id == id && d.teori_warna === teori);
        if (!item) return;

        const newResult = {
            id,
            id_baru: item.id_baru || item.id,
            teori_warna: teori,
            hasil_ekstraksi_warna_hex: item.hasil_ekstraksi_warna_hex, // Original full string
            warna_kombinasi: item.warna_kombinasi,
            label_kecocokan: val,
        };

        setResults((prev) => {
            const filtered = prev.filter(
                (r) => !(r.id == id && r.teori_warna === teori),
            );
            return [...filtered, newResult];
        });

        // Auto-scroll ke item berikutnya
        setTimeout(() => {
            const currentIndex = data.findIndex(
                (item) => item.id == id && item.teori_warna === teori,
            );
            if (currentIndex !== -1 && currentIndex < data.length - 1) {
                const nextElement = document.getElementById(
                    `row-${currentIndex + 1}`,
                );
                if (nextElement) {
                    nextElement.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                }
            }
        }, 100);
    };

    const handleClearLabel = (id, teori) => {
        setResults((prev) =>
            prev.filter((r) => !(r.id == id && r.teori_warna === teori)),
        );

        // Auto-scroll ke item berikutnya (opsional, tapi konsisten)
        setTimeout(() => {
            const currentIndex = data.findIndex(
                (item) => item.id == id && item.teori_warna === teori,
            );
            if (currentIndex !== -1 && currentIndex < data.length - 1) {
                const nextElement = document.getElementById(
                    `row-${currentIndex + 1}`,
                );
                if (nextElement) {
                    nextElement.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                }
            }
        }, 100);
    };

    const handleDownload = (e) => {
        if (e) e.preventDefault();
        const isSequential = results.every((res, i) => {
            if (i === 0) return true;
            return parseInt(res.id_baru) === parseInt(results[i - 1].id_baru) + 1;
        });

        if (!isSequential) {
            setErrorModal({
                show: true,
                message: `ID kamu tidak berurutan. Harap ulangi pilihan atau hapus dan tata kembali urutannya.`,
                isSequenceError: true
            });
            return;
        }
        
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.content : '';

        // Gunakan form submit agar browser menangani unduhan secara native
        // Ini lebih aman untuk memastikan nama file dan ekstensi .csv tetap terjaga
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/api/download';
        form.style.display = 'none';

        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_token';
        csrfInput.value = csrfToken;
        form.appendChild(csrfInput);

        const resultsInput = document.createElement('input');
        resultsInput.type = 'hidden';
        resultsInput.name = 'results_json';
        resultsInput.value = JSON.stringify(results.map(r => ({
            ...r,
            hasil_ekstraksi_warna_hex: r.hasil_ekstraksi_warna_hex, // explicitly mapping for clarity if needed, though already updated in handleLabel
        })));
        form.appendChild(resultsInput);

        document.body.appendChild(form);
        form.submit();

        // Bersihkan form setelah submit dan reset antrian
        setTimeout(() => {
            if (document.body.contains(form)) {
                document.body.removeChild(form);
            }
            setResults([]);
            setHasSaved(true);
        }, 1000);
    };

    const handleHome = () => {
        setData([]);
        setView("home");
        setStartId(1);
        setHasSaved(false);
        window.scrollTo(0, 0);
    };

    const handleClearAll = () => {
        const currentIdentifiers = data.map((d) => `${d.id}-${d.teori_warna}`);
        setResults((prev) =>
            prev.filter(
                (r) => !currentIdentifiers.includes(`${r.id}-${r.teori_warna}`),
            ),
        );

        // Auto-scroll ke paling atas (ID pertama)
        setTimeout(() => {
            const firstElement = document.getElementById("row-0");
            if (firstElement) {
                firstElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
        }, 100);
    };

    const handleNext = () => {
        if (data.length === 0) return;

        const isSequential = data.every(item => {
            const resultIndex = results.findIndex(r => r.id == item.id && r.teori_warna === item.teori_warna);
            if (resultIndex === -1) return false;
            
            // Cek urutan internal results untuk batch ini
            // Tapi karena kita mau cek urutan absolut id_baru:
            return true; // placeholder behavior, we rely on results order
        });

        // Validasi Urutan id_baru di results
        const isResultsSequential = results.every((res, i) => {
            if (i === 0) return true;
            return parseInt(res.id_baru) === parseInt(results[i - 1].id_baru) + 1;
        });

        if (!isResultsSequential) {
            setErrorModal({
                show: true,
                message: `ID kamu tidak berurutan. Harap ulangi pilihan atau hapus dan tata kembali urutannya.`,
                isSequenceError: true
            });
            return;
        }

        const lastIdBaru = parseInt(data[data.length - 1].id_baru);
        fetchData(lastIdBaru + 1);
    };

    const isNextDisabled =
        loading ||
        data.length === 0 ||
        !data.every((item) =>
            results.some(
                (r) => r.id == item.id && r.teori_warna === item.teori_warna,
            ),
        );

    const isStopDisabled =
        results.length === 0 ||
        data.length === 0 ||
        !data.every((item) =>
            results.some(
                (r) => r.id == item.id && r.teori_warna === item.teori_warna,
            ),
        );

    // Modal Component
    const Modal = ({ show, message, onClose }) => {
        if (!show) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center transform animate-in zoom-in-95 duration-300 scale-105 border-4 border-rose-50">
                    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">
                        Peringatan!
                    </h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed font-medium">
                        {message}
                    </p>
                    <button
                        onClick={() => {
                            if (errorModal.isSequenceError) {
                                handleClearAll();
                            }
                            onClose();
                        }}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                        Saya Mengerti
                    </button>
                </div>
            </div>
        );
    };

    if (view === "home") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Head title="Home - Labeling Tool" />
                <Modal
                    show={errorModal.show}
                    message={errorModal.message}
                    onClose={() => setErrorModal({ show: false, message: "" })}
                />
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-100">
                    <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="text-4xl">🎨</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 mb-2">
                        Labeling Tool
                    </h1>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Versi Web Responsif untuk riset Desainta. Mulai labeling
                        data Anda sekarang.
                    </p>

                    <div className="space-y-4">
                        <div className="text-left">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                                Mulai dari ID
                            </label>
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
                            {loading ? "Memuat..." : "Mulai Sekarang"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            <Head title={`Labeling ID ${data[0]?.id || ""}`} />

            {/* Header Sticky */}
            <Modal
                show={errorModal.show}
                message={errorModal.message}
                onClose={() => setErrorModal({ show: false, message: "" })}
            />
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 sm:px-8 flex items-center justify-between">
                <div>
                    <h2 className="font-black text-slate-800 text-lg">
                        Labeling Session
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                        Antrian Simpan:{" "}
                        <span className="text-blue-600 font-bold">
                            {results.length}
                        </span>{" "}
                        data
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleHome}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                        title="Kembali ke Beranda"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            ></path>
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isStopDisabled}
                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-100 disabled:opacity-30 transition-all font-sans"
                    >
                        Stop & Simpan
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
                {data.length > 0 ? (
                    data.map((item, idx) => {
                        const isLabeled = results.find(
                            (r) =>
                                r.id == item.id &&
                                r.teori_warna === item.teori_warna,
                        );
                        return (
                            <div
                                key={`${item.id}-${item.teori_warna}`}
                                id={`row-${idx}`}
                                className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transform transition-all hover:shadow-md"
                            >
                                <div className="p-4 sm:p-6 flex flex-col sm:row gap-6">
                                    {/* Info Section */}
                                    <div className="sm:w-32 flex-shrink-0">
                                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                                            {item.teori_warna}
                                        </span>
                                        <h3 className="text-2xl font-black text-slate-800">
                                            ID {item.id}
                                        </h3>
                                        <div className="mt-1 px-2 py-0.5 bg-slate-100 rounded-md inline-block">
                                            <code className="text-[10px] text-slate-500 font-bold">
                                                {item.id_baru || item.id}
                                            </code>
                                        </div>
                                    </div>

                                    {/* Preview Section */}
                                    <div className="flex-grow grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {/* Swatch 1 */}
                                        <div
                                            className="aspect-square rounded-2xl border border-slate-200 relative group overflow-hidden"
                                            style={{
                                                backgroundColor:
                                                    item.extracted_hex ||
                                                    "#eee",
                                            }}
                                        >
                                            <div
                                                className="absolute inset-0 m-auto w-10 h-10 rounded-lg border-2 border-white shadow-md"
                                                style={{
                                                    backgroundColor:
                                                        item.warna_kombinasi,
                                                }}
                                            ></div>
                                            <div className="absolute bottom-0 inset-x-0 bg-white/90 py-1 text-[8px] font-bold text-center text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                                                BG: {item.extracted_hex}
                                            </div>
                                        </div>
                                        {/* Swatch 2 */}
                                        <div
                                            className="aspect-square rounded-2xl border border-slate-200 relative group overflow-hidden"
                                            style={{
                                                backgroundColor:
                                                    item.warna_kombinasi ||
                                                    "#eee",
                                            }}
                                        >
                                            <div
                                                className="absolute inset-0 m-auto w-10 h-10 rounded-lg border-2 border-white shadow-md"
                                                style={{
                                                    backgroundColor:
                                                        item.extracted_hex,
                                                }}
                                            ></div>
                                            <div className="absolute bottom-0 inset-x-0 bg-white/90 py-1 text-[8px] font-bold text-center text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                                                TEXT: {item.warna_kombinasi}
                                            </div>
                                        </div>
                                        {/* Example 1 */}
                                        <div
                                            className="col-span-2 flex items-center justify-center rounded-2xl shadow-inner border border-slate-200 p-4"
                                            style={{
                                                backgroundColor:
                                                    item.extracted_hex,
                                            }}
                                        >
                                            <span
                                                className="font-black text-lg tracking-tighter"
                                                style={{
                                                    color: item.warna_kombinasi,
                                                }}
                                            >
                                                CONTOH TEKS
                                            </span>
                                        </div>
                                        {/* Example 2 */}
                                        <div
                                            className="col-span-2 flex items-center justify-center rounded-2xl shadow-inner border border-slate-200 p-4"
                                            style={{
                                                backgroundColor:
                                                    item.warna_kombinasi,
                                            }}
                                        >
                                            <span
                                                className="font-black text-lg tracking-tighter"
                                                style={{
                                                    color: item.extracted_hex,
                                                }}
                                            >
                                                CONTOH TEKS
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Section */}
                                <div className="px-4 py-4 bg-slate-50/50 flex items-center justify-between border-t border-slate-50">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() =>
                                                handleLabel(
                                                    item.id,
                                                    item.teori_warna,
                                                    1,
                                                )
                                            }
                                            className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${isLabeled?.label_kecocokan === 1 ? "bg-green-600 text-white shadow-lg shadow-green-100 scale-105" : "bg-white text-slate-600 hover:bg-green-50"}`}
                                        >
                                            Cocok
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleLabel(
                                                    item.id,
                                                    item.teori_warna,
                                                    0,
                                                )
                                            }
                                            className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${isLabeled?.label_kecocokan === 0 ? "bg-rose-600 text-white shadow-lg shadow-rose-100 scale-105" : "bg-white text-slate-600 hover:bg-rose-50"}`}
                                        >
                                            Tidak
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleClearLabel(
                                                    item.id,
                                                    item.teori_warna,
                                                )
                                            }
                                            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-bold text-xs transition-all active:scale-95"
                                            title="Hapus Pilihan"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                    {isLabeled && (
                                        <span
                                            className={`text-xs font-black uppercase tracking-widest ${isLabeled.label_kecocokan === 1 ? "text-green-600" : "text-rose-600"}`}
                                        >
                                            {isLabeled.label_kecocokan === 1
                                                ? "Terpilih Cocok"
                                                : "Terpilih Tidak"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-20 text-slate-400">
                        Tidak ada data yang tersedia untuk ID ini.
                    </div>
                )}
                {data.length > 0 && (
                    <div className="flex flex-col items-center gap-4 pb-20">
                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 rounded-2xl font-black text-sm transition-all shadow-sm active:scale-95"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                ></path>
                            </svg>
                            Hapus Semua Pilihan di ID Ini
                        </button>

                        {hasSaved && (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-10 py-5 bg-blue-600 text-white hover:bg-blue-700 rounded-3xl font-black text-lg transition-all shadow-xl shadow-blue-100 active:scale-95 animate-in zoom-in slide-in-from-top-4 duration-500"
                            >
                                <span>Lanjutkan Proses</span>
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="3"
                                        d="M13 5l7 7-7 7M5 5l7 7-7 7"
                                    ></path>
                                </svg>
                            </button>
                            
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-6 inset-x-0 z-30 px-4 pointer-events-none">
                <button
                    onClick={handleNext}
                    disabled={isNextDisabled}
                    className="relative max-w-md mx-auto w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-lg shadow-2xl flex items-center justify-center active:scale-95 transition-all pointer-events-auto shadow-slate-300 disabled:opacity-50"
                >
                    {loading ? (
                        <span>Memuat...</span>
                    ) : (
                        <>
                            <span>Lanjut</span>
                            <svg
                                className="absolute right-8 w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M9 5l7 7-7 7"
                                ></path>
                            </svg>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default LabelingTool;
