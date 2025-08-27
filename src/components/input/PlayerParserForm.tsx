import React, { useState, useContext, useEffect } from 'react';
import { 
  Modal, 
  Box, 
  Button, 
  Stack, 
  TextField, 
  Typography, 
  Divider,
  Chip,
  Alert,
  Collapse
} from '@mui/material';
import { 
  InfoOutlined as InfoIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon
} from '@mui/icons-material';
import { AppContext } from '../../BadmintonQueueUI';
import { Action } from '../../app/Action';
import { parsePlayerList } from '../../utils/parsePlayerList';

type PlayerParserModalProps = {
  open: boolean;
  onClose: () => void;
};

const PlayerParserForm: React.FC<PlayerParserModalProps> = ({ open, onClose }) => {
  const { dispatch } = useContext(AppContext);
  const [inputText, setInputText] = useState('');
  const [singlePlayer, setSinglePlayer] = useState('');
  const [showAdvancedHelp, setShowAdvancedHelp] = useState(false);

  useEffect(() => {
    if (!open) {
      setInputText('');
      setShowAdvancedHelp(false);
    }
  }, [open]);

  const handleParse = () => {
    const parsedPlayers = parsePlayerList(inputText);
    dispatch(Action.addPlayersFromText(parsedPlayers));
    setInputText('');
    onClose();
  };

  const handleSinglePlayerAdd = () => {
    if (singlePlayer.trim() !== '') {
      dispatch(Action.addPlayersFromText(parsePlayerList(singlePlayer.trim())));
      setSinglePlayer('');
      onClose();
    }
  };

  const copyExampleToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const basicExample = `John
Sarah
Mike
Anna`;

  const advancedExample = `John +3
Sarah (2)
1. Mike
2. Anna
Team Leader +4`;

  return (
    <Modal open={open} onClose={onClose}>
      <Box 
        sx={{
          backgroundColor: 'background.paper',
          padding: 3,
          borderRadius: 2,
          width: '90%',
          maxWidth: 480,
          maxHeight: '80vh',
          overflowY: 'auto',
          mx: 'auto',
          my: '10vh',
          boxShadow: 24,
          fontSize: '0.8rem',
        }}
      >
        <Stack spacing={2.5}>
          {/* Header with better title and subtitle */}
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 0.5 }}>
              Add Players
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              Add multiple players at once by copying and pasting a list
            </Typography>
          </Box>

          {/* Single Player Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', mb: 1, fontWeight: 600 }}>
              Quick Add Single Player
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Player Name"
                placeholder="e.g. Lin Dan"
                value={singlePlayer}
                onChange={(e) => setSinglePlayer(e.target.value)}
                variant="outlined"
                fullWidth
                size="small"
                slotProps={{
                  input: { sx: { fontSize: '0.8rem' } },
                  inputLabel: { sx: { fontSize: '0.75rem' } },
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSinglePlayerAdd();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleSinglePlayerAdd}
                disabled={singlePlayer.trim() === ''}
                size="small"
                sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              >
                Add
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* Multi-player Section with Enhanced Instructions */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Add Multiple Players
              </Typography>
              <InfoIcon sx={{ fontSize: '0.9rem', color: 'info.main' }} />
            </Stack>

            {/* Instructions Alert */}
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 1 }}>
                <strong>💡 Pro Tip:</strong> Paste a list of names (one per line) to create multiple player cards instantly!
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                <Chip 
                  label="✓ Copy from Excel/Sheets" 
                  size="small" 
                  variant="outlined" 
                  sx={{ fontSize: '0.65rem', height: '20px' }}
                />
                <Chip 
                  label="✓ Text lists" 
                  size="small" 
                  variant="outlined" 
                  sx={{ fontSize: '0.65rem', height: '20px' }}
                />
                <Chip 
                  label="✓ Tournament brackets" 
                  size="small" 
                  variant="outlined" 
                  sx={{ fontSize: '0.65rem', height: '20px' }}
                />
              </Stack>
            </Alert>

            {/* Basic Example */}
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                  📋 Basic Format (most common)
                </Typography>
                <Button
                  size="small"
                  startIcon={<CopyIcon sx={{ fontSize: '0.7rem' }} />}
                  onClick={() => copyExampleToClipboard(basicExample)}
                  sx={{ fontSize: '0.65rem', minHeight: '24px' }}
                >
                  Copy Example
                </Button>
              </Stack>
              <Box sx={{ 
                bgcolor: 'grey.50', 
                p: 1.5, 
                borderRadius: 1, 
                border: '1px dashed',
                borderColor: 'grey.300'
              }}>
                <Typography component="pre" sx={{ 
                  fontSize: '0.75rem', 
                  fontFamily: 'monospace',
                  margin: 0,
                  whiteSpace: 'pre-line'
                }}>
                  {basicExample}
                </Typography>
              </Box>
            </Box>

            {/* Advanced Examples Toggle */}
            <Button
              variant="text"
              size="small"
              onClick={() => setShowAdvancedHelp(!showAdvancedHelp)}
              startIcon={showAdvancedHelp ? <CollapseIcon /> : <ExpandIcon />}
              sx={{ 
                fontSize: '0.75rem', 
                mb: 1,
                color: 'primary.main',
                textTransform: 'none'
              }}
            >
              {showAdvancedHelp ? 'Hide' : 'Show'} Advanced Features
            </Button>

            <Collapse in={showAdvancedHelp}>
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    🚀 Advanced Format
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<CopyIcon sx={{ fontSize: '0.7rem' }} />}
                    onClick={() => copyExampleToClipboard(advancedExample)}
                    sx={{ fontSize: '0.65rem', minHeight: '24px' }}
                  >
                    Copy Example
                  </Button>
                </Stack>
                <Box sx={{ 
                  bgcolor: 'grey.50', 
                  p: 1.5, 
                  borderRadius: 1, 
                  border: '1px dashed',
                  borderColor: 'grey.300',
                  mb: 1.5
                }}>
                  <Typography component="pre" sx={{ 
                    fontSize: '0.75rem', 
                    fontFamily: 'monospace',
                    margin: 0,
                    whiteSpace: 'pre-line'
                  }}>
                    {advancedExample}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block' }}>
                  • <strong>+3 or (3):</strong> Creates 3 copies (John 1, John 2, John 3)<br/>
                  • <strong>Numbers:</strong> Automatically removes "1. 2." prefixes<br/>
                  • <strong>Duplicates:</strong> Creates numbered versions automatically
                </Typography>
              </Box>
            </Collapse>

            {/* Text Area with Better Placeholder */}
            <TextField
              label="Player Names List"
              placeholder={`Paste your player list here...

Examples:
• John
• Sarah  
• Mike
• Anna

Or try: John +2 (creates John 1, John 2)`}
              multiline
              minRows={6}
              maxRows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              variant="outlined"
              fullWidth
              slotProps={{
                input: {
                  sx: { 
                    fontSize: '0.8rem',
                    fontFamily: 'monospace'
                  },
                },
                inputLabel: {
                  sx: { fontSize: '0.75rem' },
                },
              }}
              sx={{
                '& .MuiInputBase-root': {
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />

            {/* Live Preview */}
            {inputText.trim() && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  Preview: Will create {parsePlayerList(inputText).length} player{parsePlayerList(inputText).length !== 1 ? 's' : ''}
                </Typography>
                <Box sx={{ 
                  mt: 0.5,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.5,
                  maxHeight: '80px',
                  overflowY: 'auto'
                }}>
                  {parsePlayerList(inputText).slice(0, 10).map((player, index) => (
                    <Chip
                      key={index}
                      label={player.name}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: '22px' }}
                    />
                  ))}
                  {parsePlayerList(inputText).length > 10 && (
                    <Chip
                      label={`+${parsePlayerList(inputText).length - 10} more`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: '22px', fontStyle: 'italic' }}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 1 }}>
            <Button 
              onClick={onClose} 
              variant="text" 
              size="small" 
              sx={{ fontSize: '0.75rem' }}
            >
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
              Add {inputText.trim() ? `${parsePlayerList(inputText).length} ` : ''}Player{inputText.trim() && parsePlayerList(inputText).length !== 1 ? 's' : ''}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
};

export default PlayerParserForm;