// theme.ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#5C4033", // AppBar chocolate
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#9B4C89", // Button magenta
      contrastText: "#ffffff",
    },
    background: {
      default: "#E8D8C4", // Base beige
      paper: "#F5EFE6",
    },
    text: {
      primary: "#2F2F2F",
      secondary: "#5C4033",
    },
  } as any, // 👈 allows custom palette keys like 'custom'
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
});

export default theme;
