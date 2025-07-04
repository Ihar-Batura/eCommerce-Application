import { useState, useEffect } from 'react';
import styles from './Counter.module.scss';
import formatPrice from '@shared/utlis/price-formatter';
import { CartData } from '@shared/types/types';

interface CounterProps {
  readonly price: number;
  readonly amount: number;
  readonly disabled?: boolean;
  readonly onChange?: (value: number) => void;
  readonly cart?: CartData;
}

export default function Counter({
  price,
  amount,
  disabled,
  onChange,
  cart,
}: CounterProps) {
  const [quantity, setQuantity] = useState(amount);

  useEffect(() => {
    setQuantity(amount);
  }, [amount]);

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
      onChange?.(quantity - 1);
    }
  };

  const handleIncrement = () => {
    setQuantity(quantity + 1);
    onChange?.(quantity + 1);
  };

  const totalSum =
    cart?.lineItems.length === 1
      ? cart.totalPrice.centAmount / 100
      : quantity * price;

  return (
    <div className={styles.container}>
      <div className={styles.counter}>
        <button
          className={styles.button}
          onClick={handleDecrement}
          disabled={disabled || quantity === 1}
        >
          -
        </button>
        <input
          className={styles.input}
          type="number"
          value={quantity}
          readOnly
          disabled={disabled}
        />
        <button
          className={styles.button}
          onClick={handleIncrement}
          disabled={disabled}
        >
          +
        </button>
      </div>
      <span className={styles.sum}>
        Total: {formatPrice({ centAmount: totalSum * 100 })}
      </span>
    </div>
  );
}
