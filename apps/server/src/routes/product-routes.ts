import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork, TenantContext, Product, ProductCategory } from '@vyapaarkhata/domain';
import { randomUUID } from 'node:crypto';

export interface ProductRoutesOptions {
  uow: UnitOfWork;
}

export const productRoutes: FastifyPluginAsync<ProductRoutesOptions> = async (app, opts) => {
  function resolveTenant(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // GET /api/v1/products
  app.get<{ Querystring: { categoryId?: string } }>('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const products = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.products.list(tenant.tenantId, req.query.categoryId);
    });

    return reply.status(200).send({
      success: true,
      data: products,
      requestId: req.id,
    });
  });

  // GET /api/v1/products/categories
  app.get('/categories', async (req, reply) => {
    const tenant = resolveTenant(req);
    const categories = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.products.listCategories(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: categories,
      requestId: req.id,
    });
  });

  // POST /api/v1/products/categories
  app.post<{ Body: Partial<ProductCategory> }>('/categories', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const category: ProductCategory = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      parentId: body.parentId,
      name: body.name || 'General Category',
      code: body.code,
      description: body.description,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.products.saveCategory(category);
    });

    return reply.status(201).send({
      success: true,
      data: category,
      requestId: req.id,
    });
  });

  // GET /api/v1/products/units
  app.get('/units', async (req, reply) => {
    const units = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.products.listUnits();
    });

    return reply.status(200).send({
      success: true,
      data: units,
      requestId: req.id,
    });
  });

  // GET /api/v1/products/taxes
  app.get('/taxes', async (req, reply) => {
    const tenant = resolveTenant(req);
    const taxes = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.products.listTaxCategories(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: taxes,
      requestId: req.id,
    });
  });

  // GET /api/v1/products/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const tenant = resolveTenant(req);
    const product = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.products.findById(tenant.tenantId, req.params.id);
    });

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Product ${req.params.id} not found` },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data: product,
      requestId: req.id,
    });
  });

  // POST /api/v1/products
  app.post<{ Body: Partial<Product> }>('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const product: Product = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      name: body.name || 'New Product',
      description: body.description,
      categoryId: body.categoryId,
      productType: body.productType || 'goods',
      sku: body.sku,
      barcode: body.barcode,
      hsnSacCode: body.hsnSacCode,
      baseUnitId: body.baseUnitId || '10000000-0000-0000-0000-000000000001',
      isTaxInclusive: body.isTaxInclusive || false,
      purchasePrice: body.purchasePrice || 0,
      sellingPrice: body.sellingPrice || 0,
      mrp: body.mrp,
      reorderLevel: body.reorderLevel || 0,
      isStockTracked: body.isStockTracked !== false,
      trackingMethod: body.trackingMethod || 'none',
      valuationMethod: body.valuationMethod || 'fifo',
      isActive: body.isActive !== false,
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.products.save(product);
    });

    return reply.status(201).send({
      success: true,
      data: product,
      requestId: req.id,
    });
  });
};
