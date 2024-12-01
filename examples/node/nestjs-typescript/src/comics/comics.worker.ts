import {parentPort} from 'worker_threads';

const fib = (n: number) => {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
};

parentPort.on('message', (number) => {
  const result = fib(number);
  parentPort.postMessage(result);
});