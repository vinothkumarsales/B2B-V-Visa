export type ConnectionProviderId = 'mail' | 'linkedin';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'limited' | 'error' | 'revoked';

export type ConnectionStatusSummary = {
  id: ConnectionProviderId;
  name: string;
  description: string;
  status: ConnectionStatus;
  connected: boolean;
  lastSync?: string | null;
  meta?: {
    handle?: string;
    headline?: string;
    missingScopes?: string[];
  };
};

export type CreateConnectionBody = {
  provider: ConnectionProviderId;
};

export type ConnectionHealth = {
  healthy: boolean;
  provider: ConnectionProviderId;
};
