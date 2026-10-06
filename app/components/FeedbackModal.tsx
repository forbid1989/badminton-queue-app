import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Checkbox,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  FormHelperText,
  Typography,
  Box,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { supabase } from '../lib/supabase';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const ROLES = [
  { value: 'organizer', label: 'Queue master / organizer' },
  { value: 'player', label: 'Player' },
  { value: 'owner', label: 'Group owner or decision-maker' },
  { value: 'other', label: 'Other' },
];

const SPORTS = [
  { value: 'badminton', label: 'Badminton' },
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'table_tennis', label: 'Table tennis' },
  { value: 'other', label: 'Other' },
];

const REGIONS = [
  { value: 'metro_manila', label: 'Metro Manila' },
  { value: 'luzon_other', label: 'Luzon (outside Metro Manila)' },
  { value: 'visayas', label: 'Visayas' },
  { value: 'mindanao', label: 'Mindanao' },
  { value: 'other', label: 'Outside the Philippines' },
];

const GROUP_TYPES = [
  { value: 'students', label: 'Mostly students' },
  { value: 'working_adults', label: 'Mostly working adults' },
  { value: 'mixed', label: 'Mixed' },
];

const PLAYERS_PER_SESSION = [
  { value: 'lt_10', label: 'Under 10' },
  { value: '10_19', label: '10-19' },
  { value: '20_29', label: '20-29' },
  { value: '30_plus', label: '30 or more' },
];

const SURVEY_VERSION = 2;

const FEATURES = [
  { value: 'auto_queue', label: 'Auto-queueing' },
  { value: 'leaderboard', label: 'Leaderboards' },
  { value: 'mmr', label: 'MMR / skill rankings' },
  { value: 'win_stats', label: 'Win/loss stats and win rate' },
  { value: 'live_session', label: 'Live session view (players see the queue and their turn on their phone)' },
  { value: 'match_history', label: 'Player match history (your own and other players’)' },
  { value: 'match_request', label: 'Match requests (players request a game with specific people)' },
  { value: 'running_cost', label: 'Running cost and budget alerts for players' },
  { value: 'other', label: 'Other' },
];

const WOULD_PAY = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
];

const PRICES = [
  { value: 'lt_100', label: 'Under ₱100' },
  { value: '100_199', label: '₱100-199' },
  { value: '200_299', label: '₱200-299' },
  { value: '300_499', label: '₱300-499' },
  { value: '500_749', label: '₱500-749' },
  { value: '750_999', label: '₱750-999' },
  { value: '1000_plus', label: '₱1,000 or more' },
];

const MAX_FEATURES = 3;
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 2000;

const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [role, setRole] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [groupType, setGroupType] = useState('');
  const [playersPerSession, setPlayersPerSession] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [featureOther, setFeatureOther] = useState('');
  const [wouldPay, setWouldPay] = useState('');
  const [priceChoice, setPriceChoice] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot, real users never fill this
  const [submitting, setSubmitting] = useState(false);

  const trimmed = message.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_MESSAGE;
  const showPrice = wouldPay === 'yes' || wouldPay === 'maybe';
  const atFeatureLimit = features.length >= MAX_FEATURES;

  const canSubmit =
    !!role &&
    sports.length >= 1 &&
    !!region &&
    !!groupType &&
    features.length >= 1 &&
    !!wouldPay &&
    (!showPrice || !!priceChoice) &&
    !tooShort &&
    !submitting;

  const reset = () => {
    setRole('');
    setSports([]);
    setRegion('');
    setGroupType('');
    setPlayersPerSession('');
    setFeatures([]);
    setFeatureOther('');
    setWouldPay('');
    setPriceChoice('');
    setMessage('');
    setName('');
    setEmail('');
    setIsAnonymous(false);
    setWebsite('');
  };

  const toggleSport = (value: string) => {
    setSports((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const toggleFeature = (value: string) => {
    setFeatures((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  };

  const handleWouldPayChange = (value: string) => {
    setWouldPay(value);
    if (value === 'no') setPriceChoice('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Bots fill the hidden field: pretend success, send nothing
    if (website) {
      reset();
      onClose();
      return;
    }

    if (!supabase) {
      enqueueSnackbar('Feedback is unavailable right now. Please email instead.', { variant: 'error' });
      return;
    }

    // The form keeps what was typed so nothing is lost while offline
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      enqueueSnackbar("You're offline. Please try again when you're connected.", { variant: 'warning' });
      return;
    }

    const cleanEmail = email.trim();

    setSubmitting(true);
    let error: unknown = null;
    try {
      ({ error } = await supabase.from('feedback').insert({
      role,
      survey_version: SURVEY_VERSION,
      sports,
      region,
      group_type: groupType,
      players_per_session: playersPerSession || null,
      top_features: features,
      feature_other: features.includes('other') ? featureOther.trim() || null : null,
      would_pay: wouldPay,
      price_choice: showPrice ? priceChoice : null,
      message: trimmed || null,
      name: name.trim() || null,
      email: cleanEmail || null,
      wants_early_access: cleanEmail.length > 0,
      is_anonymous: isAnonymous,
      }));
    } catch (e) {
      error = e;
    }
    setSubmitting(false);

    if (error) {
      enqueueSnackbar('Could not send feedback. Please check your connection and try again.', { variant: 'error' });
      return;
    }

    enqueueSnackbar('Thank you! Your feedback was sent.', { variant: 'success' });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>Share your feedback</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            About your group
          </Typography>

          <FormControl required>
            <FormLabel>What is your role in your badminton group?</FormLabel>
            <RadioGroup value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <FormControlLabel key={r.value} value={r.value} control={<Radio size="small" />} label={r.label} />
              ))}
            </RadioGroup>
          </FormControl>

          <FormControl required>
            <FormLabel>What sport do you use Queue Maestro for?</FormLabel>
            <FormGroup>
              {SPORTS.map((s) => (
                <FormControlLabel
                  key={s.value}
                  control={
                    <Checkbox size="small" checked={sports.includes(s.value)} onChange={() => toggleSport(s.value)} />
                  }
                  label={s.label}
                />
              ))}
            </FormGroup>
          </FormControl>

          <TextField
            select
            required
            label="Where is your group based?"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            size="small"
          >
            {REGIONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            required
            label="Who mostly plays in your group?"
            value={groupType}
            onChange={(e) => setGroupType(e.target.value)}
            size="small"
          >
            {GROUP_TYPES.map((g) => (
              <MenuItem key={g.value} value={g.value}>
                {g.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Players per session (optional)"
            value={playersPerSession}
            onChange={(e) => setPlayersPerSession(e.target.value)}
            size="small"
          >
            {PLAYERS_PER_SESSION.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
            About the app
          </Typography>

          <FormControl required>
            <FormLabel>Which would be most valuable to your group? (pick up to {MAX_FEATURES})</FormLabel>
            <FormGroup>
              {FEATURES.map((f) => {
                const checked = features.includes(f.value);
                return (
                  <FormControlLabel
                    key={f.value}
                    control={
                      <Checkbox
                        size="small"
                        checked={checked}
                        disabled={!checked && atFeatureLimit}
                        onChange={() => toggleFeature(f.value)}
                      />
                    }
                    label={f.label}
                  />
                );
              })}
            </FormGroup>
            {atFeatureLimit && <FormHelperText>You can pick up to {MAX_FEATURES}.</FormHelperText>}
            {features.includes('other') && (
              <TextField
                label="What else?"
                value={featureOther}
                onChange={(e) => setFeatureOther(e.target.value.slice(0, 200))}
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </FormControl>

          <FormControl required>
            <FormLabel>Would your group consider a paid plan for these features?</FormLabel>
            <RadioGroup row value={wouldPay} onChange={(e) => handleWouldPayChange(e.target.value)}>
              {WOULD_PAY.map((w) => (
                <FormControlLabel key={w.value} value={w.value} control={<Radio size="small" />} label={w.label} />
              ))}
            </RadioGroup>
          </FormControl>

          {showPrice && (
            <TextField
              select
              required
              label="Monthly price that feels reasonable for your whole group (all branches)"
              value={priceChoice}
              onChange={(e) => setPriceChoice(e.target.value)}
              size="small"
            >
              {PRICES.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Comments, ideas or bugs (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
            multiline
            minRows={3}
            error={tooShort}
            helperText={
              tooShort
                ? `Please write at least ${MIN_MESSAGE} characters (${MIN_MESSAGE - trimmed.length} more to go), or leave this empty`
                : trimmed.length > 0
                ? `${trimmed.length}/${MAX_MESSAGE}`
                : ' '
            }
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              size="small"
            />
            <TextField
              label="Email for early access (optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 200))}
              size="small"
              helperText="Add your email to be notified when paid features launch."
            />
            <FormControlLabel
              control={<Checkbox checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />}
              label="Keep me anonymous"
            />
          </Box>

          {/* Honeypot field: hidden from people, visible to bots */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          />

          <Typography variant="caption" color="text.secondary">
            Anonymous submissions are never shown publicly.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Sending...' : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackModal;
