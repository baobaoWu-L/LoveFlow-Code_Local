import React from 'react';
import { Box, Text } from '@anthropic/ink';
import { readFileSync } from 'fs';
import { join } from 'path';
import { distRoot } from '../../utils/distRoot.js';

const projectRoot = join(distRoot, '..');
const artPath = join(projectRoot, 'images', 'ascii_art.txt');

let LOVE_ART: string[];
try {
  const text = readFileSync(artPath, 'utf-8');
  LOVE_ART = text.split('\n').filter(l => l.trim().length > 0);
} catch {
  LOVE_ART = ['LoveFlowCode'];
}

export function WelcomeV2(): React.ReactNode {
  const version = MACRO.VERSION;
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="claude" paddingX={1} paddingY={1}>
      <Box flexDirection="column" alignItems="center">
        <Text color="clawd_body">{LOVE_ART.join('\n')}</Text>
        <Box marginTop={1}>
          <Text>
            <Text color="claude">Welcome to LoveFlowCode </Text>
            <Text dimColor>v{version}</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
