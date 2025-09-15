// theme.ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1e293b", // Midnight navy header
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#3b82f6", // Vibrant blue accent for buttons
      contrastText: "#ffffff",
    },
    background: {
      default: "#fefefe", // Pearl white background
      paper: "#f1f5f9", // Soft gray for cards/modals
    },
    text: {
      primary: "#0f172a", // Deep navy text
      secondary: "#475569", // Medium gray text
    },
  } as any, // 👈 allows custom palette keys like 'custom'
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 600,
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
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          boxShadow: "0 4px 20px rgba(30, 41, 59, 0.15)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow:
            "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
        },
      },
    },
  },
});

export default theme;
