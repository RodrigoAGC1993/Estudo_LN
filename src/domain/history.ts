/**
 * Domain Types — History Presentation
 *
 * Read-only view of visited nodes and confirmed choices for the history panel.
 * Never exposes future nodes, state values, or alternative endings.
 */

export interface HistoryPresentation {
  entries: HistoryEntry[];
  currentPosition: CurrentHistoryPosition;
}

export interface HistoryEntry {
  nodeId: string;
  title?: string;
  narrativeTime?: string;
  choiceLabel?: string;
  sequence?: number;
}

export interface CurrentHistoryPosition {
  nodeId: string;
  title?: string;
  narrativeTime?: string;
  status: 'in_progress' | 'completed';
}
