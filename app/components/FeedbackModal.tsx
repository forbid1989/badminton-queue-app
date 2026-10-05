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

const SESSIONS_PER_WEEK = [
  { value: 'less_than_1', label: 'Less than once a week' },
  { value: '1', label: 'Once a week' },
  { value: '2_3', label: '2-3 times a week' },
  { value: '4_plus', label: '4 or more times a week' },
];

const FEATURES = [
  { value: 'auto_queue', label: 'Auto-queueing' },
  { value: 'leaderboard', label: 'Leaderboards' },
  { value: 'mmr', label: 'MMR / skill rankings' },
  { value: 'win_stats', label: 'Win/loss stats and win rate' },
  { value: 'live_session', label: 'Live session view (players see the queue and their turn on their phone)' },
  { value: 'match_history', label: 'Player match history (your own and other players’)' },
  { value: 'match_request', label: 'Match requests (players request a game with specific people)' },
  { value: 'other', label: 'Other' },
];

const WOULD_PAY = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
];

const PRICES = [
  { value: 'under_100', label: 'Under ₱100' },
  { value: '100', label: '₱100' },
  { value: '150', label: '₱150' },
  { value: '250', label: '₱250' },
  { value: '400', label: '₱400' },
  { value: 'over_400', label: 'More than ₱400' },
];

const MAX_FEATURES = 3;
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 2000;

const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [role, setRole] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [sessionsPerWeek, setSessionsPerWeek] = useState('');
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
    features.length >= 1 &&
    !!wouldPay &&
    (!showPrice || !!priceChoice) &&
    !tooShort &&
    !submitting;

  const reset = () => {
    setRole('');
    setSports([]);
    setSessionsPerWeek('');
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
      sports,
      sessions_per_week: sessionsPerWeek || null,
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

          <FormControl>
            <FormLabel>How often does your group play? (optional)</FormLabel>
            <RadioGroup value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(e.target.value)}>
              {SESSIONS_PER_WEEK.map((s) => (
                <FormControlLabel key={s.value} value={s.value} control={<Radio size="small" />} label={s.label} />
              ))}
            </RadioGroup>
          </FormControl>

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
              label="Monthly price per group that feels reasonable"
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
