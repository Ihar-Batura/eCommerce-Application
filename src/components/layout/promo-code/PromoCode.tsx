import { useState, useRef, useEffect } from 'react';
import styles from './PromoCode.module.scss';
import discountTen from '@assets/images/discount-10.jpg';
import discountTwenty from '@assets/images/discount-20.jpg';
import discountThirty from '@assets/images/discount-30.jpg';
import { openDialog } from '@services/DialogService';

interface Toast {
  code: string;
}

const promoCodes = [
  {
    code: 'LUCKY-30',
    img: discountThirty,
    alt: '30% off promo code',
    minAmount: 2000,
  },
  {
    code: 'DYSON-20',
    img: discountTwenty,
    alt: '20% off promo code',
    minAmount: 1000,
  },
  {
    code: 'SUMMER-10',
    img: discountTen,
    alt: '10% off promo code',
    minAmount: 500,
  },
];

export default function PromoCode() {
  const [toast, setToast] = useState<Toast | null>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast({ code: textToCopy });
      timeoutRef.current = setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, 1500);
    } catch (err) {
      openDialog(`Copy error: ${err}`);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.promoBlock}>
      <h3 className={styles.promoTitle}>
        Welcome to Dyson! <br /> <span>GET your promo code NOW!</span>
      </h3>
      <div className={styles.promoCards}>
        {promoCodes.map(({ code, img, alt, minAmount }) => (
          <div key={code} className={styles.card}>
            <div className={styles.cardOverlay}></div>
            <img src={img} alt={alt} className={styles.promoImage} />
            <div className={styles.buttonWrapper}>
              <button
                ref={(el: HTMLButtonElement | null) => {
                  if (el) {
                    buttonRefs.current.set(code, el);
                  }
                }}
                className={`${styles.promoButton} ${toast?.code === code ? styles.copied : ''}`}
                onClick={() => handleCopy(code)}
                aria-label={`Copy promo code ${code}`}
              >
                {code}
              </button>
              {toast?.code === code && (
                <output className={styles.toast}>
                  <svg
                    className={styles.checkmark}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </output>
              )}
              <div className={styles.conditionText}>
                Applicable from ${minAmount}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
