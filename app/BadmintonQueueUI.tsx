'use client'

import React, { useReducer, useEffect, useState } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography } from '@mui/material';
import { SportsMma, Handshake, Close } from '@mui/icons-material';
import { SnackbarProvider, useSnackbar, VariantType, closeSnackbar  } from 'notistack';
import { IconButton, Tooltip } from '@mui/material';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import theme from './theme';
import QueueMaestroLogo from './components/QueueMaestroLogo';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import reducer from './lib/store/Reducer';
import InitialState from './lib/store/InitialState';
import { RootState } from './lib/store/rootState';
import { Player } from './components/types/Player';
import Dashboard from './components/dashboard/Dashboard';
import MobileFooter from './components/MobileFooter';
import { debouncedSave, isLocalStorageAvailable } from './lib/utils/localStorage';
import DragTutorial from './components/DragTutorial';
import FeedbackModal from './components/FeedbackModal';
import AnnouncementDialog from './components/AnnouncementDialog';

export const AppContext = React.createContext<{
	state: RootState;
	dispatch: React.Dispatch<any>;
}>({
	state: InitialState,
	dispatch: () => {},
});

export const SnackbarContext = React.createContext<{
  showPartnershipSnackbar: (message: string) => void;
  showOppositionSnackbar: (message: string) => void;
}>({
  showPartnershipSnackbar: () => {},
  showOppositionSnackbar: () => {},
});

// Inner component that uses the snackbar hook
const AppContent: React.FC = () => {
	const [state, dispatch] = useReducer(reducer, InitialState);
	const { enqueueSnackbar } = useSnackbar();
	const [showDragTutorial, setShowDragTutorial] = useState(false);
	const [showFeedback, setShowFeedback] = useState(false);
	const [showAnnouncement, setShowAnnouncement] = useState(false);

	const showPartnershipSnackbar = (message: string) => {
		enqueueSnackbar(message, {
			variant: 'info' as VariantType,
			autoHideDuration: 5000,
			anchorOrigin: { 
				vertical: 'top', 
				horizontal: 'right' 
			},
			style: {
				backgroundColor: '#1976d2',
				color: 'white',
				minWidth: '320px',
				borderRadius: '8px',
				boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
				padding: '12px 16px',
				display: 'flex',
				alignItems: 'center',
				gap: '12px'
			},
			// Custom icon for partnership
			action: (snackbarId) => (
				<>
					<Handshake sx={{ mr: 1, color: 'white' }} />
					<IconButton 
						onClick={() => closeSnackbar(snackbarId)}
						size="small"
						sx={{ 
							color: 'white',
							padding: '4px',
							'&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
						}}
					>
						<Close sx={{ fontSize: '18px' }} />
					</IconButton>
				</>
				
			),
		});
	};

	const showOppositionSnackbar = (message: string) => {
		enqueueSnackbar(message, {
			variant: 'warning' as VariantType,
			autoHideDuration: 5000,
			anchorOrigin: { 
				vertical: 'top', 
				horizontal: 'right' 
			},
			style: {
				backgroundColor: '#D32F2F',
				color: 'white',
			},
			// Custom icon for opposition
			action: (snackbarId) => (
				<>
					<SportsMma sx={{ mr: 1, color: 'white' }} />
					<button 
						onClick={() => closeSnackbar(snackbarId)}
						style={{
							background: 'none',
							border: 'none',
							color: 'white',
							cursor: 'pointer',
							padding: '4px',
							marginLeft: '8px'
						}}
					>
						<Close sx={{ fontSize: '20px' }} />
					</button>
				</>
			),
		});
	};

	// Save state to localStorage whenever it changes
	useEffect(() => {
		// Only save if localStorage is available (this check helps with development)
		if (isLocalStorageAvailable()) {
			debouncedSave(state);
		}
	}, [state]);

	// Tutorial detection - show to first-time users
	useEffect(() => {
		const hasSeenTutorial = localStorage.getItem('dragTutorialSeen');
		const hasPlayers = state.players.length >= 2;
		
		// Use type assertion to fix the TypeScript errors
		const courtValues = Object.values(state.courts.playersByCourt || {}) as Player[][];
		const queueValues = Object.values(state.queue.playersByQueue || {}) as Player[][];
		
		const hasPlayersOnCourts = courtValues.some(court => court.length > 0);
		const hasPlayersInQueues = queueValues.some(queue => queue.length > 0);
		
		if (!hasSeenTutorial && hasPlayers && !hasPlayersOnCourts && !hasPlayersInQueues) {
			const timer = setTimeout(() => {
			setShowDragTutorial(true);
			}, 2000);
			
			return () => clearTimeout(timer);
		}
	}, [state.players.length, state.courts.playersByCourt, state.queue.playersByQueue]);

	const handleTutorialClose = () => {
		setShowDragTutorial(false);
		localStorage.setItem('dragTutorialSeen', 'true');
	};

	// Temporary announcement: show once, never during a live session or the tutorial
	const hasSessionActivity =
		(Object.values(state.courts.playersByCourt || {}) as Player[][]).some(c => c.length > 0) ||
		(Object.values(state.queue.playersByQueue || {}) as Player[][]).some(q => q.length > 0);

	useEffect(() => {
		let seen = false;
		try {
			seen = localStorage.getItem('announcement2026Seen') === 'true';
		} catch {
			return;
		}
		if (seen || hasSessionActivity || showDragTutorial) return;

		const timer = setTimeout(() => setShowAnnouncement(true), 3000);
		return () => clearTimeout(timer);
	}, [hasSessionActivity, showDragTutorial]);

	const handleAnnouncementClose = () => {
		setShowAnnouncement(false);
		try {
			localStorage.setItem('announcement2026Seen', 'true');
		} catch {
			// storage unavailable: the message may show again next visit
		}
	};

	const handleAnnouncementFeedback = () => {
		handleAnnouncementClose();
		setShowFeedback(true);
	};

	return (
		<SnackbarContext.Provider value={{ showPartnershipSnackbar, showOppositionSnackbar }}>
			<CssBaseline />
			<AppContext.Provider value={{ state, dispatch }}>
				<AppBar position="static" color="primary">
					<Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
							<QueueMaestroLogo 
								variant="svg" 
								size={32} 
								priority 
								context="header"
							/>
							<Typography 
								variant="h6" 
								color="inherit"
								sx={{ 
									fontFamily: 'var(--font-inter)',
									fontWeight: 600,
									fontSize: { xs: '1.1rem', sm: '1.3rem' },
									letterSpacing: '-0.025em',
									lineHeight: 1.2,
								}}
							>
								Queue Maestro
							</Typography>
						</Box>
						<Tooltip title="What's new: share your feedback">
							<IconButton
								color="inherit"
								aria-label="What's new"
								onClick={() => setShowAnnouncement(true)}
								sx={{
									'@keyframes newsPulse': {
										'0%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.6)' },
										'70%': { boxShadow: '0 0 0 10px rgba(255, 255, 255, 0)' },
										'100%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)' },
									},
									animation: 'newsPulse 2s infinite',
								}}
							>
								<NewspaperIcon />
							</IconButton>
						</Tooltip>
					</Toolbar>
				</AppBar>
				<Box sx={{ 
					p: 2, 
					bgcolor: (theme) => theme.palette.background.default, 
					minHeight: '100vh',
					width: '100vw',       // 👈 makes it full viewport width
					boxSizing: 'border-box', // 👈 ensures padding doesn't exceed 100vw
				}}>
					<Dashboard
						onShowTutorial={() => setShowDragTutorial(true)}
						onOpenFeedback={() => setShowFeedback(true)}
					/>
					<MobileFooter />
				</Box>
				<Analytics />
				<SpeedInsights />
				<DragTutorial 
					open={showDragTutorial} 
					onClose={handleTutorialClose}
				/>
				<FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />
				<AnnouncementDialog
					open={showAnnouncement}
					onClose={handleAnnouncementClose}
					onGiveFeedback={handleAnnouncementFeedback}
				/>
			</AppContext.Provider>
		</SnackbarContext.Provider>
	);
};

const BadmintonQueueUI: React.FC = () => {
	return (
		<ThemeProvider theme={theme}>
			<SnackbarProvider 
				maxSnack={5}  // Allow up to 5 snackbars simultaneously
				dense={false}
				preventDuplicate={true}  // Prevent duplicate messages
				anchorOrigin={{
					vertical: 'top',
					horizontal: 'right',
				}}
			>
				<AppContent />
			</SnackbarProvider>
		</ThemeProvider>
	);
}

export default BadmintonQueueUI;