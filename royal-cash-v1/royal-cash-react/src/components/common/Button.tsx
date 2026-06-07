import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'outline' | 'danger' | 'bit' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'gold',
      size = 'md',
      isLoading = false,
      fullWidth = true,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      gold: 'bg-gold text-black hover:bg-gold-light',
      outline: 'bg-transparent border border-gold text-gold hover:bg-gold hover:text-black',
      danger: 'bg-danger text-white hover:bg-red-600',
      bit: 'bg-bit-blue text-white hover:bg-blue-700',
      ghost: 'bg-transparent text-gold hover:bg-gold/10',
    };

    const sizeStyles = {
      sm: 'py-2 px-3 text-sm',
      md: 'py-3 px-4',
      lg: 'py-4 px-6 text-lg',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
