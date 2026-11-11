import { addItem, removeItem, subtotal, computeTotal, Cart, CartItem } from './cart';

const apple: CartItem = { id: 'a', name: 'Apple', unitPrice: 100, quantity: 2 };
const pear: CartItem = { id: 'p', name: 'Pear', unitPrice: 250, quantity: 1 };

describe('addItem', () => {
  it('adds a new item to an empty cart', () => {
    expect(addItem([], apple)).toEqual([apple]);
  });

  it('appends a new item with a different id', () => {
    expect(addItem([apple], pear)).toEqual([apple, pear]);
  });

  it('increases quantity when the id already exists, without duplicating', () => {
    const result = addItem([apple, pear], { ...apple, quantity: 3 });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ ...apple, quantity: 5 });
    expect(result[1]).toEqual(pear);
  });

  it('keeps the existing item name and price when merging', () => {
    const result = addItem([apple], { id: 'a', name: 'Other', unitPrice: 999, quantity: 1 });
    expect(result).toEqual([{ ...apple, quantity: 3 }]);
  });

  it('does not mutate the original cart or its items', () => {
    const cart: Cart = Object.freeze([Object.freeze({ ...apple })]);
    const result = addItem(cart, { ...apple, quantity: 1 });
    expect(cart).toEqual([apple]);
    expect(result).not.toBe(cart);
  });

  it('returns copies of items rather than shared references', () => {
    const cart = [{ ...apple }];
    const newItem = { ...pear };
    const result = addItem(cart, newItem);
    expect(result[0]).not.toBe(cart[0]);
    expect(result[1]).not.toBe(newItem);
  });

  it.each([0, -1, 1.5, NaN, Infinity])('throws RangeError for invalid quantity %p', (quantity) => {
    expect(() => addItem([], { ...apple, quantity })).toThrow(RangeError);
  });

  it('throws for invalid quantity even when the item already exists', () => {
    expect(() => addItem([apple], { ...apple, quantity: 0 })).toThrow(/Invalid quantity/);
  });
});

describe('removeItem', () => {
  it('removes the item with the given id', () => {
    expect(removeItem([apple, pear], 'a')).toEqual([pear]);
  });

  it('is a no-op for an id that is not in the cart', () => {
    expect(removeItem([apple, pear], 'zzz')).toEqual([apple, pear]);
  });

  it('returns an empty array when removing from an empty cart', () => {
    expect(removeItem([], 'a')).toEqual([]);
  });

  it('can empty the cart by removing the last item', () => {
    expect(removeItem([apple], 'a')).toEqual([]);
  });

  it('does not mutate the original cart and returns copied items', () => {
    const cart: Cart = Object.freeze([Object.freeze({ ...apple }), Object.freeze({ ...pear })]);
    const result = removeItem(cart, 'a');
    expect(cart).toHaveLength(2);
    expect(result[0]).toEqual(pear);
    expect(result[0]).not.toBe(cart[1]);
  });
});

describe('subtotal', () => {
  it('returns 0 for an empty cart', () => {
    expect(subtotal([])).toBe(0);
  });

  it('computes unitPrice * quantity for a single item', () => {
    expect(subtotal([apple])).toBe(200);
  });

  it('sums across multiple items', () => {
    expect(subtotal([apple, pear])).toBe(450);
  });

  it('handles zero-priced items', () => {
    expect(subtotal([{ id: 'f', name: 'Free', unitPrice: 0, quantity: 5 }, pear])).toBe(250);
  });
});

describe('computeTotal', () => {
  const cart = [apple, pear]; // subtotal 450

  it('returns the subtotal when no discount is given', () => {
    expect(computeTotal(cart)).toBe(450);
  });

  it('applies a percentage discount', () => {
    expect(computeTotal(cart, 10)).toBe(405);
    expect(computeTotal(cart, 50)).toBe(225);
  });

  it('returns 0 for a 100% discount', () => {
    expect(computeTotal(cart, 100)).toBe(0);
  });

  it('returns the full subtotal for a 0% discount', () => {
    expect(computeTotal(cart, 0)).toBe(450);
  });

  it('returns 0 for an empty cart regardless of discount', () => {
    expect(computeTotal([], 25)).toBe(0);
  });

  it('rounds down to the nearest cent', () => {
    const c = [{ id: 'x', name: 'X', unitPrice: 999, quantity: 1 }];
    expect(computeTotal(c, 10)).toBe(899); // 899.1
  });

  it('rounds half up to the nearest cent', () => {
    const c = [{ id: 'x', name: 'X', unitPrice: 999, quantity: 1 }];
    expect(computeTotal(c, 50)).toBe(500); // 499.5
  });

  it.each([-1, -0.01, 100.01, 101, NaN, Infinity, -Infinity])(
    'throws RangeError for invalid discount %p',
    (discount) => {
      expect(() => computeTotal(cart, discount)).toThrow(RangeError);
    },
  );

  it('includes the offending value in the error message', () => {
    expect(() => computeTotal(cart, 150)).toThrow(/Invalid discount: 150/);
  });
});
