import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  // required for the light and dark schemes to switch through CSS variables
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: true,
    dark: true,
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },
  components: {
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiButton: {
      defaultProps: { size: 'small' },
      styleOverrides: { root: { textTransform: 'none' } },
    },
    MuiIconButton: { defaultProps: { size: 'small' } },
    MuiChip: { defaultProps: { size: 'small' } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});
