import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { textXs } from '../../theme/typography';

interface FormFieldProps {
  label: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  children: ReactNode;
  noMargin?: boolean;
}

export function FormField({
  label,
  error,
  touched,
  required,
  children,
  noMargin,
}: FormFieldProps) {
  const showError = touched && error;

  return (
    <Box sx={{ mb: noMargin ? 0 : 2.5 }}>
      <Typography
        component="label"
        sx={{
          ...textXs,
          display: 'block',
          mb: 0.5,
          color: showError ? 'error.main' : 'text.secondary',
        }}
      >
        {label}
        {required && (
          <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>
            *
          </Box>
        )}
      </Typography>
      {children}
      {showError && (
        <Typography
          variant="caption"
          color="error.main"
          sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
