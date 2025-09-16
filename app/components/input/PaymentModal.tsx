// PaymentModal.tsx - Updated with sortable table headers and mobile responsiveness

import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  Modal,
  Paper,
  Box,
  Typography,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Alert,
  TableSortLabel,
  Card,
  CardContent,
  Grid,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SportsIcon from '@mui/icons-material/Sports';
import PaidIcon from '@mui/icons-material/Paid';
import PendingIcon from '@mui/icons-material/Pending';
import { AppContext } from '../../BadmintonQueueUI';
import { Action } from '../../lib/store/Action';
import { Player } from '../types/Player';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
}

// Types for sorting
type SortableColumns = 'name' | 'gamesPlayed' | 'amountDue' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  column: SortableColumns | null;
  direction: SortDirection;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { state, dispatch } = useContext(AppContext);
  
  // Payment settings state
  const [feeStructure, setFeeStructure] = useState<'flat' | 'per_game'>('flat');
  const [flatFee, setFlatFee] = useState('50');
  const [courtFee, setCourtFee] = useState('20');
  const [perGameFee, setPerGameFee] = useState('15');
  const [guestFee, setGuestFee] = useState('25');
  const [currency, setCurrency] = useState('PHP');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: 'asc'
  });

  // Load payment settings from state or localStorage
  useEffect(() => {
    const savedSettings = state.settings.paymentSettings;
    if (savedSettings) {
      setFeeStructure(savedSettings.feeStructure || 'flat');
      setFlatFee(savedSettings.flatFee?.toString() || '50');
      setCourtFee(savedSettings.courtFee?.toString() || '20');
      setPerGameFee(savedSettings.perGameFee?.toString() || '15');
      setGuestFee(savedSettings.guestFee?.toString() || '25');
      setCurrency(savedSettings.currency || 'PHP');
    }
  }, [state.settings.paymentSettings]);

  // Calculate fee for a player
  const calculatePlayerFee = useMemo(() => {
    return (player: Player, isGuest: boolean = false) => {
      const courtFeeNum = parseFloat(courtFee) || 0;
      const guestFeeNum = parseFloat(guestFee) || 0;
      
      if (feeStructure === 'flat') {
        const flatFeeNum = parseFloat(flatFee) || 0;
        return flatFeeNum + (isGuest ? guestFeeNum : 0);
      } else {
        const perGameFeeNum = parseFloat(perGameFee) || 0;
        const gamesFee = player.gamesPlayed * perGameFeeNum;
        return courtFeeNum + gamesFee + (isGuest ? guestFeeNum : 0);
      }
    };
  }, [feeStructure, flatFee, courtFee, perGameFee, guestFee]);

  // Handle sorting
  const handleSort = (column: SortableColumns) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort players based on current sort configuration
  const sortedPlayers = useMemo(() => {
    if (!sortConfig.column) return state.players;

    return [...state.players].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.column) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'gamesPlayed':
          aValue = a.gamesPlayed;
          bValue = b.gamesPlayed;
          break;
        case 'amountDue':
          aValue = calculatePlayerFee(a, a.paymentInfo?.isGuest || false);
          bValue = calculatePlayerFee(b, b.paymentInfo?.isGuest || false);
          break;
        case 'status':
          // Sort by payment status: Paid comes before Pending
          aValue = a.paymentInfo?.hasPaid ? 0 : 1;
          bValue = b.paymentInfo?.hasPaid ? 0 : 1;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [state.players, sortConfig, calculatePlayerFee]);

  // Save payment settings
  const handleSaveSettings = () => {
    const paymentSettings = {
      feeStructure,
      flatFee: parseFloat(flatFee) || 0,
      courtFee: parseFloat(courtFee) || 0,
      perGameFee: parseFloat(perGameFee) || 0,
      guestFee: parseFloat(guestFee) || 0,
      currency,
    };
    
    dispatch(Action.updatePaymentSettings(paymentSettings));
  };

  // Toggle payment status for a player
  const handleTogglePayment = (playerId: string) => {
    dispatch(Action.togglePlayerPayment(playerId));
  };

  // Mark all players as paid
  const handleMarkAllPaid = () => {
    dispatch(Action.markAllPlayersPaid());
  };

  // Clear all payment statuses
  const handleClearAllPayments = () => {
    dispatch(Action.clearAllPayments());
  };

  // Calculate totals
  const totals = useMemo(() => {
    let totalOwed = 0;
    let totalPaid = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    state.players.forEach(player => {
      const isGuest = player.paymentInfo?.isGuest || false;
      const fee = calculatePlayerFee(player, isGuest);
      const hasPaid = player.paymentInfo?.hasPaid || false;

      totalOwed += fee;
      if (hasPaid) {
        totalPaid += fee;
        paidCount++;
      } else {
        unpaidCount++;
      }
    });

    return {
      totalOwed,
      totalPaid,
      totalUnpaid: totalOwed - totalPaid,
      paidCount,
      unpaidCount,
      totalPlayers: state.players.length,
    };
  }, [state.players, calculatePlayerFee]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper
        sx={{
          width: '90%',
          maxWidth: 1000,
          maxHeight: '90vh',
          overflow: 'auto',
          p: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoneyIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Payment Summary
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Payment Settings Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
            Payment Settings
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Fee Structure</InputLabel>
                <Select
                  value={feeStructure}
                  onChange={(e) => setFeeStructure(e.target.value as 'flat' | 'per_game')}
                  label="Fee Structure"
                >
                  <MenuItem value="flat">Flat Fee</MenuItem>
                  <MenuItem value="per_game">Per Game</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  label="Currency"
                >
                  <MenuItem value="PHP">PHP (₱)</MenuItem>
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                  <MenuItem value="SGD">SGD (S$)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {feeStructure === 'flat' ? (
                <TextField
                  label="Flat Fee per Player"
                  value={flatFee}
                  onChange={(e) => setFlatFee(e.target.value)}
                  size="small"
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">{currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}</InputAdornment>,
                  }}
                />
              ) : (
                <>
                  <TextField
                    label="Court Fee per Player"
                    value={courtFee}
                    onChange={(e) => setCourtFee(e.target.value)}
                    size="small"
                    type="number"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">{currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}</InputAdornment>,
                    }}
                  />
                  <TextField
                    label="Per Game Fee"
                    value={perGameFee}
                    onChange={(e) => setPerGameFee(e.target.value)}
                    size="small"
                    type="number"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">{currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}</InputAdornment>,
                    }}
                  />
                </>
              )}
              
              <TextField
                label="Guest Fee (additional)"
                value={guestFee}
                onChange={(e) => setGuestFee(e.target.value)}
                size="small"
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}</InputAdornment>,
                }}
              />
            </Box>

            <Button
              variant="contained"
              onClick={handleSaveSettings}
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              Save Settings
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Summary Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ 
            flex: 1, 
            minWidth: 150, 
            p: 2, 
            bgcolor: 'success.light', 
            borderRadius: 1,
            color: 'success.contrastText'
          }}>
            <Typography variant="subtitle2">Total Paid</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}{totals.totalPaid.toFixed(2)}
            </Typography>
            <Typography variant="caption">{totals.paidCount} players</Typography>
          </Box>
          
          <Box sx={{ 
            flex: 1, 
            minWidth: 150, 
            p: 2, 
            bgcolor: 'warning.light', 
            borderRadius: 1,
            color: 'warning.contrastText'
          }}>
            <Typography variant="subtitle2">Total Unpaid</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}{totals.totalUnpaid.toFixed(2)}
            </Typography>
            <Typography variant="caption">{totals.unpaidCount} players</Typography>
          </Box>
          
          <Box sx={{ 
            flex: 1, 
            minWidth: 150, 
            p: 2, 
            bgcolor: 'primary.light', 
            borderRadius: 1,
            color: 'primary.contrastText'
          }}>
            <Typography variant="subtitle2">Total Expected</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}{totals.totalOwed.toFixed(2)}
            </Typography>
            <Typography variant="caption">{totals.totalPlayers} players</Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="success"
            onClick={handleMarkAllPaid}
            size="small"
            disabled={totals.unpaidCount === 0}
            fullWidth={isMobile}
          >
            Mark All Paid
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={handleClearAllPayments}
            size="small"
            disabled={totals.paidCount === 0}
            fullWidth={isMobile}
          >
            Clear All Payments
          </Button>
        </Box>

        {/* Mobile Card Layout */}
        {isMobile ? (
          <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
            <Stack spacing={1}>
              {sortedPlayers.map((player) => {
                const isGuest = player.paymentInfo?.isGuest || false;
                const hasPaid = player.paymentInfo?.hasPaid || false;
                const amountDue = calculatePlayerFee(player, isGuest);

                return (
                  <Card key={player.id} variant="outlined" sx={{ 
                    bgcolor: hasPaid ? 'success.50' : 'warning.50',
                    borderColor: hasPaid ? 'success.200' : 'warning.200'
                  }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      {/* Player Name and Status Row */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SportsIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {player.name}
                          </Typography>
                        </Box>
                        <Chip
                          icon={hasPaid ? <PaidIcon /> : <PendingIcon />}
                          label={hasPaid ? 'Paid' : 'Pending'}
                          color={hasPaid ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>

                      {/* Details Row */}
                      <Grid container spacing={1} sx={{ mb: 1 }}>
                        <Grid size={4}>
                          <Typography variant="caption" color="text.secondary">Games</Typography>
                          <Box>
                            <Chip 
                              label={player.gamesPlayed} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </Box>
                        </Grid>
                        <Grid size={4}>
                          <Typography variant="caption" color="text.secondary">Guest</Typography>
                          <Box>
                            <Switch
                              checked={isGuest}
                              onChange={(e) => dispatch(Action.togglePlayerGuest(player.id))}
                              size="small"
                            />
                          </Box>
                        </Grid>
                        <Grid size={4}>
                          <Typography variant="caption" color="text.secondary">Amount Due</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}{amountDue.toFixed(2)}
                          </Typography>
                        </Grid>
                      </Grid>

                      {/* Fee Breakdown (for per_game structure) */}
                      {feeStructure === 'per_game' && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
                          {currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}{parseFloat(courtFee)} + {player.gamesPlayed}×{currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}{parseFloat(perGameFee)}{isGuest ? ` + ${currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}${parseFloat(guestFee)}` : ''}
                        </Typography>
                      )}

                      {/* Action Button */}
                      <Button
                        variant={hasPaid ? 'outlined' : 'contained'}
                        color={hasPaid ? 'warning' : 'success'}
                        size="small"
                        onClick={() => handleTogglePayment(player.id)}
                        fullWidth
                      >
                        {hasPaid ? 'Mark Unpaid' : 'Mark Paid'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Box>
        ) : (
          /* Desktop Table Layout */
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.column === 'name'}
                      direction={sortConfig.column === 'name' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('name')}
                      sx={{ 
                        fontWeight: 'bold',
                        color: sortConfig.column === 'name' ? 'primary.main' : 'text.primary',
                        '&:hover': {
                          color: 'primary.main',
                          backgroundColor: 'primary.50',
                          borderRadius: 1,
                        },
                        '&.Mui-active': {
                          color: 'primary.main',
                          fontWeight: 'bold',
                        },
                        '& .MuiTableSortLabel-icon': {
                          fontSize: '1.2rem',
                          opacity: sortConfig.column === 'name' ? 1 : 0.5,
                        }
                      }}
                    >
                      Player
                      {sortConfig.column === 'name' && (
                        <Box component="span" sx={{ 
                          ml: 0.5, 
                          color: 'primary.main',
                          fontSize: '0.7rem',
                          fontWeight: 'normal'
                        }}>
                          ({sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'})
                        </Box>
                      )}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortConfig.column === 'gamesPlayed'}
                      direction={sortConfig.column === 'gamesPlayed' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('gamesPlayed')}
                      sx={{ 
                        fontWeight: 'bold',
                        color: sortConfig.column === 'gamesPlayed' ? 'primary.main' : 'text.primary',
                        '&:hover': {
                          color: 'primary.main',
                          backgroundColor: 'primary.50',
                          borderRadius: 1,
                        },
                        '&.Mui-active': {
                          color: 'primary.main',
                          fontWeight: 'bold',
                        },
                        '& .MuiTableSortLabel-icon': {
                          fontSize: '1.2rem',
                          opacity: sortConfig.column === 'gamesPlayed' ? 1 : 0.5,
                        }
                      }}
                    >
                      Games
                      {sortConfig.column === 'gamesPlayed' && (
                        <Box component="span" sx={{ 
                          ml: 0.5, 
                          color: 'primary.main',
                          fontSize: '0.7rem',
                          fontWeight: 'normal'
                        }}>
                          ({sortConfig.direction === 'asc' ? 'Low' : 'High'})
                        </Box>
                      )}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ 
                    fontWeight: 'bold',
                    color: 'text.secondary',
                    fontSize: '0.9rem'
                  }}>
                    Guest
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortConfig.column === 'amountDue'}
                      direction={sortConfig.column === 'amountDue' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('amountDue')}
                      sx={{ 
                        fontWeight: 'bold',
                        color: sortConfig.column === 'amountDue' ? 'primary.main' : 'text.primary',
                        '&:hover': {
                          color: 'primary.main',
                          backgroundColor: 'primary.50',
                          borderRadius: 1,
                        },
                        '&.Mui-active': {
                          color: 'primary.main',
                          fontWeight: 'bold',
                        },
                        '& .MuiTableSortLabel-icon': {
                          fontSize: '1.2rem',
                          opacity: sortConfig.column === 'amountDue' ? 1 : 0.5,
                        }
                      }}
                    >
                      Amount Due
                      {sortConfig.column === 'amountDue' && (
                        <Box component="span" sx={{ 
                          ml: 0.5, 
                          color: 'primary.main',
                          fontSize: '0.7rem',
                          fontWeight: 'normal'
                        }}>
                          ({sortConfig.direction === 'asc' ? 'Low' : 'High'})
                        </Box>
                      )}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortConfig.column === 'status'}
                      direction={sortConfig.column === 'status' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('status')}
                      sx={{ 
                        fontWeight: 'bold',
                        color: sortConfig.column === 'status' ? 'primary.main' : 'text.primary',
                        '&:hover': {
                          color: 'primary.main',
                          backgroundColor: 'primary.50',
                          borderRadius: 1,
                        },
                        '&.Mui-active': {
                          color: 'primary.main',
                          fontWeight: 'bold',
                        },
                        '& .MuiTableSortLabel-icon': {
                          fontSize: '1.2rem',
                          opacity: sortConfig.column === 'status' ? 1 : 0.5,
                        }
                      }}
                    >
                      Status
                      {sortConfig.column === 'status' && (
                        <Box component="span" sx={{ 
                          ml: 0.5, 
                          color: 'primary.main',
                          fontSize: '0.7rem',
                          fontWeight: 'normal'
                        }}>
                          ({sortConfig.direction === 'asc' ? 'Paid First' : 'Pending First'})
                        </Box>
                      )}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ 
                    fontWeight: 'bold',
                    color: 'text.secondary',
                    fontSize: '0.9rem'
                  }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedPlayers.map((player) => {
                  const isGuest = player.paymentInfo?.isGuest || false;
                  const hasPaid = player.paymentInfo?.hasPaid || false;
                  const amountDue = calculatePlayerFee(player, isGuest);

                  return (
                    <TableRow key={player.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SportsIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {player.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={player.gamesPlayed} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={isGuest}
                              onChange={(e) => dispatch(Action.togglePlayerGuest(player.id))}
                              size="small"
                            />
                          }
                          label=""
                          sx={{ margin: 0 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}{amountDue.toFixed(2)}
                        </Typography>
                        {feeStructure === 'per_game' && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            {currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}{parseFloat(courtFee)} + {player.gamesPlayed}×{currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}{parseFloat(perGameFee)}{isGuest ? ` + ${currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S$'}${parseFloat(guestFee)}` : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={hasPaid ? <PaidIcon /> : <PendingIcon />}
                          label={hasPaid ? 'Paid' : 'Pending'}
                          color={hasPaid ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant={hasPaid ? 'outlined' : 'contained'}
                          color={hasPaid ? 'warning' : 'success'}
                          size="small"
                          onClick={() => handleTogglePayment(player.id)}
                        >
                          {hasPaid ? 'Mark Unpaid' : 'Mark Paid'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {state.players.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No players found. Add some players to see payment information.
          </Alert>
        )}

        {/* Close Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
          >
            Close
          </Button>
        </Box>
      </Paper>
    </Modal>
  );
};

export default PaymentModal;