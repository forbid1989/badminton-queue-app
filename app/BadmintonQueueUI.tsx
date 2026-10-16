'use client'

import React, { useReducer, useEffect, useState, useCallback, useRef } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography } from '@mui/material';
import { SportsMma, Handshake, Close } from '@mui/icons-material';
import { SnackbarProvider, useSnackbar, VariantType, closeSnackbar  } from 'notistack';
import { IconButton, Button } from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
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
import FeedbackPromptCard from './components/FeedbackPromptCard';
import {
	FEEDBACK_CAMPAIGN_ACTIVE,
	MIN_GAMES_BEFORE_PROMPT,
	readPromptState,
	recordPromptDismissed,
	recordPromptOpened,
	recordPromptTimedOut,
	shouldShowFeedbackPrompt,
} from './lib/feedbackPrompt';
import { ActionType } from './lib/store/Action';
import { trackAppOpen, trackGameCompleted, startUsageSync } from './lib/usageTracking';

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
	const [state, rawDispatch] = useReducer(reducer, InitialState);
	const { enqueueSnackbar } = useSnackbar();
	const [gamesEndedThisSession, setGamesEndedThisSession] = useState(0);

	// Anonymous usage tracking: observes actions and never changes them or the game state
	const stateRef = useRef(state);
	stateRef.current = state;

	const dispatch = useCallback((action: any) => {
		const current = stateRef.current;

		// The reducer returns the same state object when the game can't end (invalid or
		// empty court, fewer than 2 players), so only count a game when the state changes.
		let gameEnded = false;
		if (action?.type === ActionType.END_GAME) {
			try {
				gameEnded = reducer(current, action) !== current;
			} catch {
				gameEnded = false;
			}
		}

		rawDispatch(action);

		if (gameEnded) {
			trackGameCompleted({
				players: current.players.length,
				courts: Object.keys(current.courts.playersByCourt || {}).length,
				queues: Object.keys(current.queue.playersByQueue || {}).length,
			});
			// Capped at the prompt threshold so later games don't trigger extra state updates
			setGamesEndedThisSession((n) => Math.min(n + 1, MIN_GAMES_BEFORE_PROMPT));
		}
	}, []);

	useEffect(() => {
		trackAppOpen();
		return startUsageSync();
	}, []);

	const [showDragTutorial, setShowDragTutorial] = useState(false);
	const [showFeedback, setShowFeedback] = useState(false);
	const [showAnnouncement, setShowAnnouncement] = useState(false);
	const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
	const promptShownThisSession = useRef(false);

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
		if (seen || hasSessionActivity || showDragTutorial || showFeedbackPrompt) return;

		const timer = setTimeout(() => setShowAnnouncement(true), 3000);
		return () => clearTimeout(timer);
	}, [hasSessionActivity, showDragTutorial, showFeedbackPrompt]);

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

	// Gentle feedback prompt for engaged users: after a couple of completed games, never while
	// a dialog is open, and at most once per page load (see lib/feedbackPrompt for the rules)
	useEffect(() => {
		if (showFeedback || showAnnouncement || showDragTutorial || showFeedbackPrompt) return;
		if (
			!shouldShowFeedbackPrompt({
				campaignActive: FEEDBACK_CAMPAIGN_ACTIVE,
				state: readPromptState(),
				gamesEndedThisSession,
				shownThisSession: promptShownThisSession.current,
				now: Date.now(),
			})
		) {
			return;
		}

		const timer = setTimeout(() => {
			promptShownThisSession.current = true;
			setShowFeedbackPrompt(true);
		}, 1500);
		return () => clearTimeout(timer);
	}, [gamesEndedThisSession, showFeedback, showAnnouncement, showDragTutorial, showFeedbackPrompt]);

	const handlePromptLater = useCallback(() => {
		recordPromptDismissed();
		setShowFeedbackPrompt(false);
	}, []);

	const handlePromptTimeout = useCallback(() => {
		recordPromptTimedOut();
		setShowFeedbackPrompt(false);
	}, []);

	const handlePromptShare = useCallback(() => {
		// Opening the form counts as engagement even if they cancel, so don't re-prompt right away
		recordPromptOpened();
		setShowFeedbackPrompt(false);
		setShowFeedback(true);
	}, []);

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
						{FEEDBACK_CAMPAIGN_ACTIVE && (
							<Button
								color="inherit"
								variant="outlined"
								size="small"
								aria-label="Share feedback"
								onClick={() => setShowFeedback(true)}
								startIcon={<RateReviewIcon />}
								sx={{
									textTransform: 'none',
									fontWeight: 600,
									borderColor: 'rgba(255, 255, 255, 0.5)',
									minWidth: 0,
									// icon-only on very narrow screens so the title never overflows
									'& .MuiButton-startIcon': { mr: 0, ml: 0 },
									'& .feedback-label': {
										display: 'none',
										ml: 1,
										'@media (min-width:360px)': { display: 'inline' },
									},
									'@keyframes feedbackPulse': {
										'0%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.6)' },
										'70%': { boxShadow: '0 0 0 10px rgba(255, 255, 255, 0)' },
										'100%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)' },
									},
									animation: 'feedbackPulse 2s infinite',
									'@media (prefers-reduced-motion: reduce)': { animation: 'none' },
								}}
							>
								<span className="feedback-label">Feedback</span>
							</Button>
						)}
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
					<MobileFooter onOpenFeedback={() => setShowFeedback(true)} />
				</Box>
				<Analytics />
				<SpeedInsights />
				<DragTutorial 
					open={showDragTutorial} 
					onClose={handleTutorialClose}
				/>
				<FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />
				<FeedbackPromptCard
					open={showFeedbackPrompt}
					onShare={handlePromptShare}
					onLater={handlePromptLater}
					onTimeout={handlePromptTimeout}
				/>
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