// src/components/PDDTestComponent.tsx
// Simple test component to verify PDD is working correctly
// You can temporarily add this to your Dashboard to test

import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

const PDDTestComponent: React.FC = () => {
  const [dropZoneContent, setDropZoneContent] = useState<string>('Drop here');
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  
  const draggableRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Setup draggable
  useEffect(() => {
    const element = draggableRef.current;
    if (!element) return;

    return draggable({
      element,
      getInitialData: () => ({
        type: 'test-item',
        message: 'Hello from PDD!'
      }),
      onDragStart: () => {
        setIsDragging(true);
        console.log('🚀 Test drag started');
      },
      onDrop: () => {
        setIsDragging(false);
        console.log('✅ Test drag ended');
      }
    });
  }, []);

  // Setup drop zone
  useEffect(() => {
    const element = dropZoneRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => source.data.type === 'test-item',
      onDragEnter: () => {
        setIsOver(true);
        console.log('📥 Entered drop zone');
      },
      onDragLeave: () => {
        setIsOver(false);
        console.log('📤 Left drop zone');
      },
      onDrop: ({ source }) => {
        setIsOver(false);
        const message = source.data.message as string;
        setDropZoneContent(`Dropped: ${message}`);
        console.log('💯 Dropped successfully!', message);
      }
    });
  }, []);

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        PDD Test - Drag the blue box to the drop zone
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {/* Draggable Item */}
        <Paper
          ref={draggableRef}
          sx={{
            width: 100,
            height: 100,
            backgroundColor: isDragging ? '#1976d2' : '#2196f3',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            opacity: isDragging ? 0.5 : 1,
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }}
        >
          <Typography>Drag me!</Typography>
        </Paper>

        {/* Drop Zone */}
        <Paper
          ref={dropZoneRef}
          sx={{
            width: 200,
            height: 100,
            backgroundColor: isOver ? '#c8e6c9' : '#f5f5f5',
            border: `2px dashed ${isOver ? '#4caf50' : '#ccc'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          <Typography>{dropZoneContent}</Typography>
        </Paper>
      </Box>

      <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
        If this works, PDD is correctly installed and functioning!
      </Typography>
    </Box>
  );
};

export default PDDTestComponent;