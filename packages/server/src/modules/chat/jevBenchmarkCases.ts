import { jevSyntheticCases } from './jevSyntheticCases';
import { jevDarijaCases } from './jevDarijaCases';

/** Fixed server catalog; client text cannot create or alter an experiment case. */
export const jevBenchmarkCases = [...jevSyntheticCases, ...jevDarijaCases];
