"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsSupported("serviceWorker" in navigator && "PushManager" in window);

    // Check existing subscription
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setIsLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from backend
      const { data } = await api.get("/notifications/vapid-key");
      const vapidKey = urlBase64ToUint8Array(data.public_key);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey as BufferSource,
      });

      // Send subscription to backend
      await api.post("/notifications/subscribe", {
        subscription: subscription.toJSON(),
      });

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error("Push subscription failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await api.post("/notifications/unsubscribe", {
          endpoint: subscription.endpoint,
        });
      }
      setIsSubscribed(false);
    } catch (error) {
      console.error("Push unsubscribe failed:", error);
    }
  }, []);

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}
