// app/components/QueueMaestroLogo.tsx
'use client'

import Image from 'next/image'
import { Box, useTheme } from '@mui/material'
import { useMemo } from 'react'

interface QueueMaestroLogoProps {
  variant?: 'brown' | 'white' | 'auto'
  context?: 'header' | 'main' | 'modal' | 'loading' | 'error'
  size?: number
  width?: number
  height?: number
  priority?: boolean
  className?: string
}

const QueueMaestroLogo: React.FC<QueueMaestroLogoProps> = ({
  variant = 'auto',
  context = 'main',
  size,
  width = size || 40,
  height = size || 40,
  priority = false,
  className = ''
}) => {
  const theme = useTheme()

  // Smart logo variant selection - brown vs white based on context
  const logoVariant = useMemo(() => {
    if (variant !== 'auto') return variant
    
    // Context-based selection for optimal visibility
    switch (context) {
      case 'header':
        return 'white' // White against brown AppBar
      case 'modal':
      case 'loading':
      case 'error':
      case 'main':
      default:
        return 'brown' // Brown against beige/white backgrounds
    }
  }, [variant, context])

  // Select appropriate logo size based on requested dimensions - matches your actual file structure
  const logoSrc = useMemo(() => {
    const maxDimension = Math.max(width, height)
    
    if (maxDimension <= 16) {
      return `/logos/${logoVariant}_logo/favicon-16x16.png`
    } else if (maxDimension <= 32) {
      return `/logos/${logoVariant}_logo/favicon-32x32.png`
    } else if (maxDimension <= 192) {
      return `/logos/${logoVariant}_logo/android-chrome-192x192.png`
    } else {
      return `/logos/${logoVariant}_logo/android-chrome-512x512.png`
    }
  }, [logoVariant, width, height])

  const logoAlt = 'Queue Maestro Logo'

  return (
    <Box 
      className={className}
      sx={{ 
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative'
      }}
    >
      <Image
        src={logoSrc}
        alt={logoAlt}
        width={width}
        height={height}
        priority={priority}
        sizes={`${Math.max(width, height)}px`}
        style={{
          maxWidth: '100%',
          height: 'auto',
          objectFit: 'contain'
        }}
        quality={90}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      />
    </Box>
  )
}

export default QueueMaestroLogo

// Convenience components with predefined contexts
export const HeaderLogo = (props: Omit<QueueMaestroLogoProps, 'context' | 'priority'>) => (
  <QueueMaestroLogo {...props} context="header" priority />
)

export const ModalLogo = (props: Omit<QueueMaestroLogoProps, 'context'>) => (
  <QueueMaestroLogo {...props} context="modal" />
)

export const LoadingLogo = (props: Omit<QueueMaestroLogoProps, 'context' | 'priority'>) => (
  <QueueMaestroLogo {...props} context="loading" priority />
)