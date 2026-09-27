import { describe, it, expect, vi } from "vitest";
import { VaultTransfer } from "./VaultTransfer";
import { ECONOMY_BALANCE } from "../../data/balance/economy";

function createVaultTransferHarness(initialPlayerGold = 1000, initialVaultGold = 500) {
  const inventory = {
    gold: initialPlayerGold,
    items: [],
    remove: vi.fn(),
    add: vi.fn(),
  };

  const accountVault = {
    gold: initialVaultGold,
    items: [],
    remove: vi.fn(),
    add: vi.fn(),
  };

  const saves = {
    markDirty: vi.fn(),
    checkpoint: vi.fn().mockResolvedValue(true),
  };

  const transfer = new VaultTransfer({
    inventory: inventory as never,
    accountVault: accountVault as never,
    saves: saves as never,
  });

  return { transfer, inventory, accountVault, saves };
}

describe("VaultTransfer", () => {
  it("NaN, Infinity, negativo, zero e fracionario sao recusados sem alterar saldos no deposito e saque", () => {
    const { transfer, inventory, accountVault, saves } = createVaultTransferHarness(1000, 500);

    const invalidInputs = [NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, -500, 0, 10.5];

    for (const val of invalidInputs) {
      const depResult = transfer.depositGold(val);
      expect(depResult).toBe(0);
      expect(inventory.gold).toBe(1000);
      expect(accountVault.gold).toBe(500);

      const withResult = transfer.withdrawGold(val);
      expect(withResult).toBe(0);
      expect(inventory.gold).toBe(1000);
      expect(accountVault.gold).toBe(500);
    }

    expect(saves.checkpoint).not.toHaveBeenCalled();
  });

  it("quantia acima do saldo do remetente e recusada sem alterar saldos", () => {
    const { transfer, inventory, accountVault, saves } = createVaultTransferHarness(200, 100);

    const depResult = transfer.depositGold(201);
    expect(depResult).toBe(0);
    expect(inventory.gold).toBe(200);
    expect(accountVault.gold).toBe(100);

    const withResult = transfer.withdrawGold(101);
    expect(withResult).toBe(0);
    expect(inventory.gold).toBe(200);
    expect(accountVault.gold).toBe(100);

    expect(saves.checkpoint).not.toHaveBeenCalled();
  });

  it("quantia que excede o goldCap no destino e recusada sem alterar saldos", () => {
    const { transfer, inventory, accountVault, saves } = createVaultTransferHarness(
      1000,
      ECONOMY_BALANCE.goldCap - 100,
    );

    const depResult = transfer.depositGold(101);
    expect(depResult).toBe(0);
    expect(inventory.gold).toBe(1000);
    expect(accountVault.gold).toBe(ECONOMY_BALANCE.goldCap - 100);

    inventory.gold = ECONOMY_BALANCE.goldCap - 50;
    accountVault.gold = 500;

    const withResult = transfer.withdrawGold(51);
    expect(withResult).toBe(0);
    expect(inventory.gold).toBe(ECONOMY_BALANCE.goldCap - 50);
    expect(accountVault.gold).toBe(500);

    expect(saves.checkpoint).not.toHaveBeenCalled();
  });

  it("transferencias validas movem ouro e disparam checkpoint", () => {
    const { transfer, inventory, accountVault, saves } = createVaultTransferHarness(1000, 500);

    const dep = transfer.depositGold(300);
    expect(dep).toBe(300);
    expect(inventory.gold).toBe(700);
    expect(accountVault.gold).toBe(800);
    expect(saves.checkpoint).toHaveBeenCalledTimes(1);

    const withRes = transfer.withdrawGold(200);
    expect(withRes).toBe(200);
    expect(inventory.gold).toBe(900);
    expect(accountVault.gold).toBe(600);
    expect(saves.checkpoint).toHaveBeenCalledTimes(2);
  });
});
