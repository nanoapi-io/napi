import { Worker } from 'worker_threads';

// We want to simulate a long running operation which uses CPU.
// So here is an implementation of a Fibonacci sequence calculator with inefficiencies.
// It will be called from the generate-report endpoint to simulate a big report.
export async function calculateHighFibonacci(number: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./dist/fibonacci/fibonacci.worker.js');
    worker.postMessage(number);

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}