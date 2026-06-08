'use client';

import React, { useState, useEffect } from 'react';

// Struktur Data TypeScript agar tidak error merah
interface WishItem {
  id: string;
  text: string;
  category: 'boy' | 'together' | 'girl';
  isChecked: boolean;
  createdAt: number;
}

export default function WishlistPage() {
  const [roomID, setRoomID] = useState<string>('');
  const [boyName, setBoyName] = useState<string>('Cowo');
  const [girlName, setGirlName] = useState<string>('Cewe');
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [newWish, setNewWish] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'boy' | 'together' | 'girl'>('together');
  const [isEditingNames, setIsEditingNames] = useState<boolean>(false);
  const [notification, setNotification] = useState<string>('');

  // 1. Inisialisasi Room ID Otomatis saat pertama kali buka (Tanpa Login)
  useEffect(() => {
    // Cek apakah ada Room ID di URL (jika pasangan masuk lewat link undangan)
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    
    let currentRoom = roomFromUrl || localStorage.getItem('wishlist_room_id');
    
    if (!currentRoom) {
      // Jika benar-benar baru, buat ID unik acak
      currentRoom = 'room_' + Math.random().toString(36).substring(2, 11);
    }
    
    localStorage.setItem('wishlist_room_id', currentRoom);
    setRoomID(currentRoom);

    // Ambil nama kustom jika ada
    const savedBoy = localStorage.getItem('wishlist_boy_name');
    const savedGirl = localStorage.getItem('wishlist_girl_name');
    if (savedBoy) setBoyName(savedBoy);
    if (savedGirl) setGirlName(savedGirl);

    // ========================================================
    // TODO: Di sini tempat Anda melakukan Real-time Sync Database!
    // Jika pakai Supabase / Firebase, jalankan fungsi Subscribe/Listen
    // berdasarkan `currentRoom` ini untuk mengisi setWishes() secara otomatis.
    // ========================================================
    const savedWishes = localStorage.getItem(`wishes_${currentRoom}`);
    if (savedWishes) {
      setWishes(JSON.parse(savedWishes));
    }
  }, []);

  // 2. Simulasi Simpan Data (Nanti digantikan fungsi insert/update database)
  const saveToDatabase = (updatedWishes: WishItem[]) => {
    setWishes(updatedWishes);
    if (roomID) {
      localStorage.setItem(`wishes_${roomID}`, JSON.stringify(updatedWishes));
      
      // DI SINI: Jalankan query update ke Database Anda (Supabase/Firebase)
      // agar HP pasangan langsung mendeteksi perubahannya secara real-time.
    }
  };

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleAddWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWish.trim()) return;

    const newItem: WishItem = {
      id: 'wish_' + Date.now(),
      text: newWish.trim(),
      category: activeTab,
      isChecked: false,
      createdAt: Date.now()
    };

    saveToDatabase([newItem, ...wishes]);
    setNewWish('');
    triggerNotification('Wishlist baru berhasil ditambahkan! ✨');
  };

  const handleToggleCheck = (id: string) => {
    const updated = wishes.map((wish) => 
      wish.id === id ? { ...wish, isChecked: !wish.isChecked } : wish
    );
    saveToDatabase(updated);
  };

  const handleDeleteWish = (id: string) => {
    const updated = wishes.filter((wish) => wish.id !== id);
    saveToDatabase(updated);
  };

  const handleSaveNames = () => {
    localStorage.setItem('wishlist_boy_name', boyName);
    localStorage.setItem('wishlist_girl_name', girlName);
    setIsEditingNames(false);
    triggerNotification('Nama panggilan berhasil diperbarui! 💕');
  };

  const handleCopyShareLink = () => {
    const shareLink = `${window.location.origin}?room=${roomID}`;
    navigator.clipboard.writeText(shareLink);
    triggerNotification('Link sinkronisasi disalin! Kirimkan ke pasangan Anda 📱');
  };

  // Perhitungan Progres Eksklusif
  const filteredWishes = wishes.filter((w) => w.category === activeTab);
  const checkedCount = filteredWishes.filter((w) => w.isChecked).length;
  const progressPercent = filteredWishes.length > 0 ? Math.round((checkedCount / filteredWishes.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#334155] font-sans antialiased selection:bg-[#F1E4C3]">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-[#1E293B] text-[#F8FAFC] px-6 py-3 rounded-full text-sm font-medium shadow-xl tracking-wide animate-fade-in-down border border-[#334155]">
          {notification}
        </div>
      )}

      {/* Header Premium */}
      <header className="max-w-2xl mx-auto pt-12 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-[#F1F5F9] px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase text-[#64748B] mb-4 border border-[#E2E8F0]">
          ✨ Our Premium Space
        </div>

        {isEditingNames ? (
          <div className="flex justify-center items-center gap-3 my-4 bg-white p-4 rounded-2xl shadow-sm border border-[#E2E8F0] max-w-sm mx-auto">
            <input 
              type="text" 
              value={boyName} 
              onChange={(e) => setBoyName(e.target.value)}
              className="w-24 px-2 py-1 border-b-2 border-[#94A3B8] focus:border-[#475569] outline-none text-center font-bold text-lg"
            />
            <span className="text-gray-400 font-serif italic">&</span>
            <input 
              type="text" 
              value={girlName} 
              onChange={(e) => setGirlName(e.target.value)}
              className="w-24 px-2 py-1 border-b-2 border-[#F472B6] focus:border-[#EC4899] outline-none text-center font-bold text-lg"
            />
            <button onClick={handleSaveNames} className="bg-[#1E293B] text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-black transition">
              Simpan
            </button>
          </div>
        ) : (
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] flex justify-center items-center gap-2 font-serif">
            <span>{boyName}</span>
            <span className="text-[#D4AF37] font-normal">&</span>
            <span>{girlName}</span>
            <button onClick={() => setIsEditingNames(true)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
              ✏️
            </button>
          </h1>
        )}
        <p className="text-sm text-[#64748B] mt-2 font-light">Merajut mimpi dan rencana masa depan bersama.</p>

        {/* Tombol Bagikan Link Otomatis */}
        <div className="mt-4">
          <button 
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-2 text-xs font-medium bg-white text-[#475569] border border-[#E2E8F0] px-4 py-2 rounded-xl shadow-xs hover:bg-[#F8FAFC] transition active:scale-95"
          >
            🔗 Hubungkan ke HP Pasangan
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-4 mt-8 pb-24">
        {/* Tab Navigation Minimalis */}
        <div className="flex bg-[#F1F5F9] p-1.5 rounded-2xl mb-6 shadow-xs border border-[#E2E8F0]">
          <button 
            onClick={() => setActiveTab('boy')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${activeTab === 'boy' ? 'bg-white text-[#334155] shadow-xs' : 'text-[#64748B] hover:text-[#334155]'}`}
          >
            🧔 {boyName}
          </button>
          <button 
            onClick={() => setActiveTab('together')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${activeTab === 'together' ? 'bg-[#1E293B] text-white shadow-md' : 'text-[#64748B] hover:text-[#334155]'}`}
          >
            💍 Bersama
          </button>
          <button 
            onClick={() => setActiveTab('girl')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${activeTab === 'girl' ? 'bg-white text-[#334155] shadow-xs' : 'text-[#64748B] hover:text-[#334155]'}`}
          >
            👩 {girlName}
          </button>
        </div>

        {/* Progress Bar Interaktif */}
        <div className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-xs mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-[#475569] tracking-wider uppercase">Mimpi Tercapai</span>
            <span className="text-sm font-bold text-[#1E293B]">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-700 ease-out rounded-full ${activeTab === 'boy' ? 'bg-[#475569]' : activeTab === 'girl' ? 'bg-[#EC4899]' : 'bg-[#D4AF37]'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Input Form New Wishlist */}
        <form onSubmit={handleAddWish} className="flex gap-2 mb-6">
          <input 
            type="text" 
            value={newWish}
            onChange={(e) => setNewWish(e.target.value)}
            placeholder={`Tambahkan impian ${activeTab === 'together' ? 'bersama' : activeTab === 'boy' ? boyName : girlName}...`}
            className="flex-1 px-5 py-3.5 rounded-2xl bg-white border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E293B]/20 focus:border-[#1E293B] transition placeholder:text-[#94A3B8]"
          />
          <button 
            type="submit"
            className="bg-[#1E293B] text-white px-5 rounded-2xl text-sm font-semibold hover:bg-black transition active:scale-95 shadow-md shadow-black/5"
          >
            Tambah
          </button>
        </form>

        {/* Wishlist Render List */}
        <div className="space-y-3">
          {filteredWishes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-[#E2E8F0] px-6">
              <span className="text-2xl block mb-2">🥂</span>
              <p className="text-xs text-[#94A3B8] font-light">Belum ada wishlist di sini. Tulis impian pertamamu di atas!</p>
            </div>
          ) : (
            filteredWishes.map((item: WishItem) => (
              <div 
                key={item.id}
                onClick={() => handleToggleCheck(item.id)}
                className={`group flex items-center justify-between p-4 bg-white rounded-2xl border transition-all cursor-pointer select-none ${item.isChecked ? 'border-[#E2E8F0] bg-[#F8FAFC]/50 opacity-60' : 'border-[#E2E8F0] hover:border-[#CBD5E1] shadow-xs'}`}
              >
                <div className="flex items-center gap-4 flex-1 pr-2">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${item.isChecked ? 'bg-[#1E293B] border-[#1E293B]' : 'border-[#CBD5E1] group-hover:border-[#94A3B8]'}`}>
                    {item.isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1.1 1 0 010 1.414l-8 8a1.1 1 0 01-1.414 0l-4-4a1.1 1 0 011.414-1.414L8 12.586l7.293-7.293a1.1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm font-medium transition-all break-all ${item.isChecked ? 'line-through text-[#94A3B8]' : 'text-[#334155]'}`}>
                    {item.text}
                  </span>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWish(item.id);
                  }}
                  className="text-[#94A3B8] hover:text-[#EF4444] p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-red-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}