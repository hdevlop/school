import { envChoice } from '../../../config/env';
import { chatBenchmarkControlsEnabled } from './ChatBenchmarkState';
import { isLocalJevFixtureDatabase } from '../jev/JevControls';
import { schoolJevRequestContext } from '../jev/JevRequestContext';

export const JEV_EXPERIMENT_ARMS = ['120b-baseline', '20b-coreweave-off', '20b-coreweave-parallel', '20b-coreweave-first', '20b-coreweave-router-first'] as const;
export type JevExperimentArm = typeof JEV_EXPERIMENT_ARMS[number];

export function jevExperimentEnabled() {
  return chatBenchmarkControlsEnabled() && isLocalJevFixtureDatabase()
    && envChoice('CHATBOT_JEV_EXPERIMENT', process.env.CHATBOT_JEV_EXPERIMENT, ['none', 'coreweave-first'], 'none') === 'coreweave-first';
}
export function jevExperimentArm() {
  return jevExperimentEnabled() ? schoolJevRequestContext.getStore()?.experimentArm : undefined;
}
