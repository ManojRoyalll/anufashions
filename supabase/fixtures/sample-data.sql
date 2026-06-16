-- Optional SQL sample inserts for reporting demos
-- Most sample data is provided through Prisma seed: apps/api/prisma/seed.ts

INSERT INTO "Expense" (id, date, type, amount, description, "createdAt", "updatedAt")
VALUES
('exp-1', NOW(), 'RENT', 25000, 'Monthly shop rent', NOW(), NOW()),
('exp-2', NOW(), 'ELECTRICITY', 3500, 'Electricity bill', NOW(), NOW()),
('exp-3', NOW(), 'MARKETING', 5000, 'Local festive campaign', NOW(), NOW());
