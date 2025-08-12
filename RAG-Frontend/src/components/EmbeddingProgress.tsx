import { Box, Typography, LinearProgress } from '@mui/material';

interface EmbeddingProgressProps {
  progress: number;
}

const EmbeddingProgress = ({ progress }: EmbeddingProgressProps) => {
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        gap: 2,
      }}
    >
      <Typography variant="h5" gutterBottom>
        Processing Documents
      </Typography>
      <Box sx={{ width: '80%', maxWidth: 400 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: 'background.paper',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
            },
          }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {progress}% Complete
      </Typography>
    </Box>
  );
};

export default EmbeddingProgress; 