import { InputHTMLAttributes, forwardRef } from 'react';
import { Input } from '../ui/Input';

interface FormDatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const FormDatePicker = forwardRef<HTMLInputElement, FormDatePickerProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="date"
        label={label}
        error={error}
        helperText={helperText}
        className={className}
        {...props}
      />
    );
  }
);

FormDatePicker.displayName = 'FormDatePicker';

