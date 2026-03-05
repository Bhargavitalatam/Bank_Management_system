// src/application/commands/BankCommandHandler.ts
import { EventStore } from '../../infrastructure/EventStore';
import { AccountProjector } from '../projectors/AccountProjector';
import { BankAccount } from '../../domain/aggregates/BankAccount';
import { BankEvent } from '../../domain/events/BankEvents';

export class BankCommandHandler {
    private eventStore = new EventStore();
    private projector = new AccountProjector();

    private async getAggregate(accountId: string): Promise<BankAccount> {
        const snapshot = await this.eventStore.getSnapshot(accountId);
        if (snapshot) {
            const events = await this.eventStore.getEvents(accountId, snapshot.version);
            return BankAccount.fromSnapshot(snapshot.state, events);
        } else {
            const events = await this.eventStore.getEvents(accountId);
            return BankAccount.fromEvents(events);
        }
    }

    private async processEvent(event: BankEvent) {
        await this.eventStore.appendEvents([event]);
        await this.projector.project(event);

        // Check if snapshotting is needed (every 50 events, triggered on the 51st, 101st, etc.)
        if (event.eventNumber % 50 === 1 && event.eventNumber > 1) {
            const aggregate = await this.getAggregate(event.aggregateId);
            await this.eventStore.saveSnapshot(event.aggregateId, aggregate.getState(), event.eventNumber);
        }
    }

    async createAccount(accountId: string, ownerName: string, initialBalance: number, currency: string = 'USD') {
        const events = await this.eventStore.getEvents(accountId);
        if (events.length > 0) throw new Error('Account already exists');

        const event: BankEvent = {
            aggregateId: accountId,
            aggregateType: 'BankAccount',
            type: 'AccountCreated',
            eventNumber: 1,
            version: 1,
            data: { accountId, ownerName, initialBalance, currency }
        };

        await this.processEvent(event);
    }

    async depositMoney(accountId: string, amount: number, transactionId: string, description: string = 'Deposit') {
        const aggregate = await this.getAggregate(accountId);
        if (aggregate.getState().accountId === '') throw new Error('Account not found');

        aggregate.validateDeposit(amount);

        const event: BankEvent = {
            aggregateId: accountId,
            aggregateType: 'BankAccount',
            type: 'MoneyDeposited',
            eventNumber: aggregate.getState().version + 1,
            version: 1,
            data: { amount, transactionId, description }
        };

        await this.processEvent(event);
    }

    async withdrawMoney(accountId: string, amount: number, transactionId: string, description: string = 'Withdrawal') {
        const aggregate = await this.getAggregate(accountId);
        if (aggregate.getState().accountId === '') throw new Error('Account not found');

        aggregate.validateWithdrawal(amount);

        const event: BankEvent = {
            aggregateId: accountId,
            aggregateType: 'BankAccount',
            type: 'MoneyWithdrawn',
            eventNumber: aggregate.getState().version + 1,
            version: 1,
            data: { amount, transactionId, description }
        };

        await this.processEvent(event);
    }

    async closeAccount(accountId: string, reason: string) {
        const aggregate = await this.getAggregate(accountId);
        if (aggregate.getState().accountId === '') throw new Error('Account not found');

        aggregate.validateClose();

        const event: BankEvent = {
            aggregateId: accountId,
            aggregateType: 'BankAccount',
            type: 'AccountClosed',
            eventNumber: aggregate.getState().version + 1,
            version: 1,
            data: { reason }
        };

        await this.processEvent(event);
    }
}
