import React, { useReducer, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography } from '@mui/material';
import theme from './theme';

import reducer from './app/Reducer';
import InitialState from './app/InitialState';
import { RootState } from './app/rootState';
import Dashboard from './components/dashboard/Dashboard';
import { debouncedSave, isLocalStorageAvailable } from './utils/localStorage';

export const AppContext = React.createContext<{
	state: RootState;
	dispatch: React.Dispatch<any>;
}>({
	state: InitialState,
	dispatch: () => {},
});

const BadmintonQueueUI: React.FC = () => {
	const [state, dispatch] = useReducer(reducer, InitialState);

	// Save state to localStorage whenever it changes
	useEffect(() => {
		// Only save if localStorage is available (this check helps with development)
		if (isLocalStorageAvailable()) {
			debouncedSave(state);
		}
	}, [state]);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<AppContext.Provider value={{ state, dispatch }}>
				<AppBar position="static" color="primary">
					<Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
						<Typography variant="h6" color="inherit">🏸 Badminton Queue</Typography>
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
			</AppContext.Provider>
		</ThemeProvider>
	);
}

export default BadmintonQueueUI;