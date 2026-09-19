import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Volume2, 
  VolumeX, 
  Send, 
  ShieldAlert,
  Sparkles,
  CalendarCheck
} from 'lucide-react';
import { DailyReminderConfig } from '../types';

interface ReminderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DailyReminderConfig;
  onUpdateConfig: (newConfig: DailyReminderConfig) => void;
}

export const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  const [enabled, setEnabled] = useState(config.enabled);
  const [reminderTime, setReminderTime] = useState(config.reminderTime);
  const [soundEnabled, setSoundEnabled] = useState(config.soundEnabled);
  const [testSent, setTestSent] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    } else {
      setPermissionState('unsupported');
    }
  }, []);

  if (!isOpen) return null;

  // Gentle audio chime using Web Audio API
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      // Pleasant E5 note
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.log('Audio not allowed yet:', e);
    }
  };

  // Request browser notification permission
  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission === 'granted') {
        setEnabled(true);
      }
    }
  };

  // Trigger immediate test notification
  const handleSendTestNotification = () => {
    if (soundEnabled) {
      playChime();
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🔔 CatatBelanja: Waktunya Catat Pengeluaran!', {
          body: 'Halo! Jangan lupa catat struk & transaksi belanja hari ini agar anggaran bulanan tetap terkontrol.',
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.log('Notification constructor failed, fallback to in-app toast', e);
      }
    }

    setTestSent(true);
    setTimeout(() => setTestSent(false), 3500);
  };

  const handleSave = () => {
    onUpdateConfig({
      ...config,
      enabled,
      reminderTime,
      soundEnabled,
      notificationPermission: permissionState,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        id="modal-reminder-settings"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-scaleUp"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Sistem Pengingat Harian
              </h3>
              <p className="text-xs text-slate-500">
                Bangun rutinitas pencatatan belanjaan secara disiplin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Streak Status Banner */}
          <div className="p-4 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Flame className="w-6 h-6 fill-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-900">Streak Rutinitas Mencatat</p>
                <p className="text-lg font-extrabold text-amber-800">
                  {config.streakDays} Hari Berturut-turut! 🔥
                </p>
              </div>
            </div>
            <span className="text-xs bg-white text-amber-800 font-bold px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
              Konsisten
            </span>
          </div>

          {/* Browser Permission Banner */}
          {permissionState !== 'granted' && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start justify-between gap-3 text-xs text-blue-900">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Izin Notifikasi Web Belum Aktif</p>
                  <p className="text-blue-700 mt-0.5">
                    Aktifkan izin peramban agar alarm pengingat dapat muncul otomatis di desktop/layar Anda.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRequestPermission}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shrink-0 transition-colors text-xs"
              >
                Izinkan
              </button>
            </div>
          )}

          {/* Settings Options */}
          <div className="space-y-4">
            
            {/* Enable switch */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Aktifkan Pengingat Harian
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Kirim notifikasi pengingat setiap malam
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Time Picker */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Waktu Pengingat (WIB)
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Direkomendasikan saat malam setelah selesai beraktivitas
                  </span>
                </div>
              </div>
              <input
                type="time"
                value={reminderTime ?? '20:30'}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 outline-hidden"
              />
            </div>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Suara Denting Chime Pengingat
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Bunyikan nada lembut saat notifikasi muncul
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) playChime();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  soundEnabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {soundEnabled ? 'Aktif' : 'Senyap'}
              </button>
            </div>

          </div>

          {/* Test Notification Feedback */}
          {testSent && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-medium animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Notifikasi tes berhasil dikirim! Silakan periksa layar peramban Anda.</span>
            </div>
          )}

          {/* Test Trigger Button */}
          <div className="pt-2">
            <button
              id="btn-test-notification"
              onClick={handleSendTestNotification}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-slate-300"
            >
              <Send className="w-4 h-4 text-amber-600" />
              <span>Kirim Tes Notifikasi Pengingat Sekarang</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-medium transition-colors"
          >
            Tutup
          </button>
          <button
            id="btn-save-reminder-settings"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs shadow-emerald-600/20 transition-colors"
          >
            Simpan Pengaturan
          </button>
        </div>

      </div>
    </div>
  );
};
