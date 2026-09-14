'use strict';

const readline = require('node:readline');

const INITIAL_BALANCE_CENTS = 100000;

function createDataProgram(initialBalanceCents = INITIAL_BALANCE_CENTS) {
  let storedBalanceCents = initialBalanceCents;

  return {
    read() {
      return storedBalanceCents;
    },
    write(balanceCents) {
      storedBalanceCents = balanceCents;
    },
    execute(operation, balanceCents) {
      if (operation === 'READ') {
        return this.read();
      }

      if (operation === 'WRITE') {
        this.write(balanceCents);
      }

      return balanceCents;
    },
  };
}

function formatBalance(balanceCents) {
  return (balanceCents / 100).toFixed(2);
}

function parseAmount(amount) {
  const normalizedAmount = String(amount).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount)) {
    return null;
  }

  const [wholeUnits, fractionalUnits = ''] = normalizedAmount.split('.');
  return Number(wholeUnits) * 100 + Number(fractionalUnits.padEnd(2, '0'));
}

function createOperations(dataProgram, prompt) {
  return async function execute(operation) {
    if (operation === 'TOTAL') {
      const balanceCents = dataProgram.execute('READ');
      prompt(`Current balance: ${formatBalance(balanceCents)}`);
      return;
    }

    if (operation !== 'CREDIT' && operation !== 'DEBIT') {
      return;
    }

    const operationName = operation === 'CREDIT' ? 'credit' : 'debit';
    const amount = await prompt(`Enter ${operationName} amount: `, true);
    const amountCents = parseAmount(amount);
    if (amountCents === null) {
      prompt('Invalid amount, please enter a non-negative amount with up to two decimal places.');
      return;
    }

    let balanceCents = dataProgram.execute('READ');
    if (operation === 'DEBIT' && balanceCents < amountCents) {
      prompt('Insufficient funds for this debit.');
      return;
    }

    balanceCents += operation === 'CREDIT' ? amountCents : -amountCents;
    dataProgram.execute('WRITE', balanceCents);
    prompt(`Amount ${operationName}ed. New balance: ${formatBalance(balanceCents)}`);
  };
}

function createApplication(input = process.stdin, output = process.stdout) {
  const readlineInterface = readline.createInterface({ input, output });
  const inputLines = readlineInterface[Symbol.asyncIterator]();
  const dataProgram = createDataProgram();
  const print = (message) => output.write(`${message}\n`);
  const prompt = (message, waitForAnswer = false) => {
    if (waitForAnswer) {
      output.write(message);
      return inputLines.next().then(({ value, done }) => (done ? '' : value));
    }

    print(message);
  };
  const executeOperation = createOperations(dataProgram, prompt);

  async function run() {
    let continueRunning = true;

    while (continueRunning) {
      print('--------------------------------');
      print('Account Management System');
      print('1. View Balance');
      print('2. Credit Account');
      print('3. Debit Account');
      print('4. Exit');
      print('--------------------------------');
      output.write('Enter your choice (1-4): ');
      const choiceResult = await inputLines.next();
      if (choiceResult.done) {
        break;
      }
      const choice = choiceResult.value;

      switch (choice.trim()) {
        case '1':
          await executeOperation('TOTAL');
          break;
        case '2':
          await executeOperation('CREDIT');
          break;
        case '3':
          await executeOperation('DEBIT');
          break;
        case '4':
          continueRunning = false;
          break;
        default:
          print('Invalid choice, please select 1-4.');
      }
    }

    print('Exiting the program. Goodbye!');
    readlineInterface.close();
  }

  return { run };
}

if (require.main === module) {
  createApplication().run();
}

module.exports = {
  INITIAL_BALANCE_CENTS,
  createDataProgram,
  createOperations,
  formatBalance,
  parseAmount,
};