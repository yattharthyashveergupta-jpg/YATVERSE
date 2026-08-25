'use client'

import { createClient } from '@/utils/supabase/client'

export type PushPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function getPushPermissionStatus(): PushPermissionStatus {
  if (typeof window === 'undefined' || !isPushSupported()) {
    return 'unsupported'
  }
  return Notification.permission as PushPermissionStatus
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    return registration
  } catch (err) {
    console.warn('Service Worker registration notice:', err)
    return null
  }
}

export async function requestPushPermissionAndSubscribe(): Promise<{
  status: PushPermissionStatus
  subscribed: boolean
  error?: string
}> {
  if (!isPushSupported()) {
    return { status: 'unsupported', subscribed: false, error: 'Push notifications are not supported in this browser.' }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { status: permission as PushPermissionStatus, subscribed: false }
    }

    // Register service worker
    const registration = await registerServiceWorker()
    if (!registration) {
      return { status: 'granted', subscribed: false, error: 'Could not register service worker.' }
    }

    // If VAPID public key is configured, subscribe to PushManager
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (vapidPublicKey) {
      try {
        let subscription = await registration.pushManager.getSubscription()
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          })
        }

        // Send subscription to server
        if (subscription) {
          try {
            await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription }),
            })
          } catch (apiErr) {
            console.warn('Could not sync push subscription to server endpoint:', apiErr)
          }
        }
      } catch (pushErr: any) {
        console.warn('PushManager subscription warning (native local notifications active):', pushErr)
      }
    }

    return { status: 'granted', subscribed: true }
  } catch (err: any) {
    console.error('Push notification permission error:', err)
    return { status: 'denied', subscribed: false, error: err.message }
  }
}

export async function sendLocalBrowserNotification(
  title: string,
  options?: {
    body?: string
    icon?: string
    tag?: string
    url?: string
  }
): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return false
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body: options?.body || 'YATVERSE Academic Notification',
          icon: options?.icon || '/icon-dark-32x32.png',
          badge: '/icon-dark-32x32.png',
          tag: options?.tag || `yatverse-${Date.now()}`,
          data: {
            url: options?.url || '/',
          },
        })
        return true
      }
    }

    // Fallback to standard Notification constructor
    new Notification(title, {
      body: options?.body || 'YATVERSE Academic Notification',
      icon: options?.icon || '/icon-dark-32x32.png',
      tag: options?.tag || `yatverse-${Date.now()}`,
    })
    return true
  } catch (err) {
    console.warn('Failed to dispatch browser notification:', err)
    return false
  }
}
