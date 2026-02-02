import * as fs from 'fs';
import * as path from 'path';
import { LedgerEntry } from './types.js';

const LEDGER_FILE = path.join(process.env.HOME || '.', '.gitease-ledger.json');

/**
 * Get the undo ledger
 */
export function getLedger(): LedgerEntry[] {
  try {
    if (fs.existsSync(LEDGER_FILE)) {
      const data = fs.readFileSync(LEDGER_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read ledger:', error);
  }
  return [];
}

/**
 * Add an entry to the ledger
 */
export function addLedgerEntry(entry: Omit<LedgerEntry, 'id' | 'timestamp'>): void {
  try {
    const ledger = getLedger();
    const newEntry: LedgerEntry = {
      ...entry,
      id: `${Date.now()}`,
      timestamp: new Date(),
    };
    ledger.push(newEntry);
    saveLedger(ledger);
  } catch (error) {
    console.error('Failed to add ledger entry:', error);
  }
}

/**
 * Get the last executed command
 */
export function getLastCommand(): LedgerEntry | null {
  const ledger = getLedger();
  return ledger[ledger.length - 1] || null;
}

/**
 * Save the ledger to disk
 */
function saveLedger(ledger: LedgerEntry[]): void {
  try {
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save ledger:', error);
  }
}
