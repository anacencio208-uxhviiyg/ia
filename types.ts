export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface MissionStat {
  label: string;
  value: string;
  unit?: string;
  status: 'nominal' | 'warning' | 'critical';
}

export interface CrewMember {
  name: string;
  role: string;
  status: string;
}