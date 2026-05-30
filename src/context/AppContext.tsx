"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as repo from "@/lib/db/repo";
import * as auth from "@/lib/auth/credentials";
import * as autoBackup from "@/lib/backup/autoBackups";
import {
  closeDb,
  hasStoredDb,
  initDb,
  readPlaintextSettings,
  rekeyDb,
  requestPersistentStorage,
  resetStorageToDefaults,
  resetToDefaults,
} from "@/lib/db/sqlite";
import { exportCsv, exportEncryptedDbFile, importEncryptedDbFile } from "@/lib/export/exporters";
import {
  DEFAULT_DAILY_ROLLOVER,
  DEFAULT_DAILY_SPENDING_LIMIT,
  DEFAULT_PIN,
  DEFAULT_SAVED_AMOUNT,
  DEFAULT_SAVINGS_TARGET,
  DEFAULT_WEEKLY_SPENDING_LIMIT,
} from "@/lib/db/seed";
import { notificationPermission, requestNotificationPermission } from "@/lib/notify";
import type {
  AutoBackupFrequency,
  AutoBackupSnapshot,
  Category,
  CategoryBudgetMap,
  RecurringTransaction,
  Transaction,
  TransactionInput,
  TransactionTemplate,
} from "@/lib/db/types";

// Re-export domain types so existing pages keep importing them from here.
export type {
  AutoBackupFrequency,
  AutoBackupSnapshot,
  Category,
  CategoryBudgetMap,
  Debt,
  DebtKind,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
  TransactionInput,
  TransactionSource,
  Transfer,
  TransactionTemplate,
  TransactionType,
} from "@/lib/db/types";

interface AppContextType {
  // session
  isAuthenticated: boolean;
  isLoaded: boolean;
  /** True when the user had set up the app before but the local database blob is
   *  gone (browser evicted storage). The app reseeds defaults to stay usable,
   *  but the data should be restored from a backup. */
  storageEvicted: boolean;
  authenticate: (pin: string) => Promise<boolean>;
  unlockBiometric: () => Promise<boolean>;
  resetPinWithBiometric: () => Promise<boolean>;
  resetAppAndPin: () => Promise<void>;
  logout: () => void;
  // data
  transactions: Transaction[];
  templates: TransactionTemplate[];
  recurringTransactions: RecurringTransaction[];
  categories: Category[];
  addTransaction: (t: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, t: TransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  duplicateTransaction: (id: string) => Promise<void>;
  addTransactionTemplate: (t: Omit<TransactionTemplate, "id">) => Promise<void>;
  deleteTransactionTemplate: (id: string) => Promise<void>;
  addRecurringTransaction: (t: Omit<RecurringTransaction, "id" | "active" | "lastRunMonth">) => Promise<void>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  addCategory: (c: Omit<Category, "id">) => Promise<void>;
  updateCategory: (id: string, c: Omit<Category, "id">) => Promise<void>;
  profileName: string;
  profilePhoto: string;
  setProfile: (name: string, photo: string) => Promise<void>;
  savingsTarget: number;
  savedAmount: number;
  setSavingsTarget: (target: number) => Promise<void>;
  setSavedAmount: (amount: number) => Promise<void>;
  // monthly budget alerts
  monthlyBudget: number;
  setMonthlyBudget: (amount: number) => Promise<void>;
  dailySpendingLimit: number;
  setDailySpendingLimit: (amount: number) => Promise<void>;
  weeklySpendingLimit: number;
  setWeeklySpendingLimit: (amount: number) => Promise<void>;
  dailyRolloverEnabled: boolean;
  setDailyRolloverEnabled: (enabled: boolean) => Promise<void>;
  categoryBudgets: CategoryBudgetMap;
  setCategoryBudget: (category: string, amount: number) => Promise<void>;
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
  exportDb: () => Promise<void>;
  exportCsvData: () => void;
  importDb: (file: File, password?: string) => Promise<void>;
  autoBackups: AutoBackupSnapshot[];
  autoBackupEnabled: boolean;
  autoBackupFrequency: AutoBackupFrequency;
  autoBackupLastRun: string | null;
  setAutoBackupEnabled: (enabled: boolean) => Promise<void>;
  setAutoBackupFrequency: (frequency: AutoBackupFrequency) => Promise<void>;
  createAutoBackup: () => Promise<void>;
  restoreAutoBackup: (id: string) => Promise<void>;
  deleteAutoBackup: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
  // privacy
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SESSION_KEY = "kasharian_auth";
const SESSION_PIN_KEY = "kasharian_vault_pin";
const HIDE_AMOUNTS_KEY = "kasharian_hide_amounts";
const AUTO_LOCK_MS = 5 * 60 * 1000;
export const DEFAULT_PROFILE_NAME = "Bunda";
export const DEFAULT_PROFILE_PHOTO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCwfnRzzCqobbQUUBTDt4SUidJGSygI3y1bJcoI4lDQhvp3R81mk-5Zuw7I6Q8eCp-qJgCjtKMD64al35FYraT_uXWzKlfNt3WK78l5klplDRQj-_-R2-jGKcJIk0hozbIOhSnwxsD_mtXaWoYekYf2lR2IGtLSse0Ly7nZbjGrhk9C5VwLrGXklY6gzByJuolHRWjkJk1XNMc8o9IkGOnBvdqmD1MJUFeR-TGbyOY8ZgvpRJdvCDgvJKvkEKwQKzBiIV-mt26Xg6r_";

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageEvicted, setStorageEvicted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileName, setProfileNameState] = useState(DEFAULT_PROFILE_NAME);
  const [profilePhoto, setProfilePhotoState] = useState(DEFAULT_PROFILE_PHOTO);
  const [savingsTarget, setSavingsTargetState] = useState(DEFAULT_SAVINGS_TARGET);
  const [savedAmount, setSavedAmountState] = useState(DEFAULT_SAVED_AMOUNT);
  const [pinIsDefault, setPinIsDefault] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [monthlyBudget, setMonthlyBudgetState] = useState(0);
  const [dailySpendingLimit, setDailySpendingLimitState] = useState(DEFAULT_DAILY_SPENDING_LIMIT);
  const [weeklySpendingLimit, setWeeklySpendingLimitState] = useState(DEFAULT_WEEKLY_SPENDING_LIMIT);
  const [dailyRolloverEnabled, setDailyRolloverEnabledState] = useState(DEFAULT_DAILY_ROLLOVER);
  const [categoryBudgets, setCategoryBudgetsState] = useState<CategoryBudgetMap>({});
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [autoBackups, setAutoBackups] = useState<AutoBackupSnapshot[]>([]);
  const [autoBackupEnabledState, setAutoBackupEnabledState] = useState(false);
  const [autoBackupFrequencyState, setAutoBackupFrequencyState] = useState<AutoBackupFrequency>(
    autoBackup.DEFAULT_AUTO_BACKUP_FREQUENCY
  );
  const [autoBackupLastRunState, setAutoBackupLastRunState] = useState<string | null>(null);

  // Pull the current database state into React state.
  const refreshAll = useCallback(() => {
    setTransactions(repo.listTransactions());
    setTemplates(repo.listTransactionTemplates());
    setRecurringTransactions(repo.listRecurringTransactions());
    setCategories(repo.listCategories());
    setProfileNameState(repo.getSetting("profile_name") || DEFAULT_PROFILE_NAME);
    setProfilePhotoState(repo.getSetting("profile_photo") || DEFAULT_PROFILE_PHOTO);
    setSavingsTargetState(Number(repo.getSetting("savings_target") ?? DEFAULT_SAVINGS_TARGET));
    setSavedAmountState(Number(repo.getSetting("saved_amount") ?? DEFAULT_SAVED_AMOUNT));
    setMonthlyBudgetState(Number(repo.getSetting("monthly_budget") ?? 0));
    setDailySpendingLimitState(Number(repo.getSetting("daily_spending_limit") ?? DEFAULT_DAILY_SPENDING_LIMIT));
    setWeeklySpendingLimitState(Number(repo.getSetting("weekly_spending_limit") ?? DEFAULT_WEEKLY_SPENDING_LIMIT));
    setDailyRolloverEnabledState((repo.getSetting("daily_rollover") ?? (DEFAULT_DAILY_ROLLOVER ? "1" : "0")) === "1");
    setCategoryBudgetsState(repo.listCategoryBudgets());
    setPinIsDefault(auth.isPinDefault());
    setBiometricEnrolled(auth.isBiometricEnrolled());
    setAutoBackupEnabledState(autoBackup.autoBackupEnabled());
    setAutoBackupFrequencyState(autoBackup.autoBackupFrequency());
    setAutoBackupLastRunState(autoBackup.autoBackupLastRun());
  }, []);

  const refreshAutoBackups = useCallback(async () => {
    setAutoBackups(await autoBackup.listAutoBackups());
    setAutoBackupEnabledState(autoBackup.autoBackupEnabled());
    setAutoBackupFrequencyState(autoBackup.autoBackupFrequency());
    setAutoBackupLastRunState(autoBackup.autoBackupLastRun());
  }, []);

  const runAutoBackupIfDue = useCallback(
    async (reason: string) => {
      await autoBackup.maybeRunAutoBackup(reason);
      await refreshAutoBackups();
    },
    [refreshAutoBackups]
  );

  const unlock = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem(SESSION_KEY, "true");
  };

  const loadVault = useCallback(
    async (pin: string) => {
      await initDb(pin);
      await repo.applyDueRecurringTransactions();
      refreshAll();
      await runAutoBackupIfDue("app_open");
    },
    [refreshAll, runAutoBackupIfDue]
  );

  // Initialise security metadata once on mount. The encrypted database is only
  // opened after a successful PIN check.
  useEffect(() => {
    (async () => {
      // Ask the browser to keep IndexedDB so it isn't evicted under storage
      // pressure (the silent eviction is what makes settings "reset" on launch).
      await requestPersistentStorage();
      auth.importLegacyPinSettings(
        await readPlaintextSettings(["pin_hash", "pin_salt", "pin_is_default"])
      );
      await auth.ensureDefaultPin();
      // Onboarded before but the DB blob is gone => storage was evicted. initDb
      // will reseed defaults to keep the app usable; flag it so the UI can offer
      // a restore instead of silently losing the user's data.
      if (localStorage.getItem("kasharian_onboarded") === "true" && !(await hasStoredDb())) {
        setStorageEvicted(true);
      }
      setBiometricAvailable(await auth.isBiometricAvailable());
      setPinIsDefault(auth.isPinDefault());
      setBiometricEnrolled(auth.isBiometricEnrolled());
      const sessionPin = sessionStorage.getItem(SESSION_PIN_KEY);
      if (sessionStorage.getItem(SESSION_KEY) === "true" && sessionPin) {
        await loadVault(sessionPin);
        setIsAuthenticated(true);
      }
      setHideAmounts(localStorage.getItem(HIDE_AMOUNTS_KEY) === "true");
      setNotifPermission(notificationPermission());
      setIsLoaded(true);
    })().catch((err) => {
      console.error("Gagal inisialisasi database:", err);
      setIsLoaded(true);
    });
  }, [loadVault]);

  // Reflect privacy mode on <body> so the global .hide-amounts CSS rule applies.
  useEffect(() => {
    document.body.classList.toggle("hide-amounts", hideAmounts);
  }, [hideAmounts]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_PIN_KEY);
    closeDb();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logout(), AUTO_LOCK_MS);
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll", "visibilitychange"];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [isAuthenticated, logout]);

  const authenticate = async (pin: string) => {
    const remaining = auth.pinLockRemainingMs();
    if (remaining > 0) return false;
    const ok = await auth.verifyPin(pin);
    if (ok) {
      await loadVault(pin);
      sessionStorage.setItem(SESSION_PIN_KEY, pin);
      auth.clearPinLockout();
      unlock();
    } else {
      auth.recordFailedPinAttempt();
    }
    return ok;
  };

  const unlockBiometric = async () => {
    try {
      const ok = await auth.unlockWithBiometric();
      const sessionPin = sessionStorage.getItem(SESSION_PIN_KEY);
      if (ok && sessionPin) {
        await loadVault(sessionPin);
        unlock();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const resetPinWithBiometric = async () => {
    try {
      const ok = await auth.unlockWithBiometric();
      if (!ok) return false;
      const sessionPin = sessionStorage.getItem(SESSION_PIN_KEY);
      if (!sessionPin) return false;
      await loadVault(sessionPin);
      await rekeyDb(DEFAULT_PIN);
      await auth.setPin(DEFAULT_PIN, true);
      sessionStorage.setItem(SESSION_PIN_KEY, DEFAULT_PIN);
      setPinIsDefault(true);
      unlock();
      return true;
    } catch {
      return false;
    }
  };

  const resetAppAndPin = async () => {
    await resetStorageToDefaults(DEFAULT_PIN);
    await autoBackup.clearAutoBackups();
    await auth.setPin(DEFAULT_PIN, true);
    await auth.disableBiometric();
    refreshAll();
    await refreshAutoBackups();
    setBiometricEnrolled(false);
    logout();
  };

  const addTransaction = async (t: TransactionInput) => {
    const tx = await repo.addTransaction(t);
    setTransactions((prev) => [tx, ...prev]);
    await runAutoBackupIfDue("transaction_add");
  };

  const updateTransaction = async (id: string, t: TransactionInput) => {
    const tx = await repo.updateTransaction(id, t);
    setTransactions((prev) => prev.map((item) => (item.id === id ? tx : item)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    await runAutoBackupIfDue("transaction_update");
  };

  const deleteTransaction = async (id: string) => {
    await repo.deleteTransaction(id);
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    await runAutoBackupIfDue("transaction_delete");
  };

  const duplicateTransaction = async (id: string) => {
    const now = new Date();
    const tx = await repo.duplicateTransaction(id, now.toISOString());
    if (tx) setTransactions((prev) => [tx, ...prev]);
    await runAutoBackupIfDue("transaction_duplicate");
  };

  const addTransactionTemplate = async (t: Omit<TransactionTemplate, "id">) => {
    const template = await repo.addTransactionTemplate(t);
    setTemplates((prev) => [template, ...prev]);
    await runAutoBackupIfDue("template_add");
  };

  const deleteTransactionTemplate = async (id: string) => {
    await repo.deleteTransactionTemplate(id);
    setTemplates((prev) => prev.filter((template) => template.id !== id));
    await runAutoBackupIfDue("template_delete");
  };

  const addRecurringTransaction = async (t: Omit<RecurringTransaction, "id" | "active" | "lastRunMonth">) => {
    const recurring = await repo.addRecurringTransaction(t);
    setRecurringTransactions((prev) => [recurring, ...prev]);
    await runAutoBackupIfDue("recurring_add");
  };

  const deleteRecurringTransaction = async (id: string) => {
    await repo.deleteRecurringTransaction(id);
    setRecurringTransactions((prev) => prev.filter((recurring) => recurring.id !== id));
    await runAutoBackupIfDue("recurring_delete");
  };

  const addCategory = async (c: Omit<Category, "id">) => {
    const cat = await repo.addCategory(c);
    setCategories((prev) => [...prev, cat]);
    await runAutoBackupIfDue("category_add");
  };

  const updateCategory = async (id: string, c: Omit<Category, "id">) => {
    await repo.updateCategory(id, c);
    // Renaming cascades to transactions/templates/recurring, so refresh all.
    refreshAll();
    await runAutoBackupIfDue("category_edit");
  };

  const setProfile = async (name: string, photo: string) => {
    const nextName = name.trim() || DEFAULT_PROFILE_NAME;
    const nextPhoto = photo || DEFAULT_PROFILE_PHOTO;
    setProfileNameState(nextName);
    setProfilePhotoState(nextPhoto);
    await repo.setSetting("profile_name", nextName);
    await repo.setSetting("profile_photo", nextPhoto);
    await runAutoBackupIfDue("setting_profile");
  };

  const setSavingsTarget = async (target: number) => {
    setSavingsTargetState(target);
    await repo.setSetting("savings_target", String(target));
    await runAutoBackupIfDue("setting_savings_target");
  };

  const setSavedAmount = async (amount: number) => {
    setSavedAmountState(amount);
    await repo.setSetting("saved_amount", String(amount));
    await runAutoBackupIfDue("setting_saved_amount");
  };

  const setMonthlyBudget = async (amount: number) => {
    setMonthlyBudgetState(amount);
    await repo.setSetting("monthly_budget", String(amount));
    await runAutoBackupIfDue("setting_monthly_budget");
  };

  const setDailySpendingLimit = async (amount: number) => {
    setDailySpendingLimitState(amount);
    await repo.setSetting("daily_spending_limit", String(amount));
    await runAutoBackupIfDue("setting_daily_limit");
  };

  const setWeeklySpendingLimit = async (amount: number) => {
    setWeeklySpendingLimitState(amount);
    await repo.setSetting("weekly_spending_limit", String(amount));
    await runAutoBackupIfDue("setting_weekly_limit");
  };

  const setDailyRolloverEnabled = async (enabled: boolean) => {
    setDailyRolloverEnabledState(enabled);
    await repo.setSetting("daily_rollover", enabled ? "1" : "0");
    await runAutoBackupIfDue("setting_daily_rollover");
  };

  const setCategoryBudget = async (category: string, amount: number) => {
    await repo.setCategoryBudget(category, amount);
    setCategoryBudgetsState(repo.listCategoryBudgets());
    await runAutoBackupIfDue("setting_category_budget");
  };

  const enableBudgetAlerts = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(notificationPermission());
    return granted;
  };

  const changePin = async (pin: string) => {
    await rekeyDb(pin);
    await auth.setPin(pin, false);
    sessionStorage.setItem(SESSION_PIN_KEY, pin);
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

  const exportDb = async () => {
    const password = prompt("Masukkan password untuk backup terenkripsi (minimal 8 karakter).");
    if (!password) return;
    if (password.length < 8) throw new Error("Password backup minimal 8 karakter.");
    await exportEncryptedDbFile(password);
  };

  const importDb = async (file: File, password?: string) => {
    await importEncryptedDbFile(file, password ?? "");
    refreshAll();
    await runAutoBackupIfDue("restore_import");
  };

  const resetData = async () => {
    await resetToDefaults();
    refreshAll();
    await runAutoBackupIfDue("reset_data");
  };

  const setAutoBackupEnabled = async (enabled: boolean) => {
    await autoBackup.setAutoBackupEnabled(enabled);
    await refreshAutoBackups();
    if (enabled) await runAutoBackupIfDue("auto_backup_enabled");
  };

  const setAutoBackupFrequency = async (frequency: AutoBackupFrequency) => {
    await autoBackup.setAutoBackupFrequency(frequency);
    await refreshAutoBackups();
    await runAutoBackupIfDue("auto_backup_frequency");
  };

  const createAutoBackup = async () => {
    await autoBackup.createAutoBackup("manual");
    await refreshAutoBackups();
  };

  const restoreAutoBackup = async (id: string) => {
    await autoBackup.restoreAutoBackup(id);
    refreshAll();
    await refreshAutoBackups();
  };

  const deleteAutoBackup = async (id: string) => {
    await autoBackup.deleteAutoBackup(id);
    await refreshAutoBackups();
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
        storageEvicted,
        authenticate,
        unlockBiometric,
        resetPinWithBiometric,
        resetAppAndPin,
        logout,
        transactions,
        templates,
        recurringTransactions,
        categories,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        duplicateTransaction,
        addTransactionTemplate,
        deleteTransactionTemplate,
        addRecurringTransaction,
        deleteRecurringTransaction,
        addCategory,
        updateCategory,
        profileName,
        profilePhoto,
        setProfile,
        savingsTarget,
        savedAmount,
        setSavingsTarget,
        setSavedAmount,
        monthlyBudget,
        setMonthlyBudget,
        dailySpendingLimit,
        setDailySpendingLimit,
        weeklySpendingLimit,
        setWeeklySpendingLimit,
        dailyRolloverEnabled,
        setDailyRolloverEnabled,
        categoryBudgets,
        setCategoryBudget,
        notifPermission,
        enableBudgetAlerts,
        pinIsDefault,
        changePin,
        biometricAvailable,
        biometricEnrolled,
        enrollBiometric,
        disableBiometric,
        exportDb,
        exportCsvData: () => exportCsv(transactions),
        importDb,
        autoBackups,
        autoBackupEnabled: autoBackupEnabledState,
        autoBackupFrequency: autoBackupFrequencyState,
        autoBackupLastRun: autoBackupLastRunState,
        setAutoBackupEnabled,
        setAutoBackupFrequency,
        createAutoBackup,
        restoreAutoBackup,
        deleteAutoBackup,
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
