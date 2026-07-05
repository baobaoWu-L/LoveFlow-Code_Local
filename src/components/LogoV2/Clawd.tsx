import * as React from 'react';
import { Box, Text } from '@anthropic/ink';
import { readFileSync } from 'fs';
import { join } from 'path';
import { distRoot } from '../../utils/distRoot.js';

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right';
type Props = { pose?: ClawdPose };

// 从项目根目录读取 ascii_art.txt
const projectRoot = join(distRoot, '..');
const artPath = join(projectRoot, 'images', 'ascii_art.txt');

let LOVE_ART: string[];
try {
  const text = readFileSync(artPath, 'utf-8');
  LOVE_ART = text
    .split('\n')
    .map(l => l.trimEnd())
    .filter(l => l.length > 0);
} catch {
  LOVE_ART = ['  __  ', ' /\\ \\ ', ' \\_\\/ ', 'LoveFlowCode'];
}

export function Clawd(_props: Props = {}): React.ReactNode {
  return <Text color="clawd_body">{LOVE_ART.join('\n')}</Text>;
}
