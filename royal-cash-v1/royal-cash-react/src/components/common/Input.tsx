import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block mb-2 text-sm font-medium text-text-main">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full p-3 bg-black border border-gray-700 text-white rounded-lg
            focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20
            placeholder:text-muted
            ${error ? 'border-danger' : ''}
            ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block mb-2 text-sm font-medium text-text-main">{label}</label>
        )}
        <select
          ref={ref}
          className={`w-full p-3 bg-black border border-gray-700 text-white rounded-lg
            focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20
            ${error ? 'border-danger' : ''}
            ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
