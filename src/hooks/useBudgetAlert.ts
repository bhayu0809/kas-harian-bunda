"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getSetting, setSetting } from "@/lib/db/repo";
import { getBudgetStatus, getDailySpendingStatus } from "@/lib/budget";
import { cacheBudgetStatus, showLocalNotification } from "@/lib/notify";

const MONTHLY_NOTIFIED_KEY = "budget_alert_notified";
const DAILY_NOTIFIED_KEY = "daily_spending_alert_notified";

// Evaluates daily and monthly expense limits on data changes: drives the in-app
// banner and fires a system notification at most once per alert period.
export function useBudgetAlert() {
  const { isLoaded, transactions, monthlyBudget, dailySpendingLimit, notifPermission } = useApp();
  const [dismissed, setDismissed] = useState(false);

  const status = useMemo(
    () => {
      const daily = getDailySpendingStatus(transactions, dailySpendingLimit);
      if (daily.shouldAlert) return daily;
      return getBudgetStatus(transactions, monthlyBudget);
    },
    [transactions, monthlyBudget, dailySpendingLimit]
  );

  useEffect(() => {
    if (!isLoaded) return;

    void cacheBudgetStatus({
      shouldAlert: status.shouldAlert,
      message: status.message,
      key: status.key,
      title: status.title,
    });

    if (!status.shouldAlert) return;

    const notifiedKey = status.key.startsWith("daily-") ? DAILY_NOTIFIED_KEY : MONTHLY_NOTIFIED_KEY;
    if (notifPermission === "granted" && getSetting(notifiedKey) !== status.key) {
      void showLocalNotification(status.title, status.message);
      void setSetting(notifiedKey, status.key);
    }
  }, [isLoaded, status, notifPermission]);

  return {
    visible: status.shouldAlert && !dismissed,
    message: status.message,
    exceeded: status.exceeded,
    dismiss: () => setDismissed(true),
  };
}
