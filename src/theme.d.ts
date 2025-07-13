// src/theme.d.ts
import { PaletteOptions } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    custom: {
      overtimeBackground: string;
      overtimeText: string;
      courtBackground: string;
      courtText: string;
      queueBackground: string;
      queueText: string;
      restBackground: string;
      restText: string;
    };
  }

  interface PaletteOptions {
    custom?: {
      overtimeBackground: string;
      overtimeText: string;
      courtBackground: string;
      courtText: string;
      queueBackground: string;
      queueText: string;
      restBackground: string;
      restText: string;
    };
  }
}
