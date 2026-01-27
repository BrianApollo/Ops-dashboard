/**
 * Reusable video UI components.
 * Role-agnostic - permissions injected via props.
 */

export { VideoNameCell } from './VideoNameCell';

export { VideoTable } from './VideoTable';
export type { VideoTableColumn, VideoTableProps } from './VideoTable';

export {
  defaultVideoColumns,
  getColumnsWithoutProduct,
  getColumnsWithoutEditor,
} from './videoTableColumns';
