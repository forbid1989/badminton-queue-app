import { useTheme, useMediaQuery } from "@mui/material";
import { useMemo } from "react";

export const useResponsive = () => {
  const theme = useTheme();

  const isXs = useMediaQuery(theme.breakpoints.only("xs"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));
  const isMd = useMediaQuery(theme.breakpoints.only("md"));
  const isLg = useMediaQuery(theme.breakpoints.up("lg"));

  const isSmallTablet = useMediaQuery(
    "(max-width: 900px) and (min-width: 600px)"
  );
  const isMediumTablet = useMediaQuery(
    "(max-width: 1200px) and (min-width: 900px)"
  );
  const isLargeTablet = useMediaQuery(
    "(max-width: 1440px) and (min-width: 1200px)"
  );

  const isMobileDevice = useMemo(() => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768
    );
  }, []);

  const getCardSpacing = () => {
    if (isXs || isSmallTablet) return { xs: 0.5, sm: 1 };
    if (isMediumTablet) return { xs: 1, sm: 1.5 };
    return { xs: 1, sm: 1.5, md: 2 };
  };

  const getGridColumns = () => {
    if (isXs) return { xs: 12, sm: 12 };
    if (isSmallTablet) return { xs: 12, sm: 6, md: 4 };
    if (isMediumTablet) return { xs: 12, sm: 6, md: 4, lg: 3 };
    return { xs: 12, sm: 6, md: 4, lg: 3 };
  };

  return {
    isXs,
    isSm,
    isMd,
    isLg,
    isSmallTablet,
    isMediumTablet,
    isLargeTablet,
    isMobileDevice,
    getCardSpacing,
    getGridColumns,
  };
};
