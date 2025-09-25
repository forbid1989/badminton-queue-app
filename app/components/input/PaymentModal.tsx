import React, { useState, useEffect, useContext, useMemo, useCallback   } from 'react';
import {
  Modal,
  Paper,
  Box,
  Typography,
  IconButton,
  Divider,
  Switch,
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
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SportsIcon from '@mui/icons-material/Sports';
import PaidIcon from '@mui/icons-material/Paid';
import PendingIcon from '@mui/icons-material/Pending';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
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

// Currency mapping for symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  // Original currencies
  PHP: '₱',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  
  // Requested additions
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  KRW: '₩',
  INR: '₹',
  
  // Additional badminton-popular countries
  BRL: 'R$',     // Brazil
  PLN: 'zł',     // Poland
  THB: '฿',      // Thailand
  MYR: 'RM',     // Malaysia
  IDR: 'Rp',     // Indonesia
  TWD: 'NT$',    // Taiwan
  VND: '₫',      // Vietnam
  HKD: 'HK$',    // Hong Kong
  NZD: 'NZ$',    // New Zealand
  DKK: 'kr',     // Denmark
  SEK: 'kr',     // Sweden
  NOK: 'kr',     // Norway
  CZK: 'Kč',     // Czech Republic
  HUF: 'Ft',     // Hungary
  RUB: '₽',      // Russia
  ZAR: 'R',      // South Africa
  KES: 'KSh',    // Kenya
  NGN: '₦',      // Nigeria
  EGP: 'E£',     // Egypt
};

// Helper function to get currency symbol
const getCurrencySymbol = (currency: string): string => {
  return CURRENCY_SYMBOLS[currency] || currency;
};

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: 'asc'
  });

  // Load payment settings from state on component mount
  useEffect(() => {
    if (state.settings.paymentSettings) {
      const settings = state.settings.paymentSettings;
      setFeeStructure(settings.feeStructure);
      setFlatFee(settings.flatFee.toString());
      setCourtFee(settings.courtFee.toString());
      setPerGameFee(settings.perGameFee.toString());
      setGuestFee(settings.guestFee.toString());
      setCurrency(settings.currency);
    }
  }, [state.settings.paymentSettings]);

  // Calculate fee for a player
  const calculatePlayerFee = useCallback((player: Player, isGuest: boolean = false) => {
    const baseFee = feeStructure === 'flat' 
      ? parseFloat(flatFee) || 0
      : (parseFloat(courtFee) || 0) + (player.gamesPlayed * (parseFloat(perGameFee) || 0));
    
    const guestFeeAmount = isGuest ? (parseFloat(guestFee) || 0) : 0;
    return baseFee + guestFeeAmount;
  }, [feeStructure, flatFee, courtFee, perGameFee, guestFee]);

  // Handle sorting
  const handleSort = (column: SortableColumns) => {
    setSortConfig(prevConfig => ({
      column,
      direction: prevConfig.column === column && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = state.players.filter(player =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig.column) {
      filtered = filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

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
            const aIsGuest = a.paymentInfo?.isGuest || false;
            const bIsGuest = b.paymentInfo?.isGuest || false;
            aValue = calculatePlayerFee(a, aIsGuest);
            bValue = calculatePlayerFee(b, bIsGuest);
            break;
          case 'status':
            aValue = a.paymentInfo?.hasPaid ? 1 : 0;
            bValue = b.paymentInfo?.hasPaid ? 1 : 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [state.players, searchQuery, sortConfig, calculatePlayerFee]);

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

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('');
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

  const paymentSummary = useMemo(() => {
    const totalOwed = filteredAndSortedPlayers.reduce((sum, player) => {
      const isGuest = player.paymentInfo?.isGuest || false;
      return sum + calculatePlayerFee(player, isGuest);
    }, 0);

    const totalPaid = filteredAndSortedPlayers.reduce((sum, player) => {
      if (player.paymentInfo?.hasPaid) {
        const isGuest = player.paymentInfo?.isGuest || false;
        return sum + calculatePlayerFee(player, isGuest);
      }
      return sum;
    }, 0);

    const paidCount = filteredAndSortedPlayers.filter(p => p.paymentInfo?.hasPaid).length;
    const unpaidCount = filteredAndSortedPlayers.length - paidCount;

    return {
      totalOwed,
      totalPaid,
      totalUnpaid: totalOwed - totalPaid,
      paidCount,
      unpaidCount,
      totalPlayers: filteredAndSortedPlayers.length,
    };
  }, [filteredAndSortedPlayers, calculatePlayerFee]);

  const currencySymbol = getCurrencySymbol(currency);

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
          width: '100%',
          maxWidth: isMobile ? '95vw' : '900px',
          maxHeight: '90vh',
          overflow: 'auto',
          p: 3,
          borderRadius: 2,
          boxShadow: 24,
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoneyIcon color="primary" />
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
              Payment Management
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

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  label="Currency"
                >
                  {/* Major International Currencies */}
                  <MenuItem value="USD">USD ($) - US Dollar</MenuItem>
                  <MenuItem value="EUR">EUR (€) - Euro</MenuItem>
                  <MenuItem value="GBP">GBP (£) - British Pound</MenuItem>
                  <MenuItem value="JPY">JPY (¥) - Japanese Yen</MenuItem>
                  <MenuItem value="CNY">CNY (¥) - Chinese Yuan</MenuItem>
                  <MenuItem value="CHF">CHF - Swiss Franc</MenuItem>
                  
                  {/* Asia-Pacific (Badminton Popular) */}
                  <MenuItem value="PHP">PHP (₱) - Philippine Peso</MenuItem>
                  <MenuItem value="SGD">SGD (S$) - Singapore Dollar</MenuItem>
                  <MenuItem value="MYR">MYR (RM) - Malaysian Ringgit</MenuItem>
                  <MenuItem value="IDR">IDR (Rp) - Indonesian Rupiah</MenuItem>
                  <MenuItem value="THB">THB (฿) - Thai Baht</MenuItem>
                  <MenuItem value="TWD">TWD (NT$) - Taiwan Dollar</MenuItem>
                  <MenuItem value="VND">VND (₫) - Vietnamese Dong</MenuItem>
                  <MenuItem value="HKD">HKD (HK$) - Hong Kong Dollar</MenuItem>
                  <MenuItem value="INR">INR (₹) - Indian Rupee</MenuItem>
                  <MenuItem value="KRW">KRW (₩) - Korean Won</MenuItem>
                  
                  {/* Americas & Oceania */}
                  <MenuItem value="CAD">CAD (C$) - Canadian Dollar</MenuItem>
                  <MenuItem value="AUD">AUD (A$) - Australian Dollar</MenuItem>
                  <MenuItem value="NZD">NZD (NZ$) - New Zealand Dollar</MenuItem>
                  <MenuItem value="BRL">BRL (R$) - Brazilian Real</MenuItem>
                  
                  {/* Europe */}
                  <MenuItem value="PLN">PLN (zł) - Polish Zloty</MenuItem>
                  <MenuItem value="DKK">DKK (kr) - Danish Krone</MenuItem>
                  <MenuItem value="SEK">SEK (kr) - Swedish Krona</MenuItem>
                  <MenuItem value="NOK">NOK (kr) - Norwegian Krone</MenuItem>
                  <MenuItem value="CZK">CZK (Kč) - Czech Koruna</MenuItem>
                  <MenuItem value="HUF">HUF (Ft) - Hungarian Forint</MenuItem>
                  <MenuItem value="RUB">RUB (₽) - Russian Ruble</MenuItem>
                  
                  {/* Africa */}
                  <MenuItem value="ZAR">ZAR (R) - South African Rand</MenuItem>
                  <MenuItem value="KES">KES (KSh) - Kenyan Shilling</MenuItem>
                  <MenuItem value="NGN">NGN (₦) - Nigerian Naira</MenuItem>
                  <MenuItem value="EGP">EGP (E£) - Egyptian Pound</MenuItem>
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
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                    },
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
                    slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                    },
                  }}
                  />
                  <TextField
                    label="Per Game Fee"
                    value={perGameFee}
                    onChange={(e) => setPerGameFee(e.target.value)}
                    size="small"
                    type="number"
                    slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                    },
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
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                  },
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
        <Box sx={{ mb: 3 }}>
          {isMobile ? (
            // Mobile: Compact vertical layout
            <Stack spacing={1}>
              <Box sx={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1.5, 
                bgcolor: 'success.light', 
                borderRadius: 1,
                color: 'success.contrastText'
              }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Total Paid</Typography>
                  <Typography variant="caption">{paymentSummary.paidCount} players</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {currencySymbol}{paymentSummary.totalPaid.toFixed(2)}
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1.5, 
                bgcolor: 'warning.light', 
                borderRadius: 1,
                color: 'warning.contrastText'
              }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Total Unpaid</Typography>
                  <Typography variant="caption">{paymentSummary.unpaidCount} players</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {currencySymbol}{paymentSummary.totalUnpaid.toFixed(2)}
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1.5, 
                bgcolor: 'primary.light', 
                borderRadius: 1,
                color: 'primary.contrastText'
              }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Total Expected</Typography>
                  <Typography variant="caption">{paymentSummary.totalPlayers} players</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {currencySymbol}{paymentSummary.totalOwed.toFixed(2)}
                </Typography>
              </Box>
            </Stack>
          ) : (
            // Desktop: Original horizontal layout
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                  {currencySymbol}{paymentSummary.totalPaid.toFixed(2)}
                </Typography>
                <Typography variant="caption">{paymentSummary.paidCount} players</Typography>
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
                  {currencySymbol}{paymentSummary.totalUnpaid.toFixed(2)}
                </Typography>
                <Typography variant="caption">{paymentSummary.unpaidCount} players</Typography>
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
                  {currencySymbol}{paymentSummary.totalOwed.toFixed(2)}
                </Typography>
                <Typography variant="caption">{paymentSummary.totalPlayers} players</Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={handleMarkAllPaid}
            disabled={paymentSummary.totalPlayers === 0}
          >
            Mark All Paid
          </Button>
          <Button
            variant="outlined"
            color="warning"
            size="small"
            onClick={handleClearAllPayments}
            disabled={paymentSummary.paidCount === 0}
          >
            Clear All Payments
          </Button>
        </Box>

        {/* Search */}
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth={isMobile}
            sx={{ maxWidth: isMobile ? '100%' : 300 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: searchQuery && (
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              ),
            }}
          />
        </Box>

        {/* Players Table */}
        {filteredAndSortedPlayers.length > 0 && (
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
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
                      Player Name
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
                          ({sortConfig.direction === 'asc' ? 'Unpaid First' : 'Paid First'})
                        </Box>
                      )}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ 
                    fontWeight: 'bold',
                    color: 'text.secondary',
                    fontSize: '0.9rem'
                  }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedPlayers.map((player) => {
                  const isGuest = player.paymentInfo?.isGuest || false;
                  const hasPaid = player.paymentInfo?.hasPaid || false;
                  const amountDue = calculatePlayerFee(player, isGuest);

                  return (
                    <TableRow
                      key={player.id}
                      sx={{
                        '&:nth-of-type(odd)': {
                          backgroundColor: theme.palette.action.hover,
                        },
                        '&:hover': {
                          backgroundColor: theme.palette.action.selected,
                        },
                      }}
                    >
                      <TableCell component="th" scope="row">
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {player.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={<SportsIcon />}
                          label={player.gamesPlayed}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={isGuest}
                          onChange={(e) => {
                            dispatch(Action.togglePlayerGuest(player.id));
                          }}
                          size="small"
                          color="warning"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {currencySymbol}{amountDue.toFixed(2)}
                        </Typography>
                        {feeStructure === 'per_game' && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            {currencySymbol}{parseFloat(courtFee)} + {player.gamesPlayed}×{currencySymbol}{parseFloat(perGameFee)}{isGuest ? ` + ${currencySymbol}${parseFloat(guestFee)}` : ''}
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

        {filteredAndSortedPlayers.length === 0 && searchQuery && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No players found matching "{searchQuery}". Try adjusting your search.
          </Alert>
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