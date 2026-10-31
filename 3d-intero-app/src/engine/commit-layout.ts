import { useStore } from '../store';
import type { WizardInput } from '../types';
import { generateLayout } from './layout-generator';

export function commitGeneratedLayout(input: WizardInput, ceilingCm?: number | null): number {
  const st = useStore.getState();
  const out = generateLayout(input, st.settings);
  st.newProject(st.projectName);
  st.setWalls(out.walls);
  st.setCountertop({ type: out.countertop });
  st.addItems(out.items);
  if (ceilingCm && ceilingCm >= 180 && ceilingCm <= 320) useStore.getState().setGlobalHeight(ceilingCm * 10);
  useStore.setState({ past: [], future: [] });
  useStore.getState().ui({ showWizard: false, resetViewRequest: useStore.getState().resetViewRequest + 1, viewMode: 'perspective' });
  return out.items.length;
}
