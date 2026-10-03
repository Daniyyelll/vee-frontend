export function estimatedDeliveryDate(orderDate: Date): Date {
  const date = new Date(
    orderDate.getFullYear(),
    orderDate.getMonth(),
    orderDate.getDate(),
  );
  let businessDays = 0;
  while (businessDays < 2) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 5 && date.getDay() !== 6) businessDays++;
  }
  return date;
}
