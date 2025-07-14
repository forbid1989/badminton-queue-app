import { useState, useContext } from 'react';
import { Action } from '../app/Action';
import { AppContext } from '../BadmintonQueueUI';
import { TextField, Button, Stack, useTheme  } from '@mui/material';

interface CourtControlPanelProps {
  onClose?: () => void;
}

const CourtControlPanel: React.FC<CourtControlPanelProps>  = ({ onClose }) => {
  const { state, dispatch } = useContext(AppContext);
  const [input, setInput] = useState(state.courts.count.toString());
  const theme = useTheme();

  const handleSubmit = () => {
    const newCount = parseInt(input);
    if (!isNaN(newCount) && newCount > 0) {
      dispatch(Action.setCourtCount(newCount));
      if (onClose) onClose();
    }
  };

  return (
    <Stack 
        direction="row" 
        spacing={1.5}
        sx={{
            alignItems: 'center',
            backgroundColor: theme.palette.background.paper,
            borderRadius: 1,
            padding: '4px 8px',
            boxShadow: theme.shadows[1],
        }}
    >
      <TextField
        variant="outlined"
        label="Courts"
        size="small"
        type="number"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        sx={{
          width: '80px',
          '& .MuiOutlinedInput-root': {
            backgroundColor: theme.palette.background.default,
          },
          '& .MuiInputLabel-root': {
            color: theme.palette.text.secondary,
          },
        }}
      />
      <Button 
        variant="contained" 
        color="secondary"
        sx={{
          color: theme.palette.secondary.contrastText,
        }}
        onClick={handleSubmit}
      >
        Update
      </Button>
    </Stack>
  );
};

export default CourtControlPanel;
