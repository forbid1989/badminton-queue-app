import React, { useState, useContext } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { AppContext } from '../../BadmintonQueueUI'; // 👈 your own context
import { Action } from '../../app/Action';
import { parsePlayerList } from '../../utils/parsePlayerList';

const PlayerParserForm: React.FC = () => {
	const { dispatch } = useContext(AppContext); // ✅ use your own context
	const [inputText, setInputText] = useState('');

	const handleParse = () => {
		const parsedPlayers = parsePlayerList(inputText);
		dispatch(Action.addPlayersFromText(parsedPlayers));
		setInputText(''); // Clear input after parsing
	};

	return (
		<Box sx={{ mb: 3 }}>
			<Stack spacing={2}>
				<Typography variant="h6">Paste Player List</Typography>

				<TextField
					label="Player Names"
					placeholder={`e.g.\nCarl\nKarla +1\nJohn (2)`}
					multiline
					minRows={4}
					value={inputText}
					onChange={(e) => setInputText(e.target.value)}
					variant="outlined"
					fullWidth
				/>

				<Button
					variant="contained"
					color="primary"
					onClick={handleParse}
					disabled={inputText.trim() === ''}
				>
					Parse and Add Players
				</Button>
			</Stack>
		</Box>
	);
};

export default PlayerParserForm;
