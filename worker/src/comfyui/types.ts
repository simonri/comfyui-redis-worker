export interface QueuePromptResponse {
  prompt_id: string;
  number: number;
  node_errors: { [key: string]: any };
}

export interface HistoryResponse {
  [key: string]: HistoryEntry;
}

export interface HistoryEntry {
  prompt: PromptData;
  outputs: OutputData;
  status: StatusData;
}

export interface NodeData {
  [key: string]: {
    inputs: { [key: string]: any };
    class_type: string;
    _meta: { title: string };
  };
}

export interface MetadataData {
  [key: string]: any;
}

export interface PromptData {
  [index: number]: number | string | NodeData | MetadataData;
}

export interface StatusData {
  status_str: string;
  completed: boolean;
  messages: [string, { [key: string]: any }][];
}

export interface ImageInfo {
  filename: string;
  subfolder: string;
  type: string;
}

export interface OutputData {
  [key: string]: {
    width?: number[];
    height?: number[];
    ratio?: number[];
    images?: ImageInfo[];
  };
}
