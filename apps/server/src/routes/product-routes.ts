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

  // GET /api/v1/products/categories/:id
  app.get<{ Params: { id: string } }>('/categories/:id', async (req, reply) => {
    const tenant = resolveTenant(req);
    const category = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.products.findCategoryById(tenant.tenantId, req.params.id);
    });

    if (!category) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Category ${req.params.id} not found` },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data: category,
      requestId: req.id,
    });
  });

  // POST /api/v1/products/categories
  app.post<{ Body: Partial<ProductCategory> }>('/categories', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};

    if (!body.name || !body.name.trim()) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Category name is required' },
        requestId: req.id,
      });
    }

    const category: ProductCategory = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      parentId: body.parentId,
      name: body.name.trim(),
      code: body.code ? body.code.trim() : `CAT-${body.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 16)}`,
      description: body.description ? body.description.trim() : undefined,
      isActive: body.isActive !== false,
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.products.saveCategory(category);
    });

    return reply.status(201).send({
      success: true,
      data: category,
      message: 'Category created successfully',
      requestId: req.id,
    });
  });

  // PUT /api/v1/products/categories/:id
  app.put<{ Params: { id: string }; Body: Partial<ProductCategory> }>(
    '/categories/:id',
    async (req, reply) => {
      const tenant = resolveTenant(req);
      const catId = req.params.id;
      const body = req.body || {};

      const existing = await opts.uow.runInTransaction(async (ctx) => {
        return ctx.products.findCategoryById(tenant.tenantId, catId);
      });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Category ${catId} not found` },
          requestId: req.id,
        });
      }

      const updated: ProductCategory = {
        ...existing,
        name: body.name !== undefined ? body.name.trim() : existing.name,
        code: body.code !== undefined ? body.code?.trim() : existing.code,
        description: body.description !== undefined ? body.description?.trim() : existing.description,
        parentId: body.parentId !== undefined ? body.parentId : existing.parentId,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      };

      await opts.uow.runInTransaction(async (ctx) => {
        await ctx.products.saveCategory(updated);
      });

      return reply.status(200).send({
        success: true,
        data: updated,
        message: 'Category updated successfully',
        requestId: req.id,
      });
    }
  );

  // DELETE /api/v1/products/categories/:id
  app.delete<{ Params: { id: string } }>('/categories/:id', async (req, reply) => {
    const tenant = resolveTenant(req);
    const catId = req.params.id;

    try {
      await opts.uow.runInTransaction(async (ctx) => {
        await ctx.products.deleteCategory(tenant.tenantId, catId);
      });

      return reply.status(200).send({
        success: true,
        message: 'Category deleted successfully',
        requestId: req.id,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CATEGORY_IN_USE', message: err.message || 'Cannot delete category' },
        requestId: req.id,
      });
    }
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
      nameHi: body.nameHi || (body as any).name_hi || undefined,
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

  // PUT /api/v1/products/:id
  app.put<{ Params: { id: string }; Body: Partial<Product> }>('/:id', async (req, reply) => {
    const tenant = resolveTenant(req);
    const productId = req.params.id;
    const body = req.body || {};

    const existing = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.products.findById(tenant.tenantId, productId);
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Product ${productId} not found` },
        requestId: req.id,
      });
    }

    const updated: Product = {
      ...existing,
      name: body.name !== undefined ? body.name : existing.name,
      nameHi: body.nameHi !== undefined ? body.nameHi : existing.nameHi,
      description: body.description !== undefined ? body.description : existing.description,
      categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
      productType: body.productType !== undefined ? body.productType : existing.productType,
      sku: body.sku !== undefined ? body.sku : existing.sku,
      barcode: body.barcode !== undefined ? body.barcode : existing.barcode,
      hsnSacCode: body.hsnSacCode !== undefined ? body.hsnSacCode : existing.hsnSacCode,
      baseUnitId: body.baseUnitId !== undefined ? body.baseUnitId : existing.baseUnitId,
      purchasePrice: body.purchasePrice !== undefined ? body.purchasePrice : existing.purchasePrice,
      sellingPrice: body.sellingPrice !== undefined ? body.sellingPrice : existing.sellingPrice,
      reorderLevel: body.reorderLevel !== undefined ? body.reorderLevel : existing.reorderLevel,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.products.save(updated);

      // Also update stock_balances if stock quantity is passed
      const targetStock = (body as any).totalStock !== undefined ? (body as any).totalStock : (body as any).stockOnHand;
      if (targetStock !== undefined && !isNaN(Number(targetStock)) && ctx.rawQuery) {
        const stockQty = Number(targetStock);
        let locationId = '00000000-0000-0000-0000-000000000001';
        const locRows = await ctx.rawQuery(
          `SELECT id FROM inventory_locations WHERE tenant_id = $1 ORDER BY is_default DESC LIMIT 1`,
          [tenant.tenantId]
        );
        if (locRows.length > 0) locationId = locRows[0].id;

        const varRows = await ctx.rawQuery(
          `SELECT id FROM product_variants WHERE product_id = $1 LIMIT 1`,
          [productId]
        );
        const variantId = varRows.length > 0 ? varRows[0].id : productId;

        const existingSb = await ctx.rawQuery(
          `SELECT id FROM stock_balances WHERE tenant_id = $1 AND inventory_location_id = $2 AND variant_id = $3 LIMIT 1`,
          [tenant.tenantId, locationId, variantId]
        );

        if (existingSb.length > 0) {
          await ctx.rawQuery(
            `UPDATE stock_balances
             SET quantity_on_hand = $1, quantity_available = $1, updated_at = NOW()
             WHERE id = $2`,
            [String(stockQty), existingSb[0].id]
          );
        } else {
          await ctx.rawQuery(
            `INSERT INTO stock_balances (
               id, tenant_id, inventory_location_id, variant_id, quantity_on_hand, quantity_available, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $5, NOW())`,
            [randomUUID(), tenant.tenantId, locationId, variantId, String(stockQty)]
          );
        }
      }
    });

    return reply.status(200).send({
      success: true,
      data: updated,
      message: 'Product updated successfully',
      requestId: req.id,
    });
  });

  // DELETE /api/v1/products/:id
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const tenant = resolveTenant(req);
    const productId = req.params.id;

    await opts.uow.runInTransaction(async (ctx) => {
      if (ctx.rawQuery) {
        // Soft delete product & variants
        await ctx.rawQuery(
          `UPDATE products SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
          [tenant.tenantId, productId]
        );
        await ctx.rawQuery(
          `UPDATE product_variants SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND product_id = $2`,
          [tenant.tenantId, productId]
        );
      }
    });

    return reply.status(200).send({
      success: true,
      message: 'Product removed successfully',
      requestId: req.id,
    });
  });

  // POST /api/v1/products/bulk-import
  app.post<{
    Body: {
      items: Array<{
        category?: string;
        name: string;
        sku?: string;
        barcode?: string;
        unit?: string;
        stock?: number;
        purchasePrice?: number;
        sellingPrice?: number;
        reorderLevel?: number;
        description?: string;
      }>;
    };
  }>('/bulk-import', async (req, reply) => {
    const tenant = resolveTenant(req);
    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No items array provided for bulk import' },
        requestId: req.id,
      });
    }

    try {
      const result = await opts.uow.runInTransaction(async (ctx) => {
        // 1. Get default inventory location for this tenant
        let locationId = '00000000-0000-0000-0000-000000000001';
        if (ctx.rawQuery) {
          const locRows = await ctx.rawQuery(
            `SELECT id FROM inventory_locations WHERE tenant_id = $1 ORDER BY is_default DESC LIMIT 1`,
            [tenant.tenantId]
          );
          if (locRows.length > 0) {
            locationId = locRows[0].id;
          }
        }

        // 2. Fetch units map for this tenant
        const unitsMap = new Map<string, string>();
        let defaultUnitId = '10000000-0000-0000-0000-000000000001';
        if (ctx.rawQuery) {
          const uRows = await ctx.rawQuery(
            `SELECT id, name, symbol FROM units WHERE tenant_id = $1`,
            [tenant.tenantId]
          );
          for (const u of uRows) {
            unitsMap.set(u.symbol.toLowerCase(), u.id);
            unitsMap.set(u.name.toLowerCase(), u.id);
            if (u.symbol.toLowerCase() === 'pcs' || u.name.toLowerCase() === 'pieces') {
              defaultUnitId = u.id;
            }
          }
        }

        // 3. Cache existing categories
        const existingCategories = await ctx.products.listCategories(tenant.tenantId);
        const catMap = new Map<string, string>();
        for (const c of existingCategories) {
          catMap.set(c.name.trim().toLowerCase(), c.id);
        }

        // 4. Cache existing products
        const existingProducts = await ctx.products.list(tenant.tenantId);
        const prodMap = new Map<string, Product>();
        for (const p of existingProducts) {
          prodMap.set(p.name.trim().toLowerCase(), p);
        }

        let createdCategoriesCount = 0;
        let importedProductsCount = 0;

        for (const item of items) {
          if (!item.name || !item.name.trim()) continue;
          const itemName = item.name.trim();

          // 3a. Resolve or create category
          let categoryId: string | undefined = undefined;
          const catNameRaw = (item.category || '').trim();
          if (catNameRaw) {
            const catKey = catNameRaw.toLowerCase();
            if (catMap.has(catKey)) {
              categoryId = catMap.get(catKey);
            } else {
              const newCatId = randomUUID();
              const newCatCode = `CAT-${catNameRaw.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 16)}`;
              const newCat: ProductCategory = {
                id: newCatId,
                tenantId: tenant.tenantId,
                name: catNameRaw,
                code: newCatCode,
                isActive: true,
                createdAt: new Date().toISOString(),
              };
              await ctx.products.saveCategory(newCat);
              catMap.set(catKey, newCatId);
              categoryId = newCatId;
              createdCategoriesCount++;
            }
          }

          // 3b. Resolve base unit
          let unitId = defaultUnitId;
          if (item.unit) {
            const uKey = item.unit.trim().toLowerCase();
            if (unitsMap.has(uKey)) {
              unitId = unitsMap.get(uKey)!;
            }
          }

          // 3c. Generate SKU if missing
          const sku =
            item.sku?.trim() ||
            `SKU-${itemName.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;

          // 3d. Check if product already exists
          const prodKey = itemName.toLowerCase();
          const existingProd = prodMap.get(prodKey);

          let productId: string;
          if (existingProd) {
            productId = existingProd.id;
            const updatedProd: Product = {
              ...existingProd,
              categoryId: categoryId || existingProd.categoryId,
              purchasePrice:
                item.purchasePrice !== undefined
                  ? Number(item.purchasePrice)
                  : existingProd.purchasePrice,
              sellingPrice:
                item.sellingPrice !== undefined
                  ? Number(item.sellingPrice)
                  : existingProd.sellingPrice,
              reorderLevel:
                item.reorderLevel !== undefined
                  ? Number(item.reorderLevel)
                  : existingProd.reorderLevel,
            };
            await ctx.products.save(updatedProd);
            prodMap.set(prodKey, updatedProd);
          } else {
            productId = randomUUID();
            const newProd: Product = {
              id: productId,
              tenantId: tenant.tenantId,
              name: itemName,
              categoryId,
              productType: 'goods',
              sku,
              barcode: item.barcode,
              baseUnitId: unitId,
              isTaxInclusive: false,
              purchasePrice: item.purchasePrice !== undefined ? Number(item.purchasePrice) : 0,
              sellingPrice: item.sellingPrice !== undefined ? Number(item.sellingPrice) : 0,
              reorderLevel: item.reorderLevel !== undefined ? Number(item.reorderLevel) : 0,
              description: item.description,
              isStockTracked: true,
              trackingMethod: 'none',
              valuationMethod: 'fifo',
              isActive: true,
              createdAt: new Date().toISOString(),
            };
            await ctx.products.save(newProd);
            prodMap.set(prodKey, newProd);
          }

          // 3e. Update stock balance if stock is specified
          if (item.stock !== undefined && !isNaN(Number(item.stock))) {
            const stockQty = Number(item.stock);
            if (ctx.rawQuery) {
              const varRows = await ctx.rawQuery(
                `SELECT id FROM product_variants WHERE product_id = $1 LIMIT 1`,
                [productId]
              );
              const variantId = varRows.length > 0 ? varRows[0].id : productId;

              const existingSb = await ctx.rawQuery(
                `SELECT id FROM stock_balances WHERE tenant_id = $1 AND inventory_location_id = $2 AND variant_id = $3 LIMIT 1`,
                [tenant.tenantId, locationId, variantId]
              );

              if (existingSb.length > 0) {
                await ctx.rawQuery(
                  `UPDATE stock_balances
                   SET quantity_on_hand = $1, quantity_available = $1, updated_at = NOW()
                   WHERE id = $2`,
                  [String(stockQty), existingSb[0].id]
                );
              } else {
                await ctx.rawQuery(
                  `INSERT INTO stock_balances (
                     id, tenant_id, inventory_location_id, variant_id, quantity_on_hand, quantity_available, updated_at
                   ) VALUES ($1, $2, $3, $4, $5, $5, NOW())`,
                  [randomUUID(), tenant.tenantId, locationId, variantId, String(stockQty)]
                );
              }

              // Record stock movement for ledger
              await ctx.rawQuery(
                `INSERT INTO stock_movements (
                   id, tenant_id, inventory_location_id, variant_id, movement_type, quantity, unit_id, reference_type, reference_id, occurred_at, created_at
                 ) VALUES ($1, $2, $3, $4, 'opening_balance', $5, $6, 'excel_import', $1, NOW(), NOW())`,
                [randomUUID(), tenant.tenantId, locationId, variantId, stockQty, unitId]
              );
            }
          }

          importedProductsCount++;
        }

        return {
          importedCount: importedProductsCount,
          categoriesCount: createdCategoriesCount,
        };
      });

      return reply.status(200).send({
        success: true,
        message: `Successfully imported ${result.importedCount} product(s) across ${result.categoriesCount} new category(ies)`,
        data: result,
        requestId: req.id,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'IMPORT_FAILED', message: err.message || 'Bulk import failed' },
        requestId: req.id,
      });
    }
  });
};
