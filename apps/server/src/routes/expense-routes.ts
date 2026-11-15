import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork, TenantContext, Expense, ExpenseCategory } from '@vyapaarkhata/domain';
import { randomUUID } from 'node:crypto';

export interface ExpenseRoutesOptions {
  uow: UnitOfWork;
}

export const expenseRoutes: FastifyPluginAsync<ExpenseRoutesOptions> = async (app, opts) => {
  function resolveTenant(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // GET /api/v1/expenses
  app.get('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const expenses = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.expenses.list(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: expenses,
      requestId: req.id,
    });
  });

  // POST /api/v1/expenses
  app.post<{ Body: Partial<Expense> }>('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};

    let catId = body.expenseCategoryId;
    const cats = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.expenses.listCategories(tenant.tenantId);
    });

    if (cats && cats.length > 0) {
      const match = cats.find((c) => c.id === catId);
      catId = match ? match.id : cats[0].id;
    } else {
      const defaultCatId = randomUUID();
      await opts.uow.runInTransaction(async (ctx) => {
        await ctx.expenses.saveCategory({
          id: defaultCatId,
          tenantId: tenant.tenantId,
          name: 'General Expenses',
          code: 'GEN-EXP',
          isActive: true,
        });
      });
      catId = defaultCatId;
    }

    const expense: Expense = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      expenseCategoryId: catId,
      expenseNumber: body.expenseNumber || `EXP-${Date.now().toString().slice(-6)}`,
      expenseDate: body.expenseDate || new Date().toISOString().slice(0, 10),
      amount: body.amount || 0,
      taxAmount: body.taxAmount || 0,
      paymentMode: body.paymentMode || 'cash',
      payee: body.payee,
      description: body.description,
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.expenses.save(expense);
    });

    return reply.status(201).send({
      success: true,
      data: expense,
      requestId: req.id,
    });
  });

  // GET /api/v1/expenses/categories
  app.get('/categories', async (req, reply) => {
    const tenant = resolveTenant(req);
    const categories = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.expenses.listCategories(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: categories,
      requestId: req.id,
    });
  });

  // POST /api/v1/expenses/categories
  app.post<{ Body: Partial<ExpenseCategory> }>('/categories', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const category: ExpenseCategory = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      name: body.name || 'Miscellaneous',
      code: body.code,
      isActive: true,
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.expenses.saveCategory(category);
    });

    return reply.status(201).send({
      success: true,
      data: category,
      requestId: req.id,
    });
  });
};
