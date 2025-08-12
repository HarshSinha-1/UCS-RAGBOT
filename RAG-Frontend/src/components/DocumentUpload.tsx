import { Box, Typography, Paper, Modal, IconButton, CircularProgress } from '@mui/material';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import CloseIcon from '@mui/icons-material/Close';

interface DocumentUploadProps {
  onUploadComplete: () => void;
  onClose?: () => void;
}

const DocumentUpload = ({ onUploadComplete, onClose }: DocumentUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      console.log('Upload result:', result);
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const content = (
    <Paper
      {...getRootProps()}
      sx={{
        p: 4,
        width: '80%',
        maxWidth: 600,
        textAlign: 'center',
        cursor: isUploading ? 'default' : 'pointer',
        bgcolor: 'background.paper',
        position: 'relative',
        '&:hover': {
          bgcolor: isUploading ? 'background.paper' : 'action.hover',
        },
      }}
    >
      {onClose && (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
          disabled={isUploading}
        >
          <CloseIcon />
        </IconButton>
      )}
      <input {...getInputProps()} disabled={isUploading} />
      {isUploading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography variant="h6">Uploading files...</Typography>
        </Box>
      ) : (
        <>
          <Typography variant="h5" gutterBottom>
            {isDragActive
              ? 'Drop the files here...'
              : 'Drag and drop your documents here, or click to select files'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supported formats: PDF, DOC, DOCX
          </Typography>
        </>
      )}
    </Paper>
  );

  if (onClose) {
    return (
      <Modal
        open={true}
        onClose={onClose}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content}
      </Modal>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      {content}
    </Box>
  );
};

export default DocumentUpload; 