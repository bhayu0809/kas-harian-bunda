"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getSetting, setSetting } from "@/lib/db/repo";
import { getBudgetStatus } from "@/lib/budget";
import { cacheBudgetStatus, showLocalNotification } from "@/lib/notify";

const NOTIFIED_KEY = "budget_alert_notified";

// Evaluates the monthly expense limit on data changes: drives the in-app banner and
// fires a system notification at most once per month (when permitted).
export function useBudgetAlert() {
  const { isLoaded, transactions, monthlyBudget, notifPermission } = useApp();
  const [dismissed, setDismissed] = useState(false);

  const status = useMemo(
    () => getBudgetStatus(transactions, monthlyBudget),
    [transactions, monthlyBudget]
  );

  useEffect(() => {
    if (!isLoaded) return;

    void cacheBudgetStatus({
      shouldAlert: status.shouldAlert,
      message: status.message,
      monthKey: status.monthKey,
    });

    if (!status.shouldAlert) return;

    if (notifPermission === "granted" && getSetting(NOTIFIED_KEY) !== status.monthKey) {
      void showLocalNotification("Batas Pengeluaran", status.message);
      void setSetting(NOTIFIED_KEY, status.monthKey);
    }
  }, [isLoaded, status, notifPermission]);

  return {
    visible: status.shouldAlert && !dismissed,
    message: status.message,
    exceeded: status.exceeded,
    dismiss: () => setDismissed(true),
  };
}
