export interface DomainException { kind: 'exact' | 'suffix'; domain: string; mode: 'direct' | 'proxy' }
export interface ManagedDomainException extends DomainException { target?: string }
export interface DomainExceptionRequest { applicationId: string; revision: string; exceptions: DomainException[] }
