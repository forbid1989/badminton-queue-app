'use client'

import React from 'react';
import { RootState } from './store/rootState';
import InitialState from './store/InitialState';

export const AppContext = React.createContext<{
	state: RootState;
	dispatch: React.Dispatch<any>;
}>({
	state: InitialState,
	dispatch: () => {},
});