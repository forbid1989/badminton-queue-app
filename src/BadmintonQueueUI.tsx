import React, { useReducer, useEffect, useCallback } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography } from '@mui/material';
import { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import theme from './theme';

import reducer from './app/Reducer';
import InitialState from './app/InitialState';
import { RootState } from './app/rootState';
import Dashboard from './components/dashboard/Dashboard';
import { debouncedSave, isLocalStorageAvailable } from './utils/localStorage';
import { DndProvider, getDragData } from './components/DndProvider';
import { Action } from './app/Action';

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

	// Handle drag end event from DND-Kit
	const handleDragEnd = useCallback((event: DragEndEvent) => {
		const { activeData, overData, activeId, overId } = getDragData(event);

		if (!overData || !overId) return;

		// Handle player-to-player swap
		if (activeData.type === 'player' && overData.type === 'player') {
			const activeZone = activeData.zone;
			const overZone = overData.zone;

			// Only swap if in the same zone
			if (activeZone === overZone && activeZone && (activeZone.startsWith('court-') || activeZone.startsWith('queue-'))) {
				dispatch(Action.swapPlayers(activeId, overId, activeZone));
			}
			return;
		}

		// Handle player-to-zone move
		if (activeData.type === 'player' && overData.type === 'zone') {
			const from = activeData.zone || 'all';
			const to = overData.zone || 'all';

			// Don't move if dropping in the same zone
			if (from === to) return;

			// Don't move if target zone is full (except for 'all' and 'rest')
			if (overData.isFull === true && to !== 'all' && to !== 'rest') return;

			dispatch(Action.movePlayer(activeId, from, to));
		}
	}, [dispatch]);

	// Optional: Handle drag over for visual feedback
	const handleDragOver = useCallback((event: DragOverEvent) => {
		// You can add logic here for visual feedback during drag
		// For example, highlighting valid drop targets
	}, []);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<AppContext.Provider value={{ state, dispatch }}>
				<DndProvider
					onDragEnd={handleDragEnd}
					onDragOver={handleDragOver}
					players={state.players}
				>
					<AppBar position="static" color="primary">
						<Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
							<Typography variant="h6" color="inherit">🏸 Badminton Queue</Typography>
						</Toolbar>
					</AppBar>
					<Box sx={{ 
						p: 2, 
						bgcolor: (theme) => theme.palette.background.default, 
						minHeight: '100vh',
						width: '100vw',
						boxSizing: 'border-box',
					}}>
						<Dashboard />
					</Box>
				</DndProvider>
			</AppContext.Provider>
		</ThemeProvider>
	);
}

export default BadmintonQueueUI;