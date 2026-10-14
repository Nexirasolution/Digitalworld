// Thrown for problems the shopper can fix (out of stock, bad cart, ...).
// Routes should catch it and return its message with a 400.
export class OrderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OrderError';
  }
}