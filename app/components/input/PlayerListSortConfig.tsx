// PlayerListSortConfig.tsx - Component for configuring sort options
import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import { PlayerListSortConfig, SortableField } from '../types/Settings';

interface PlayerListSortConfigProps {
  sortConfig: PlayerListSortConfig;
  onSortConfigChange: (config: PlayerListSortConfig) => void;
}

const sortFieldLabels: Record<SortableField, string> = {
  timeEntered: 'Time Entered (When player joined)',
  gamesPlayed: 'Games Played',
  skillLevel: 'Skill Level (A > B > C > D)'
};

const sortDirectionLabels = {
  asc: 'Ascending (Low to High)',
  desc: 'Descending (High to Low)'
};

const PlayerListSortConfigComponent: React.FC<PlayerListSortConfigProps> = ({
  sortConfig,
  onSortConfigChange
}) => {
  const handleSecondaryFieldChange = (field: SortableField) => {
    onSortConfigChange({
      ...sortConfig,
      secondarySort: field
    });
  };

  const handleSecondaryDirectionChange = (direction: 'asc' | 'desc') => {
    onSortConfigChange({
      ...sortConfig,
      secondaryDirection: direction
    });
  };

  const handleTertiaryFieldChange = (field: SortableField) => {
    onSortConfigChange({
      ...sortConfig,
      tertiarySort: field
    });
  };

  const handleTertiaryDirectionChange = (direction: 'asc' | 'desc') => {
    onSortConfigChange({
      ...sortConfig,
      tertiaryDirection: direction
    });
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SortIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Player List Sorting
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Players are always sorted by status first (Court → Queue → Waiting). 
          Configure the 2nd and 3rd level sorting criteria below.
        </Typography>

        <Grid container spacing={2}>
          {/* Secondary Sort */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              2nd Level Sort
            </Typography>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortConfig.secondarySort}
                label="Sort By"
                onChange={(e) => handleSecondaryFieldChange(e.target.value as SortableField)}
              >
                {Object.entries(sortFieldLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Direction</InputLabel>
              <Select
                value={sortConfig.secondaryDirection}
                label="Direction"
                onChange={(e) => handleSecondaryDirectionChange(e.target.value as 'asc' | 'desc')}
              >
                {Object.entries(sortDirectionLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          {/* Tertiary Sort */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              3rd Level Sort (Tiebreaker)
            </Typography>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortConfig.tertiarySort}
                label="Sort By"
                onChange={(e) => handleTertiaryFieldChange(e.target.value as SortableField)}
              >
                {Object.entries(sortFieldLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Direction</InputLabel>
              <Select
                value={sortConfig.tertiaryDirection}
                label="Direction"
                onChange={(e) => handleTertiaryDirectionChange(e.target.value as 'asc' | 'desc')}
              >
                {Object.entries(sortDirectionLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Preview explanation */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Current sorting order:</strong><br />
            1st: Status (Court → Queue → Waiting)<br />
            2nd: {sortFieldLabels[sortConfig.secondarySort]} ({sortConfig.secondaryDirection === 'asc' ? 'Low to High' : 'High to Low'})<br />
            3rd: {sortFieldLabels[sortConfig.tertiarySort]} ({sortConfig.tertiaryDirection === 'asc' ? 'Low to High' : 'High to Low'})
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PlayerListSortConfigComponent;