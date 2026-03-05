// src/domain/events/BankEvents.ts
export type EventType = 'AccountCreated' | 'MoneyDeposited' | 'MoneyWithdrawn' | 'AccountClosed';

export interface BaseEvent {
    aggregateId: string;
    aggregateType: string;
    type: EventType;
    data: any;
    eventNumber: number;
    globalSequence?: number;
    version?: number;
    timestamp?: Date;
}

export interface AccountCreatedEvent extends BaseEvent {
    type: 'AccountCreated';
    data: {
        accountId: string;
        initialBalance: number;
        ownerName: string;
        currency: string;
    };
}

export interface MoneyDepositedEvent extends BaseEvent {
    type: 'MoneyDeposited';
    data: {
        amount: number;
        transactionId: string;
        description: string;
    };
}

export interface MoneyWithdrawnEvent extends BaseEvent {
    type: 'MoneyWithdrawn';
    data: {
        amount: number;
        transactionId: string;
        description: string;
    };
}

export interface AccountClosedEvent extends BaseEvent {
    type: 'AccountClosed';
    data: {
        reason: string;
    };
}

export type BankEvent = AccountCreatedEvent | MoneyDepositedEvent | MoneyWithdrawnEvent | AccountClosedEvent;
