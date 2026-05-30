"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function LoginPage() {
  const {
    authenticate,
    unlockBiometric,
    biometricAvailable,
    biometricEnrolled,
    isAuthenticated,
    isLoaded,
  } = useApp();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isLoaded && isAuthenticated) router.push("/");
  }, [isAuthenticated, isLoaded, router]);

  const showBiometric = biometricAvailable && biometricEnrolled;

  const fail = (message: string) => {
    setError(message);
    setShake(true);
    setPin("");
    setTimeout(() => setShake(false), 500);
  };

  const submitPin = async (enteredPin: string) => {
    const ok = await authenticate(enteredPin);
    if (ok) router.push("/");
    else fail("PIN salah! Coba lagi.");
  };

  const handleKeyPress = (num: string) => {
    if (error) setError("");
    if (pin.length >= 4) return;
    const nextPin = pin + num;
    setPin(nextPin);
    if (nextPin.length === 4) submitPin(nextPin);
  };

  const handleBackspace = () => {
    if (error) setError("");
    setPin(pin.slice(0, -1));
  };

  const handleBiometric = async () => {
    setError("");
    const ok = await unlockBiometric();
    if (ok) router.push("/");
    else fail("Biometrik gagal. Gunakan PIN.");
  };

  if (!isLoaded) return null;

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-6 md:p-12 min-h-screen bg-background">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* Header */}
        <div className="flex flex-col items-center mb-12 text-center space-y-6 w-full">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-surface-container-high rounded-3xl flex items-center justify-center shadow-soft mb-2 transition-transform duration-300 hover:scale-105">
            <span
              className="material-symbols-outlined text-[48px] text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance_wallet
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="font-headline text-2xl font-bold text-primary">Kas Harian Bunda</h1>
            <p className="font-body text-sm text-on-surface-variant max-w-[280px] mx-auto">
              Masukkan PIN untuk membuka catatan kas
            </p>
          </div>
        </div>

        {/* PIN Indicator Dots */}
        <div className={`flex justify-center gap-6 mb-12 h-4 ${shake ? "animate-shake" : ""}`}>
          {[0, 1, 2, 3].map((index) => {
            const hasValue = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? "bg-error scale-110"
                    : hasValue
                    ? "bg-primary scale-110 shadow-sm"
                    : "bg-outline-variant"
                }`}
              />
            );
          })}
        </div>

        {/* Error info */}
        <div className="h-6 mb-4 text-center">
          {error && (
            <p className="font-body text-xs text-error font-medium animate-fade-in">{error}</p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-2 mb-8 w-full px-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              type="button"
              className="h-20 rounded-full flex items-center justify-center bg-transparent hover:bg-surface-container-high active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <span className="font-headline text-3xl text-on-surface font-medium">{num}</span>
            </button>
          ))}

          {/* Biometric trigger (or empty spacer) */}
          {showBiometric ? (
            <button
              onClick={handleBiometric}
              aria-label="Buka dengan biometrik"
              type="button"
              className="h-20 rounded-full flex items-center justify-center text-secondary hover:bg-surface-container-high active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[32px]">fingerprint</span>
            </button>
          ) : (
            <div className="h-20" />
          )}

          <button
            onClick={() => handleKeyPress("0")}
            type="button"
            className="h-20 rounded-full flex items-center justify-center bg-transparent hover:bg-surface-container-high active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <span className="font-headline text-3xl text-on-surface font-medium">0</span>
          </button>

          <button
            onClick={handleBackspace}
            aria-label="Hapus"
            type="button"
            className="h-20 rounded-full flex items-center justify-center bg-transparent text-on-surface hover:bg-surface-container-high active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 0" }}>
              backspace
            </span>
          </button>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col items-center space-y-4">
          {showBiometric && (
            <button
              onClick={handleBiometric}
              type="button"
              className="w-full max-w-xs h-16 bg-secondary-container text-on-secondary-container font-body text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined">fingerprint</span>
              Buka dengan Sidik Jari / Face ID
            </button>
          )}
          <button
            onClick={() => submitPin(pin)}
            disabled={pin.length < 4}
            type="button"
            className="w-full max-w-xs h-16 bg-primary text-on-primary font-body text-sm font-semibold rounded-xl flex items-center justify-center hover:opacity-90 active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Masuk
          </button>
          <button
            onClick={() => alert("PIN default adalah 1234. Ubah PIN di halaman Pengaturan.")}
            className="font-body text-xs text-secondary hover:text-on-secondary-container transition-colors py-2 px-4 rounded-lg hover:bg-surface-container-low cursor-pointer"
          >
            Lupa PIN?
          </button>
        </div>
      </div>
    </main>
  );
}
