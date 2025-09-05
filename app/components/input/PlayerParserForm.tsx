import React, { useState, useContext, useEffect } from 'react';
import { Modal, Box, Button, Stack, TextField, Typography, Chip } from '@mui/material';
import { AppContext } from '../../BadmintonQueueUI'; // 👈 your own context
import { Action } from '../../lib/store/Action';
import { parsePlayerList } from '../../lib/utils/parsePlayerList';

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
					padding: { xs: 2, sm: 3 }, // Reduced padding on mobile
					borderRadius: 2,
					width: { xs: '95%', sm: '90%' }, // More width on mobile
					maxWidth: { xs: 350, sm: 400 }, // Smaller max width on mobile
					maxHeight: { xs: '85vh', sm: '70vh' }, // More height on mobile
          			overflowY: 'auto',
					mx: 'auto',
					my: { xs: '5vh', sm: '15vh' }, // Less top margin on mobile
					boxShadow: 24,
					fontSize: '0.8rem',
				}}
			>
				<Stack spacing={{ xs: 1.5, sm: 2 }}> {/* Reduced spacing on mobile */}
					<Typography 
						variant="subtitle1" 
						sx={{ 
							fontSize: { xs: '0.85rem', sm: '0.9rem' },
							fontWeight: 'bold',
							textAlign: 'center',
						}}
					>
						Add Players
					</Typography>

					{/* Quick Add Single Player Section */}
					<Box>
						<Typography 
							variant="body2" 
							sx={{ 
								fontSize: { xs: '0.75rem', sm: '0.8rem' }, 
								fontWeight: 'medium',
								mb: 1,
								color: 'text.secondary'
							}}
						>
							Quick Add Single Player
						</Typography>
						<Stack direction="row" spacing={1}>
							<TextField
								label="Player Name"
								placeholder="e.g. Carl"
								value={singlePlayer}
								onChange={(e) => setSinglePlayer(e.target.value)}
								variant="outlined"
								fullWidth
								size="small"
								slotProps={{
									input: { sx: { fontSize: { xs: '0.75rem', sm: '0.8rem' } } },
									inputLabel: { sx: { fontSize: { xs: '0.7rem', sm: '0.75rem' } } },
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
								sx={{ 
									fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
									whiteSpace: 'nowrap',
									minWidth: { xs: '50px', sm: 'auto' }
								}}
							>
								Add
							</Button>
						</Stack>
					</Box>

					{/* Add Multiple Players Section */}
					<Box>
						<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
							<Typography 
								variant="body2" 
								sx={{ 
									fontSize: { xs: '0.75rem', sm: '0.8rem' }, 
									fontWeight: 'medium',
									color: 'text.secondary'
								}}
							>
								Add Multiple Players
							</Typography>
							<Chip 
								label="💡 Paste list here" 
								size="small"
								color="primary"
								variant="outlined"
								sx={{ 
									fontSize: { xs: '0.65rem', sm: '0.7rem' },
									height: { xs: '20px', sm: '24px' },
									'& .MuiChip-label': { px: { xs: 0.5, sm: 1 } }
								}}
							/>
						</Stack>
						
						<Typography 
							variant="caption" 
							sx={{ 
								fontSize: { xs: '0.65rem', sm: '0.7rem' }, 
								color: 'text.secondary',
								display: 'block',
								mb: 1,
								fontStyle: 'italic'
							}}
						>
							💡 Pro Tip: Paste a list of names (one per line) to create multiple player cards instantly!
						</Typography>

						<TextField
							label="📋 Paste Player Names List Here"
							placeholder={`Copy and paste player names here:

John
Sarah
Mike
Anna

...or type them one per line`}
							multiline
							minRows={3}
							maxRows={6} // Limit rows on mobile
							value={inputText}
							onChange={(e) => setInputText(e.target.value)}
							variant="outlined"
							fullWidth
							slotProps={{
								input: {
									sx: { 
										fontSize: { xs: '0.75rem', sm: '0.8rem' },
										lineHeight: 1.3
									},
								},
								inputLabel: {
									sx: { 
										fontSize: { xs: '0.7rem', sm: '0.75rem' },
										fontWeight: 'bold',
										color: 'primary.main'
									},
								},
							}}
							sx={{
								'& .MuiOutlinedInput-root': {
									'&:hover .MuiOutlinedInput-notchedOutline': {
										borderColor: 'primary.main',
									},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: 'primary.main',
										borderWidth: '2px',
									},
								}
							}}
						/>

						{/* Show preview of how many players will be added */}
						{inputText.trim() && (
							<Typography 
								variant="caption" 
								sx={{ 
									fontSize: { xs: '0.65rem', sm: '0.7rem' }, 
									color: 'success.main',
									display: 'block',
									mt: 0.5,
									fontWeight: 'medium'
								}}
							>
								✓ Will add {parsePlayerList(inputText).length} player(s)
							</Typography>
						)}
					</Box>

					{/* Action Buttons */}
					<Stack 
						direction="row" 
						justifyContent="flex-end" 
						spacing={1}
						sx={{ pt: { xs: 0.5, sm: 1 } }}
					>
						<Button 
							onClick={onClose} 
							variant="text" 
							size="small" 
							sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
						>
							Cancel
						</Button>
						<Button
							variant="contained"
							color="primary"
							onClick={handleParse}
							disabled={inputText.trim() === ''}
							size="small"
              				sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
						>
							Add Players
						</Button>
					</Stack>
				</Stack>
			</Box>
		</Modal>
	);
};

export default PlayerParserForm;