import { Prisma, type PrismaClient } from "@prisma/client";

export interface Reward {
  itemId: string;
  quantity: number;
}

export type RewardResult =
  | {
      status: "granted";
      itemId: string;
      quantity: number;
      total: number;
    }
  | { status: "already_claimed" | "inventory_full" };

export interface InteractionStore {
  claim(
    accountId: string,
    interactionId: string,
    reward: Reward,
  ): Promise<RewardResult>;
}

const INVENTORY_SLOTS = 20;
const MAX_STACK = 99;

export function canAddReward(
  existingQuantity: number | null,
  slotsUsed: number,
  rewardQuantity: number,
): boolean {
  return (
    rewardQuantity > 0 &&
    (existingQuantity === null
      ? slotsUsed < INVENTORY_SLOTS && rewardQuantity <= MAX_STACK
      : existingQuantity + rewardQuantity <= MAX_STACK)
  );
}

export class PrismaInteractionStore implements InteractionStore {
  constructor(private readonly prisma: PrismaClient) {}

  async claim(
    accountId: string,
    interactionId: string,
    reward: Reward,
  ): Promise<RewardResult> {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const claimed = await transaction.interactionClaim.findUnique({
            where: {
              accountId_interactionId: { accountId, interactionId },
            },
          });
          if (claimed) return { status: "already_claimed" };

          const stack = await transaction.inventoryStack.findUnique({
            where: {
              accountId_itemId: { accountId, itemId: reward.itemId },
            },
          });
          const slotsUsed = stack
            ? 0
            : await transaction.inventoryStack.count({
                where: { accountId },
              });
          if (
            !canAddReward(stack?.quantity ?? null, slotsUsed, reward.quantity)
          ) {
            return { status: "inventory_full" };
          }

          await transaction.interactionClaim.create({
            data: { accountId, interactionId },
          });
          const inventory = await transaction.inventoryStack.upsert({
            where: {
              accountId_itemId: { accountId, itemId: reward.itemId },
            },
            create: {
              accountId,
              itemId: reward.itemId,
              quantity: reward.quantity,
            },
            update: { quantity: { increment: reward.quantity } },
          });
          return {
            status: "granted",
            itemId: reward.itemId,
            quantity: reward.quantity,
            total: inventory.quantity,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        const claimed = await this.prisma.interactionClaim.findUnique({
          where: { accountId_interactionId: { accountId, interactionId } },
        });
        if (claimed) return { status: "already_claimed" };
      }
      throw error;
    }
  }
}
