export interface CartItem {
  id: string;
  name: string;
  unitPrice: number; // in cents
  quantity: number;
}

export type Cart = readonly CartItem[];

function assertValidQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError(`Invalid quantity: ${quantity}. Must be a positive integer.`);
  }
}

/**
 * Returns a new cart with the item added. If an item with the same id is
 * already in the cart, its quantity is increased instead of adding a duplicate.
 * Throws RangeError if quantity is not a positive integer.
 */
export function addItem(cart: Cart, item: CartItem): CartItem[] {
  assertValidQuantity(item.quantity);
  const existing = cart.find((i) => i.id === item.id);
  if (existing) {
    return cart.map((i) =>
      i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : { ...i },
    );
  }
  return [...cart.map((i) => ({ ...i })), { ...item }];
}

/**
 * Returns a new cart without the item with the given id.
 * Removing an id that is not in the cart is a no-op.
 */
export function removeItem(cart: Cart, id: string): CartItem[] {
  return cart.filter((i) => i.id !== id).map((i) => ({ ...i }));
}

/** Sum of unitPrice * quantity across all items, in cents. */
export function subtotal(cart: Cart): number {
  return cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

/**
 * Total in cents after applying a percentage discount (0–100), rounded to the
 * nearest cent. Throws RangeError if discountPercent is outside 0–100.
 */
export function computeTotal(cart: Cart, discountPercent = 0): number {
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    throw new RangeError(`Invalid discount: ${discountPercent}. Must be between 0 and 100.`);
  }
  const raw = subtotal(cart) * (1 - discountPercent / 100);
  return Math.round(raw);
}
