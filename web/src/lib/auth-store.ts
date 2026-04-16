'use client'

import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  fetchUser: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  fetchUser: async () => {
    try {
      const res = await fetch('/api/auth')
      const data = await res.json()
      set({ user: data.user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    set({ user: data.user })
  },

  register: async (email, password, name) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', email, password, name }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    set({ user: data.user })
  },

  logout: async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    set({ user: null })
  },
}))
