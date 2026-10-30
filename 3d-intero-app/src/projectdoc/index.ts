export { applyCommand, type ApplyResult } from './apply';
export { fromProjectData, toProjectData } from './adapter';
export { commandSchema, type Command } from './commands';
export { isProjectDocV1Enabled, PROJECTDOC_V1_FLAG } from './flag';
export { checkInvariants } from './invariants';
export {
  allocateItemId,
  createEmptyProjectDoc,
  deserializeProjectDoc,
  parseProjectDoc,
  SCHEMA_VERSION,
  serializeProjectDoc,
  wallBottomCm,
  wallHeightCm,
  type ProjectDoc,
  type ProjectItem,
} from './schema';
