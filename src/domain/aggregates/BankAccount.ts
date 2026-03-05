// src/domain/aggregates/BankAccount.ts
import { BankEvent, AccountCreatedEvent, MoneyDepositedEvent, MoneyWithdrawnEvent, AccountClosedEvent } from '../events/BankEvents';

export interface BankAccountState {
    accountId: string;
    balance: number;
    status: 'OPEN' | 'CLOSED';
    version: number;
}

export class BankAccount {
    private state: BankAccountState = {
        accountId: '',
        balance: 0,
        status: 'OPEN',
        version: 0
    };

    constructor(accountId?: string) {
        if (accountId) {
            this.state.accountId = accountId;
        }
    }

    getState(): BankAccountState {
        return { ...this.state };
    }

    apply(event: BankEvent) {
        switch (event.type) {
            case 'AccountCreated':
                this.state.accountId = event.data.accountId;
                this.state.balance = event.data.initialBalance;
                this.state.status = 'OPEN';
                break;
            case 'MoneyDeposited':
                this.state.balance += event.data.amount;
                break;
            case 'MoneyWithdrawn':
                this.state.balance -= event.data.amount;
                break;
            case 'AccountClosed':
                this.state.status = 'CLOSED';
                break;
        }
        this.state.version = event.eventNumber;
    }

    static fromEvents(events: BankEvent[]): BankAccount {
        const account = new BankAccount();
        events.forEach(event => account.apply(event));
        return account;
    }

    static fromSnapshot(snapshot: BankAccountState, events: BankEvent[]): BankAccount {
        const account = new BankAccount();
        account.state = { ...snapshot };
        events.forEach(event => account.apply(event));
        return account;
    }

    // Business Logic Validations
    validateDeposit(amount: number) {
        if (this.state.status === 'CLOSED') throw new Error('Account is closed');
        if (amount <= 0) throw new Error('Deposit amount must be positive');
    }

    validateWithdrawal(amount: number) {
        if (this.state.status === 'CLOSED') throw new Error('Account is closed');
        if (amount <= 0) throw new Error('Withdrawal amount must be positive');
        if (this.state.balance < amount) throw new Error('Insufficient funds');
    }

    validateClose() {
        if (this.state.status === 'CLOSED') throw new Error('Account is already closed');
        if (this.state.balance !== 0) throw new Error('Account balance must be zero to close');
    }
}
