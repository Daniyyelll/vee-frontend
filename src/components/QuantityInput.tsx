import { useEffect, useId, useState } from "react";
import type { KeyboardEvent } from "react";

type Props = {
  productName: string;
  quantity: number;
  max: number;
  disabled?: boolean;
  onCommit: (quantity: number) => void;
};

export default function QuantityInput({
  productName,
  quantity,
  max,
  disabled = false,
  onCommit,
}: Props) {
  const [draft, setDraft] = useState(String(quantity));
  const [error, setError] = useState("");
  const errorId = useId();

  useEffect(() => {
    setDraft(String(quantity));
    setError("");
  }, [quantity]);

  function commit() {
    const value = Number(draft);
    if (
      !/^\d+$/.test(draft) ||
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > max
    ) {
      setError(
        `Enter a whole number from 1 to ${max}. Use minus to remove the item.`,
      );
      return;
    }
    setError("");
    if (value !== quantity) onCommit(value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  }

  return (
    <>
      <input
        className="quantity-input"
        aria-label={`${productName} quantity`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        type="text"
        inputMode="numeric"
        value={draft}
        disabled={disabled}
        onChange={(event) => {
          setDraft(event.target.value);
          setError("");
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      {error && (
        <small className="quantity-error" id={errorId} role="alert">
          {error}
        </small>
      )}
    </>
  );
}
