import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SwapCallsIcon from '@mui/icons-material/SwapCalls';
import InfoIcon from '@mui/icons-material/Info';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface DragTutorialProps {
  open: boolean;
  onClose: () => void;
}

const DragTutorial: React.FC<DragTutorialProps> = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Fix: Check for window object and set mobile state safely
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth <= 768);
      
      // Optional: Add resize listener
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 768);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const steps = [
    {
      title: isMobile ? "Hold to Drag Players" : "Drag & Drop Players",
      description: isMobile 
        ? "Press and hold any player card for 0.5 seconds to start dragging"
        : "Click and drag any player card to move them between courts and queues",
      icon: <TouchAppIcon sx={{ fontSize: 48, color: 'white' }} />,
      visual: <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TouchAppIcon sx={{ fontSize: 20 }} />
        <Typography>Hold player card</Typography>
      </Box>,
      bgColor: '#B5CDA3'
    },
    {
      title: "Drop in Courts & Queues",
      description: "Drop players into specific court positions or queue slots to organize matches",
      icon: <SwapHorizIcon sx={{ fontSize: 48, color: 'white' }} />,
      visual: <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SwapHorizIcon sx={{ fontSize: 20 }} />
        <Typography>Drop in court positions</Typography>
      </Box>,
      bgColor: '#E5D78A'
    },
    {
      title: "Swap Players",
      description: "Drop one player onto another player card to swap their positions instantly",
      icon: <SwapCallsIcon sx={{ fontSize: 48, color: 'white' }} />,
      visual: <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SwapCallsIcon sx={{ fontSize: 20 }} />
        <Typography>Drop on other players to swap</Typography>
      </Box>,
      bgColor: '#2E3B4E'
    }
  ];

  // Auto-advance with pause when user interacts
  useEffect(() => {
    if (open && autoAdvance && step < steps.length - 1) {
      const timer = setTimeout(() => {
        setStep(prev => prev + 1);
      }, 4000); // Slower auto-advance
      return () => clearTimeout(timer);
    }
  }, [open, step, steps.length, autoAdvance]);

  const handleClose = () => {
    setStep(0);
    setAutoAdvance(true);
    onClose();
    // Safe localStorage access
    if (typeof window !== 'undefined') {
      localStorage.setItem('dragTutorialSeen', 'true');
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setStep(stepIndex);
    setAutoAdvance(false); // Stop auto-advance when user manually navigates
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
      setAutoAdvance(false);
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      setAutoAdvance(false);
    }
  };

  if (!open) return null;

  const currentStep = steps[step];

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
      onClick={handleClose}
    >
      <Paper
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: 'relative',
          maxWidth: 450,
          width: '100%',
          borderRadius: 3,
          textAlign: 'center',
          backgroundColor: '#2E3B4E', // Navy blue theme from your app
          color: 'white',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Header with close button */}
        <Box sx={{ 
          position: 'relative',
          p: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <IconButton
            onClick={handleClose}
            sx={{ 
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold',
            color: 'white',
            pr: 4 // Make room for close button
          }}>
            Quick Tutorial
          </Typography>
        </Box>

        {/* Content area with themed background */}
        <Box sx={{
          backgroundColor: currentStep.bgColor,
          color: currentStep.bgColor === '#2E3B4E' ? 'white' : '#2E3B4E',
          p: 3,
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <Box sx={{ mb: 2 }}>
            {currentStep.icon}
          </Box>

          <Typography variant="h5" sx={{ 
            fontWeight: 'bold', 
            mb: 2,
            color: currentStep.bgColor === '#2E3B4E' ? 'white' : '#2E3B4E'
          }}>
            {currentStep.title}
          </Typography>

          <Typography variant="body1" sx={{ 
            mb: 3, 
            color: currentStep.bgColor === '#2E3B4E' ? 'rgba(255,255,255,0.9)' : '#2E3B4E',
            opacity: 0.8,
            lineHeight: 1.4
          }}>
            {currentStep.description}
          </Typography>

          <Box
            sx={{
              display: 'inline-block',
              px: 3,
              py: 1,
              backgroundColor: currentStep.bgColor === '#2E3B4E' 
                ? 'rgba(255, 255, 255, 0.15)' 
                : 'rgba(46, 59, 78, 0.15)',
              borderRadius: 2,
              fontWeight: 'bold',
              border: currentStep.bgColor === '#2E3B4E' 
                ? '2px solid rgba(255, 255, 255, 0.2)' 
                : '2px solid rgba(46, 59, 78, 0.2)',
              color: currentStep.bgColor === '#2E3B4E' ? 'white' : '#2E3B4E'
            }}
          >
            {currentStep.visual}
          </Box>
        </Box>

        {/* Navigation footer */}
        <Box sx={{ 
          backgroundColor: '#2E3B4E', // Navy blue theme
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Previous button */}
          <IconButton
            onClick={handlePrevious}
            disabled={step === 0}
            sx={{
              color: step === 0 ? 'rgba(255, 255, 255, 0.3)' : 'white',
              '&:hover': {
                backgroundColor: step === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          {/* Clickable step indicators */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {steps.map((_, index) => (
              <Box
                key={index}
                onClick={() => handleStepClick(index)}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: index === step ? 'white' : 'rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: index === step ? '2px solid rgba(255, 255, 255, 0.5)' : 'none',
                  '&:hover': {
                    backgroundColor: index === step ? 'white' : 'rgba(255, 255, 255, 0.6)',
                    transform: 'scale(1.2)'
                  }
                }}
              />
            ))}
          </Box>

          {/* Next button */}
          <IconButton
            onClick={handleNext}
            disabled={step === steps.length - 1}
            sx={{
              color: step === steps.length - 1 ? 'rgba(255, 255, 255, 0.3)' : 'white',
              '&:hover': {
                backgroundColor: step === steps.length - 1 ? 'transparent' : 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>

        {/* Footer instruction */}
        <Box sx={{ 
          backgroundColor: '#2E3B4E', // Navy blue theme
          pb: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Typography variant="caption" sx={{ 
            opacity: 0.7,
            fontSize: '0.75rem'
          }}>
            {autoAdvance ? 'Auto-advancing • ' : ''}Click dots to navigate • Tap outside to close
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default DragTutorial;