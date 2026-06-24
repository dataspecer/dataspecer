import { PrismaClient } from "@prisma/client";

export interface OperationInput {
    /**
     * Id of the model this operation is applied to.
     */
    modelId: string;

    /**
     * The operation itself. Not interpreted by the backend, stored as JSON.
     */
    operation: unknown;
}

export interface TransactionInput {
    operations: OperationInput[];
}

/**
 * Manages persistence of transactions and the operations they contain.
 *
 * This is a temporary, simplified storage of operations alongside the full
 * model snapshots already stored by {@link ResourceModel} - it is not used to
 * reconstruct the state of a model.
 */
export class TransactionModel {
    private readonly prismaClient: PrismaClient;

    constructor(prismaClient: PrismaClient) {
        this.prismaClient = prismaClient;
    }

    /**
     * Creates the given transactions (in order) for the project identified by
     * its resource IRI, chaining each one to the previous transaction in the
     * array, and the first one to the project's current latest transaction
     * (if any).
     */
    async createTransactions(projectIri: string, transactions: TransactionInput[]): Promise<void> {
        const project = await this.prismaClient.resource.findFirst({ select: { id: true }, where: { iri: projectIri } });
        if (project === null) {
            throw new Error("Project resource not found.");
        }

        let parentId = (await this.prismaClient.transaction.findFirst({
            select: { id: true },
            where: { projectId: project.id },
            orderBy: { id: "desc" },
        }))?.id ?? null;

        for (const transaction of transactions) {
            const created = await this.prismaClient.transaction.create({
                data: {
                    projectId: project.id,
                    parents: parentId === null ? undefined : { create: [{ parentTransactionId: parentId }] },
                    operations: {
                        create: transaction.operations.map((operation, order) => ({
                            projectId: project.id,
                            order,
                            modelId: operation.modelId,
                            data: JSON.stringify(operation.operation),
                        })),
                    },
                },
            });
            parentId = created.id;
        }
    }
}
