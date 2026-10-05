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
  FormControlLabel,
  Typography,
  Box,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { supabase } from '../lib/supabase';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'feature', label: 'Feature idea' },
  { value: 'bug', label: 'Bug / problem' },
  { value: 'pricing', label: 'Pricing feedback' },
  { value: 'other', label: 'Other' },
];

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [category, setCategory] = useState('feature');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot, real users never fill this
  const [submitting, setSubmitting] = useState(false);

  const trimmed = message.trim();
  const canSubmit = trimmed.length >= MIN_LENGTH && !submitting;
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LENGTH;

  const reset = () => {
    setCategory('feature');
    setMessage('');
    setName('');
    setEmail('');
    setIsAnonymous(false);
    setWebsite('');
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

    setSubmitting(true);
    const { error } = await supabase.from('feedback').insert({
      category,
      message: trimmed,
      name: name.trim() || null,
      email: email.trim() || null,
      is_anonymous: isAnonymous,
    });
    setSubmitting(false);

    if (error) {
      enqueueSnackbar('Could not send feedback. Please try again.', { variant: 'error' });
      return;
    }

    enqueueSnackbar('Thank you! Your feedback was sent.', { variant: 'success' });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Share your feedback</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            size="small"
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Your message"
            placeholder="Features you'd like, problems you found, or what you'd pay for them"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
            multiline
            minRows={4}
            required
            error={tooShort}
            helperText={
              tooShort
                ? `Please write at least ${MIN_LENGTH} characters (${MIN_LENGTH - trimmed.length} more to go)`
                : `${trimmed.length}/${MAX_LENGTH}`
            }
          />

          <TextField
            label="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            size="small"
          />
          <TextField
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 200))}
            size="small"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
            }
            label="Keep me anonymous"
          />

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
      <DialogActions sx={{ px: 3, pb: 2 }}>
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
