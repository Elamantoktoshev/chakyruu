-- Simbank joins MBank as a way to pay (O!Деньги and Элсом are no longer offered, values kept for old rows).
ALTER TYPE "PaymentProvider" ADD VALUE 'SIMBANK' AFTER 'MBANK';
