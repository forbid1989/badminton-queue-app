import React, { useContext, useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import { Card, Button , Typography, Box, TextField, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Player } from '../types/Player';
import DroppableZone from './DroppableZone';
import PlayerCard from './PlayerCard';
import { AppContext } from '../BadmintonQueueUI'; // ✅ Context
import { Action } from '../app/Action'; // ✅ Action creators
import { PlayerStatus } from '../types/Player';

type CourtZoneProps = {
  courtCount: number;
};

// Badminton Court SVG Component - Based on reference image
const BadmintonCourtBackground: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 300 150"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 0,
      opacity: 0.4,
    }}
    preserveAspectRatio="none"
  >
    {/* Outer court boundary */}
    <rect
      x="25"
      y="25"
      width="250"
      height="100"
      fill="none"
      stroke="white"
      strokeWidth="2"
    />
    
    {/* Center net line */}
    <line
      x1="150"
      y1="25"
      x2="150"
      y2="125"
      stroke="white"
      strokeWidth="1.5"
      strokeDasharray="3,3"
    />
    
    {/* Short service lines */}
    <line
      x1="25"
      y1="50"
      x2="275"
      y2="50"
      stroke="white"
      strokeWidth="1.5"
    />
    <line
      x1="25"
      y1="100"
      x2="275"
      y2="100"
      stroke="white"
      strokeWidth="1.5"
    />
    
    {/* Singles sidelines */}
    <line
      x1="50"
      y1="25"
      x2="50"
      y2="125"
      stroke="white"
      strokeWidth="1.5"
    />
    <line
      x1="250"
      y1="25"
      x2="250"
      y2="125"
      stroke="white"
      strokeWidth="1.5"
    />
    
    {/* Left service boxes */}
    <rect
      x="25"
      y="50"
      width="25"
      height="25"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
    />
    <rect
      x="25"
      y="75"
      width="25"
      height="25"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
    />
    
    {/* Right service boxes */}
    <rect
      x="250"
      y="50"
      width="25"
      height="25"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
    />
    <rect
      x="250"
      y="75"
      width="25"
      height="25"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
    />
    
    {/* Inner service area rectangles */}
    <rect
      x="50"
      y="50"
      width="100"
      height="50"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
    />
    <rect
      x="150"
      y="50"
      width="100"
      height="50"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
    />
    
    {/* Center service line dividers */}
    <line
      x1="150"
      y1="50"
      x2="150"
      y2="75"
      stroke="white"
      strokeWidth="1.5"
    />
    <line
      x1="150"
      y1="75"
      x2="150"
      y2="100"
      stroke="white"
      strokeWidth="1.5"
    />
  </svg>
);

const CourtZone: React.FC<CourtZoneProps> = ({ courtCount }) =>  {

	const { state, dispatch } = useContext(AppContext); // ✅ Get dispatch from context
  const players = state.players;
  
  // State for court name editing
  const [editingCourt, setEditingCourt] = useState<string | null>(null);
  const [courtNames, setCourtNames] = useState<Record<string, string>>(() => {
    // Initialize with default names
    const defaultNames: Record<string, string> = {};
    for (let i = 0; i < courtCount; i++) {
      defaultNames[`court-${i}`] = `Court ${i + 1}`;
    }
    return defaultNames;
  });
  
  // Update court names when court count changes
  useEffect(() => {
    setCourtNames(prev => {
      const updated = { ...prev };
      for (let i = 0; i < courtCount; i++) {
        const courtId = `court-${i}`;
        if (!updated[courtId]) {
          updated[courtId] = `Court ${i + 1}`;
        }
      }
      return updated;
    });
  }, [courtCount]);
  
  const handleCourtNameChange = (courtId: string, newName: string) => {
    setCourtNames(prev => ({
      ...prev,
      [courtId]: newName
    }));
  };
  
  const handleCourtNameSubmit = (courtId: string) => {
    setEditingCourt(null);
    // Here you could dispatch an action to save court names to state if needed
    // dispatch(Action.updateCourtName(courtId, courtNames[courtId]));
  };
	
	return (
    <Grid container spacing={2}>
      {Array.from({ length: courtCount }, (_, index) => {
        const courtId = `court-${index}`;
        
        
        // ✅ Filter players that are assigned to this court
        const courtPlayers = players.filter((p) => {
          const hasThisCourt = p.status.includes(courtId as PlayerStatus);

          const courtAssignments = p.status.filter((s) => s.startsWith('court-')).length;
          const queueAssignments = p.status.filter((s) => s.startsWith('queue-')).length;

          const isValid =
            hasThisCourt &&
            courtAssignments <= 1 &&
            queueAssignments <= 1;

          return isValid;
        });

        return (
          <Grid size={{ xs: 12, sm: 6 }} key={courtId}>
            <DroppableZone 
              zone={courtId} 
              players={courtPlayers} 
              sx={{
                backgroundColor: '#00936a',
                color: '#fff',
                position: 'relative',
                minHeight: '120px', // Increased height for court proportions
                background: 'linear-gradient(135deg, #00936a 0%, #007055 100%)', // Gradient using your color
              }}
            >
              {/* Badminton Court Background */}
              <BadmintonCourtBackground />
              
              {/* Content Container with higher z-index */}
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 2,
                  height: '100%',
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  {editingCourt === courtId ? (
                    <TextField
                      value={courtNames[courtId] || `Court ${index + 1}`}
                      onChange={(e) => handleCourtNameChange(courtId, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCourtNameSubmit(courtId);
                        }
                        if (e.key === 'Escape') {
                          setEditingCourt(null);
                        }
                      }}
                      onBlur={() => handleCourtNameSubmit(courtId)}
                      autoFocus
                      variant="standard"
                      size="small"
                      sx={{
                        '& .MuiInputBase-input': {
                          fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                          fontWeight: 'bold',
                          color: 'white',
                          padding: '2px 4px',
                        },
                        '& .MuiInputBase-root': {
                          '&:before': {
                            borderBottomColor: 'rgba(255,255,255,0.5)',
                          },
                          '&:after': {
                            borderBottomColor: 'white',
                          },
                        },
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                          fontWeight: 'bold',
                          color: 'white',
                          padding: '2px 4px',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setEditingCourt(courtId)}
                        title="Click to edit court name"
                      >
                        🏸 {courtNames[courtId] || `Court ${index + 1}`}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setEditingCourt(courtId)}
                        sx={{
                          color: 'rgba(255,255,255,0.7)',
                          padding: '2px',
                          '&:hover': {
                            color: 'white',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                          },
                        }}
                        title="Edit court name"
                      >
                        <EditIcon sx={{ fontSize: '0.75rem' }} />
                      </IconButton>
                    </Box>
                  )}
                  {courtPlayers.length > 0 && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => dispatch(Action.endGame(courtId))}
                      sx={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        backgroundColor: 'rgba(0, 147, 106, 0.8)', // Semi-transparent using your color
                        textTransform: 'none',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 112, 85, 0.9)', // Darker shade on hover
                        },
                      }}
                    >
                      End Game
                    </Button>
                  )}
                </Box>

                {courtPlayers.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '60px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 1,
                      border: '2px dashed rgba(255,255,255,0.3)',
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '0.7rem', 
                        color: 'rgba(255,255,255,0.8)',
                        textAlign: 'center',
                      }}
                    >
                      Court Available
                      <br />
                      <Box component="span" sx={{ fontSize: '0.6rem' }}>
                        Drag players here
                      </Box>
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={1}>
                    {courtPlayers.map((player) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={player.id}>
                        <PlayerCard player={player} zone={courtId} />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </DroppableZone>
          </Grid>
        );
      })}
    </Grid>
	);
}

export default CourtZone