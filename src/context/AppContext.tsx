"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as repo from "@/lib/db/repo";
import * as auth from "@/lib/auth/credentials";
import { initDb, resetToDefaults } from "@/lib/db/sqlite";
import { exportCsv, exportDbFile, importDbFile } from "@/lib/export/exporters";
import { DEFAULT_SAVED_AMOUNT, DEFAULT_SAVINGS_TARGET } from "@/lib/db/seed";
import { notificationPermission, requestNotificationPermission } from "@/lib/notify";
import type { Category, Transaction } from "@/lib/db/types";

// Re-export domain types so existing pages keep importing them from here.
export type { Category, Transaction } from "@/lib/db/types";

interface AppContextType {
  // session
  isAuthenticated: boolean;
  isLoaded: boolean;
  authenticate: (pin: string) => Promise<boolean>;
  unlockBiometric: () => Promise<boolean>;
  logout: () => void;
  // data
  transactions: Transaction[];
  categories: Category[];
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  addCategory: (c: Omit<Category, "id">) => Promise<void>;
  savingsTarget: number;
  savedAmount: number;
  setSavingsTarget: (target: number) => void;
  setSavedAmount: (amount: number) => void;
  // monthly budget alerts
  monthlyBudget: number;
  setMonthlyBudget: (amount: number) => void;
  notifPermission: NotificationPermission | "unsupported";
  enableBudgetAlerts: () => Promise<boolean>;
  // security
  pinIsDefault: boolean;
  changePin: (pin: string) => Promise<void>;
  biometricAvailable: boolean;
  biometricEnrolled: boolean;
  enrollBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  // backup
  exportDb: () => void;
  exportCsvData: () => void;
  importDb: (file: File) => Promise<void>;
  resetData: () => Promise<void>;
  // privacy
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SESSION_KEY = "kasharian_auth";
const HIDE_AMOUNTS_KEY = "kasharian_hide_amounts";

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsTarget, setSavingsTargetState] = useState(DEFAULT_SAVINGS_TARGET);
  const [savedAmount, setSavedAmountState] = useState(DEFAULT_SAVED_AMOUNT);
  const [pinIsDefault, setPinIsDefault] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [monthlyBudget, setMonthlyBudgetState] = useState(0);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  // Pull the current database state into React state.
  const refreshAll = useCallback(() => {
    setTransactions(repo.listTransactions());
    setCategories(repo.listCategories());
    setSavingsTargetState(Number(repo.getSetting("savings_target") ?? DEFAULT_SAVINGS_TARGET));
    setSavedAmountState(Number(repo.getSetting("saved_amount") ?? DEFAULT_SAVED_AMOUNT));
    setMonthlyBudgetState(Number(repo.getSetting("monthly_budget") ?? 0));
    setPinIsDefault(auth.isPinDefault());
    setBiometricEnrolled(auth.isBiometricEnrolled());
  }, []);

  // Initialise the database once on mount.
  useEffect(() => {
    (async () => {
      await initDb();
      await auth.ensureDefaultPin();
      refreshAll();
      setBiometricAvailable(await auth.isBiometricAvailable());
      if (sessionStorage.getItem(SESSION_KEY) === "true") setIsAuthenticated(true);
      setHideAmounts(localStorage.getItem(HIDE_AMOUNTS_KEY) === "true");
      setNotifPermission(notificationPermission());
      setIsLoaded(true);
    })().catch((err) => {
      console.error("Gagal inisialisasi database:", err);
      setIsLoaded(true);
    });
  }, [refreshAll]);

  // Reflect privacy mode on <body> so the global .hide-amounts CSS rule applies.
  useEffect(() => {
    document.body.classList.toggle("hide-amounts", hideAmounts);
  }, [hideAmounts]);

  const unlock = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem(SESSION_KEY, "true");
  };

  const authenticate = async (pin: string) => {
    const ok = await auth.verifyPin(pin);
    if (ok) unlock();
    return ok;
  };

  const unlockBiometric = async () => {
    try {
      const ok = await auth.unlockWithBiometric();
      if (ok) unlock();
      return ok;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const addTransaction = async (t: Omit<Transaction, "id">) => {
    const tx = await repo.addTransaction(t);
    setTransactions((prev) => [tx, ...prev]);
  };

  const addCategory = async (c: Omit<Category, "id">) => {
    const cat = await repo.addCategory(c);
    setCategories((prev) => [...prev, cat]);
  };

  const setSavingsTarget = (target: number) => {
    setSavingsTargetState(target);
    void repo.setSetting("savings_target", String(target));
  };

  const setSavedAmount = (amount: number) => {
    setSavedAmountState(amount);
    void repo.setSetting("saved_amount", String(amount));
  };

  const setMonthlyBudget = (amount: number) => {
    setMonthlyBudgetState(amount);
    void repo.setSetting("monthly_budget", String(amount));
  };

  const enableBudgetAlerts = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(notificationPermission());
    return granted;
  };

  const changePin = async (pin: string) => {
    await auth.setPin(pin, false);
    setPinIsDefault(false);
  };

  const enrollBiometric = async () => {
    const ok = await auth.enrollBiometric();
    setBiometricEnrolled(auth.isBiometricEnrolled());
    return ok;
  };

  const disableBiometric = async () => {
    await auth.disableBiometric();
    setBiometricEnrolled(false);
  };

  const importDb = async (file: File) => {
    await importDbFile(file);
    refreshAll();
  };

  const resetData = async () => {
    await resetToDefaults();
    refreshAll();
  };

  const toggleHideAmounts = () => {
    setHideAmounts((prev) => {
      const next = !prev;
      localStorage.setItem(HIDE_AMOUNTS_KEY, String(next));
      return next;
    });
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        isLoaded,
        authenticate,
        unlockBiometric,
        logout,
        transactions,
        categories,
        addTransaction,
        addCategory,
        savingsTarget,
        savedAmount,
        setSavingsTarget,
        setSavedAmount,
        monthlyBudget,
        setMonthlyBudget,
        notifPermission,
        enableBudgetAlerts,
        pinIsDefault,
        changePin,
        biometricAvailable,
        biometricEnrolled,
        enrollBiometric,
        disableBiometric,
        exportDb: exportDbFile,
        exportCsvData: () => exportCsv(transactions),
        importDb,
        resetData,
        hideAmounts,
        toggleHideAmounts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
