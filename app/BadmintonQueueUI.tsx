'use client'

import React, { useReducer, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography } from '@mui/material';
import theme from './theme';
import QueueMaestroLogo from './components/QueueMaestroLogo';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import reducer from './lib/store/Reducer';
import InitialState from './lib/store/InitialState';
import { RootState } from './lib/store/rootState';
import Dashboard from './components/dashboard/Dashboard';
import { debouncedSave, isLocalStorageAvailable } from './lib/utils/localStorage';
import { Player } from './components/types/Player';

import PartnershipWarningSnackbar from './components/PartnershipWarningSnackbar';
import {usePartnershipWarnings} from './lib/hooks/usePartnershipWarnings'

export const AppContext = React.createContext<{
	state: RootState;
	dispatch: React.Dispatch<any>;
}>({
	state: InitialState,
	dispatch: () => {},
});

const BadmintonQueueUI: React.FC = () => {
	const [state, dispatch] = useReducer(reducer, InitialState);

	const {
		warnings,
		dismissWarning,
		dismissAllWarnings,
		clearWarnings,
	} = usePartnershipWarnings({
		maxPartnershipCount: 2,
		maxOpponentCount: 2,
		enableWarnings: true,
	});

	// Save state to localStorage whenever it changes
	useEffect(() => {
		// Only save if localStorage is available (this check helps with development)
		if (isLocalStorageAvailable()) {
			debouncedSave(state);
		}
	}, [state]);

	useEffect(() => {
		const courtValues = Object.values(state.courts.playersByCourt) as Player[][];
		const queueValues = Object.values(state.queue.playersByQueue) as Player[][];
		
		const allCourtsEmpty = courtValues.every(players => players.length === 0);
		const allQueuesEmpty = queueValues.every(players => players.length === 0);
		
		if (allCourtsEmpty && allQueuesEmpty && warnings.length > 0) {
			clearWarnings();
		}
	}, [state.courts.playersByCourt, state.queue.playersByQueue, warnings.length, clearWarnings]);

	return (
		<ThemeProvider theme={theme}>
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

				<PartnershipWarningSnackbar
					warnings={warnings}
					onDismiss={dismissWarning}
					onDismissAll={dismissAllWarnings}
				/>
				<Analytics />
				<SpeedInsights />
			</AppContext.Provider>
		</ThemeProvider>
	);
}

export default BadmintonQueueUI;