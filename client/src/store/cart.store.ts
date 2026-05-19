import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id:             string
  slug:           string
  title:          string
  thumbnailUrl?:  string
  price?:         number
  isFree?:        boolean
  instructorName?: string
}

interface CartStore {
  items:      CartItem[]
  addItem:    (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart:  () => void
  isInCart:   (id: string) => boolean
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem:    item => { if (!get().isInCart(item.id)) set(s => ({ items: [...s.items, item] })) },
      removeItem: id   => set(s => ({ items: s.items.filter(i => i.id !== id) })),
      clearCart:  ()   => set({ items: [] }),
      isInCart:   id   => get().items.some(i => i.id === id),
    }),
    { name: 'lms-cart' },
  ),
)
