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
  Alert,
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

const PaymentModal: React.FC<PaymentModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { state, dispatch } = useContext(AppContext);
  
  // Payment settings state
  const [feeStructure, setFeeStructure] = useState<'flat' | 'per_game'>('flat');
  const [flatFee, setFlatFee] = useState('50');
  const [courtFee, setCourtFee] = useState('20');
  const [perGameFee, setPerGameFee] = useState('15');
  const [guestFee, setGuestFee] = useState('25');
  const [currency, setCurrency] = useState('PHP');

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

  const modalSx = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '95%', sm: '90%', md: 800 },
    maxWidth: 900,
    maxHeight: '90vh',
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: 3,
    overflow: 'auto',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="payment-modal-title"
    >
      <Paper sx={modalSx}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography 
            id="payment-modal-title" 
            variant="h6" 
            sx={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <AttachMoneyIcon color="primary" />
            Payment Summary
          </Typography>
          <IconButton 
            onClick={onClose}
            size="small"
            sx={{ 
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'action.hover' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Payment Settings */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
            Payment Settings
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Fee Structure */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Fee Structure</InputLabel>
              <Select
                value={feeStructure}
                label="Fee Structure"
                onChange={(e) => setFeeStructure(e.target.value as 'flat' | 'per_game')}
              >
                <MenuItem value="flat">Flat Fee</MenuItem>
                <MenuItem value="per_game">Per Game + Court Fee</MenuItem>
              </Select>
            </FormControl>

            {/* Currency */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={currency}
                label="Currency"
                onChange={(e) => setCurrency(e.target.value)}
              >
                <MenuItem value="PHP">PHP (₱)</MenuItem>
                <MenuItem value="USD">USD ($)</MenuItem>
                <MenuItem value="EUR">EUR (€)</MenuItem>
                <MenuItem value="SGD">SGD (S$)</MenuItem>
              </Select>
            </FormControl>

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
                    label="Court Fee (flat)"
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
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="contained"
            color="success"
            onClick={handleMarkAllPaid}
            size="small"
            disabled={totals.unpaidCount === 0}
          >
            Mark All Paid
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={handleClearAllPayments}
            size="small"
            disabled={totals.paidCount === 0}
          >
            Clear All Payments
          </Button>
        </Box>

        {/* Players Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell align="center">Games</TableCell>
                <TableCell align="center">Guest</TableCell>
                <TableCell align="right">Amount Due</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.players.map((player) => {
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