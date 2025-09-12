'use client'

import React, { useReducer, useEffect, useState } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography, Snackbar, Alert } from '@mui/material';
import { SportsMma, Handshake } from '@mui/icons-material';
import theme from './theme';
import QueueMaestroLogo from './components/QueueMaestroLogo';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import reducer from './lib/store/Reducer';
import InitialState from './lib/store/InitialState';
import { RootState } from './lib/store/rootState';
import Dashboard from './components/dashboard/Dashboard';
import { debouncedSave, isLocalStorageAvailable } from './lib/utils/localStorage';

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

const BadmintonQueueUI: React.FC = () => {
	const [state, dispatch] = useReducer(reducer, InitialState);

	const [snackbarOpen, setSnackbarOpen] = useState(false);
	const [snackbarMessage, setSnackbarMessage] = useState('');
	const [snackbarType, setSnackbarType] = useState<'partnership' | 'opposition'>('partnership');

	const showPartnershipSnackbar = (message: string) => {
		setSnackbarMessage(message);
		setSnackbarType('partnership');
		setSnackbarOpen(true);
	};

	const showOppositionSnackbar = (message: string) => {
		setSnackbarMessage(message);
		setSnackbarType('opposition');
		setSnackbarOpen(true);
	};

	const handleCloseSnackbar = () => {
		setSnackbarOpen(false);
	};

	// Save state to localStorage whenever it changes
	useEffect(() => {
		// Only save if localStorage is available (this check helps with development)
		if (isLocalStorageAvailable()) {
			debouncedSave(state);
		}
	}, [state]);

	return (
		<ThemeProvider theme={theme}>
			<SnackbarContext.Provider value={{ showPartnershipSnackbar, showOppositionSnackbar }}>
				<CssBaseline />
				<AppContext.Provider value={{ state, dispatch }}>
					<AppBar position="static" color="primary">
						<Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
								<QueueMaestroLogo 
									variant="white" 
									size={32} 
									priority 
								/>
								<Typography 
									variant="h6" 
									color="inherit"
									sx={{ 
										fontWeight: 'bold',
										fontSize: { xs: '1.1rem', sm: '1.25rem' }
									}}
								>
									Queue Maestro
								</Typography>
							</Box>
						</Toolbar>
					</AppBar>
					<Box sx={{ 
						p: 2, 
						bgcolor: (theme) => theme.palette.background.default, 
						minHeight: '100vh',
						width: '100vw',       // 👈 makes it full viewport width
						boxSizing: 'border-box', // 👈 ensures padding doesn't exceed 100vw
					}}>
						<Dashboard />
					</Box>

					<Snackbar
						open={snackbarOpen}
						autoHideDuration={4000}
						onClose={handleCloseSnackbar}
						anchorOrigin={{ 
							vertical: 'top', 
							horizontal: 'right' 
						}}
						sx={{
						mt: 8, // Add margin top to avoid overlapping with AppBar
						}}
					>
						<Alert
							severity={snackbarType === 'partnership' ? 'info' : 'warning'}
							variant="filled"
							sx={{
								backgroundColor: snackbarType === 'partnership' ? '#1565C0' : '#D32F2F',
								color: 'white'
							}}
							onClose={handleCloseSnackbar}
							icon={snackbarType === 'partnership' ? <Handshake /> : <SportsMma />}
						>
							{snackbarMessage}
						</Alert>
					</Snackbar>
					<Analytics />
					<SpeedInsights />
				</AppContext.Provider>
			</SnackbarContext.Provider>
		</ThemeProvider>
	);
}

export default BadmintonQueueUI;