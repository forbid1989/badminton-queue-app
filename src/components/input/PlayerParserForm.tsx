import React, { useState, useContext, useEffect } from 'react';
import { Modal, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { AppContext } from '../../BadmintonQueueUI'; // 👈 your own context
import { Action } from '../../app/Action';
import { parsePlayerList } from '../../utils/parsePlayerList';

type PlayerParserModalProps = {
  open: boolean;
  onClose: () => void;
};

const PlayerParserForm: React.FC<PlayerParserModalProps> = ({ open, onClose }) => {
	const { dispatch } = useContext(AppContext); // ✅ use your own context
	const [inputText, setInputText] = useState('');
	const [singlePlayer, setSinglePlayer] = useState('');

	useEffect(() => {
		if (!open) setInputText(''); // Clear on close
	}, [open]);

	const handleParse = () => {
		const parsedPlayers = parsePlayerList(inputText);
		dispatch(Action.addPlayersFromText(parsedPlayers));
		setInputText('');
    	onClose();
	};

	return (
		<Modal open={open} onClose={onClose}>
			<Box 
				sx={{
					backgroundColor: 'background.paper',
					padding: 3,
					borderRadius: 2,
					width: '90%',
					maxWidth: 400,
					maxHeight: '70vh',
          			overflowY: 'auto',
					mx: 'auto',
					my: '20vh',
					boxShadow: 24,
					fontSize: '0.8rem',
				}}
			>
				<Stack spacing={2}>
					<Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>Paste Player List</Typography>

					<Stack direction="row" spacing={1}>
						<TextField
							label="Single Player Name"
							placeholder="e.g. Carl"
							value={singlePlayer}
							onChange={(e) => setSinglePlayer(e.target.value)}
							variant="outlined"
							fullWidth
							slotProps={{
							input: { sx: { fontSize: '0.8rem' } },
							inputLabel: { sx: { fontSize: '0.75rem' } },
							}}
						/>
						<Button
							variant="contained"
							onClick={() => {
							if (singlePlayer.trim() !== '') {
								dispatch(Action.addPlayersFromText(parsePlayerList(singlePlayer.trim())));
								setSinglePlayer('');
								onClose();
							}
							}}
							disabled={singlePlayer.trim() === ''}
							size="small"
							sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
						>
							Add
						</Button>
					</Stack>

					<TextField
						label="Player Names"
						placeholder={`e.g.\nCarl\nRed\nGenebe`}
						multiline
						minRows={4}
						value={inputText}
						onChange={(e) => setInputText(e.target.value)}
						variant="outlined"
						fullWidth
						slotProps={{
							input: {
							sx: { fontSize: '0.8rem' },
							},
							inputLabel: {
							sx: { fontSize: '0.75rem' },
							},
						}}
					/>

					<Stack direction="row" justifyContent="flex-end" spacing={1}>
						<Button onClick={onClose} variant="text" size="small" sx={{ fontSize: '0.75rem' }}>
							Cancel
						</Button>
						<Button
							variant="contained"
							color="primary"
							onClick={handleParse}
							disabled={inputText.trim() === ''}
							size="small"
              				sx={{ fontSize: '0.75rem' }}
						>
							Parse and Add Players
						</Button>
					</Stack>
				</Stack>
			</Box>
		</Modal>
	);
};

export default PlayerParserForm;
