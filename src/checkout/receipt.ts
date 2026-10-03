import type { CheckoutOrder } from "../api/store";

const KEY = "vee-order-receipt";

export type ReceiptReference = { orderNumber: number; receiptToken: string };

export function saveReceipt(order: CheckoutOrder) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        orderNumber: order.orderNumber,
        receiptToken: order.receiptToken,
      }),
    );
  } catch {
    // The just-placed confirmation still works if browser storage is disabled.
  }
}

export function readReceipt(): ReceiptReference | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (
      Number.isSafeInteger(value?.orderNumber) &&
      value.orderNumber > 0 &&
      typeof value.receiptToken === "string" &&
      /^[a-f0-9]{64}$/.test(value.receiptToken)
    )
      return value;
  } catch {
    // Treat unavailable or corrupt tab storage as no receipt.
  }
  return null;
}

export function clearReceipt() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Storage may be disabled.
  }
}
