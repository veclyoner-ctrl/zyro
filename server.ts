import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import {
  enrichProduct,
  getDbDriverStatus,
  hashPassword,
  initStore,
  loadDb,
  sanitizeProfile,
  saveDb,
} from './server/store';
import {
  deleteAssetFromSupabaseStorage,
  sendSupabasePasswordReset,
  syncSupabaseAuthRegistration,
  updateSupabaseAuthPassword,
  uploadAssetToSupabaseStorage,
  verifySupabaseAuthLogin,
  verifySupabaseRecoveryAccessToken,
} from './server/supabase';
import {
  canCancelOrder,
  canRequestReturn,
  evaluateCatalogDataQuality,
  getEffectivePrice,
  slugify,
  validateAndCalculateCoupon,
  calculateShipping,
} from './src/lib/commerce';
import type { Business, Order, OrderItem, Product, Review } from './src/types';

const PORT = 3000;

const RESET_TOKEN_SECRET = crypto
  .createHash('sha256')
  .update('zyro-mall-reset-secret-2026')
  .digest('hex');

function createPasswordResetToken(userId: string, email: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      uid: userId,
      email: email.toLowerCase(),
      exp: Date.now() + 30 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', RESET_TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyPasswordResetToken(token: string): { uid: string; email: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', RESET_TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: string;
      email?: string;
      exp?: number;
    };
    if (!decoded.uid || !decoded.email || !decoded.exp || decoded.exp < Date.now()) {
      return null;
    }
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

function getRequestUser(req: express.Request) {
  const userId = req.header('x-user-id');
  if (!userId) return null;
  const db = loadDb();
  return db.users.find((u) => u.id === userId) ?? null;
}

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const user = getRequestUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  if (user.is_blocked) {
    res.status(403).json({ error: 'Your account has been blocked. Contact support.' });
    return;
  }
  (req as express.Request & { currentUser: typeof user }).currentUser = user;
  next();
}

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const user = getRequestUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  (req as express.Request & { currentUser: typeof user }).currentUser = user;
  next();
}

async function startServer() {
  await initStore();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // --- Health ---
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, store: 'Zyro Mall', storage: getDbDriverStatus() });
  });

  // --- Asset Uploads (Supabase Storage when configured, dataUrl fallback locally) ---
  app.post('/api/uploads', requireAuth, async (req, res) => {
    const { bucket, fileName, contentType, dataUrl } = req.body ?? {};
    if (!bucket || !fileName || !dataUrl) {
      res.status(400).json({ error: 'Bucket, file name, and file payload are required.' });
      return;
    }
    try {
      const url = await uploadAssetToSupabaseStorage({
        bucket: String(bucket),
        fileName: String(fileName),
        contentType: String(contentType || 'image/png'),
        dataUrl: String(dataUrl),
      });
      res.status(201).json({ url });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to upload file.',
      });
    }
  });

  app.delete('/api/uploads', requireAdmin, async (req, res) => {
    const { url, bucket = 'product-images' } = req.body ?? {};
    if (!url) {
      res.status(400).json({ error: 'Asset URL is required.' });
      return;
    }
    try {
      const removed = await deleteAssetFromSupabaseStorage(String(url), String(bucket));
      res.json({ ok: true, removed });
    } catch {
      res.json({ ok: true, removed: false });
    }
  });

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { full_name, email, phone, password } = req.body ?? {};
    if (!full_name || !email || !phone || !password) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }
    if (String(password).length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }
    const db = loadDb();
    const normalizedEmail = String(email).trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'This email is already registered. Login instead.' });
      return;
    }

    const cleanName = String(full_name).trim();
    const cleanPhone = String(phone).trim();
    const supabaseAuthId = await syncSupabaseAuthRegistration({
      email: normalizedEmail,
      password: String(password),
      full_name: cleanName,
      phone: cleanPhone,
    });

    const now = new Date().toISOString();
    const newUser = {
      id: supabaseAuthId || `usr-${crypto.randomUUID().slice(0, 8)}`,
      email: normalizedEmail,
      full_name: cleanName,
      phone: cleanPhone,
      role: 'customer' as const,
      is_blocked: false,
      password_hash: hashPassword(String(password)),
      created_at: now,
      updated_at: now,
    };
    db.users.push(newUser);
    saveDb(db);
    res.status(201).json({ user: sanitizeProfile(newUser) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const db = loadDb();
    const normalizedEmail = String(email).trim().toLowerCase();
    let user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    const localHashMatches = user && user.password_hash === hashPassword(String(password));

    if (!localHashMatches) {
      const sbUser = await verifySupabaseAuthLogin(normalizedEmail, String(password));
      if (!sbUser) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      if (!user) {
        const now = new Date().toISOString();
        user = {
          id: sbUser.id,
          email: normalizedEmail,
          full_name: sbUser.full_name || normalizedEmail.split('@')[0],
          phone: sbUser.phone || '',
          role: 'customer',
          is_blocked: false,
          password_hash: hashPassword(String(password)),
          created_at: now,
          updated_at: now,
        };
        db.users.push(user);
        saveDb(db);
      }
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.is_blocked) {
      res.status(403).json({ error: 'Your account has been blocked. Contact support.' });
      return;
    }
    res.json({ user: sanitizeProfile(user) });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body ?? {};
    const trimmedEmail = String(email ?? '').trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      res.status(400).json({ error: 'Valid email address is required.' });
      return;
    }

    const db = loadDb();
    const user = db.users.find((u) => u.email.toLowerCase() === trimmedEmail);
    const origin = req.headers.origin
      ? String(req.headers.origin)
      : `http://${req.headers.host || 'localhost:3000'}`;
    const sentViaSupabase = await sendSupabasePasswordReset(
      trimmedEmail,
      `${origin.replace(/\/$/, '')}/reset-password`
    );

    let resetUrl: string | undefined;
    if (user && !sentViaSupabase) {
      const token = createPasswordResetToken(user.id, user.email);
      resetUrl = `/reset-password?token=${encodeURIComponent(token)}`;
    }

    res.json({
      message: `If an account exists for ${trimmedEmail}, a password reset link has been sent.`,
      ...(resetUrl ? { resetUrl } : {}),
    });
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, accessToken, newPassword } = req.body ?? {};
    const passwordStr = String(newPassword ?? '');
    if (passwordStr.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }

    const db = loadDb();
    let targetIdx = -1;

    if (token) {
      const verified = verifyPasswordResetToken(String(token));
      if (!verified) {
        res.status(400).json({ error: 'Reset link is invalid or has expired.' });
        return;
      }
      targetIdx = db.users.findIndex(
        (u) => u.id === verified.uid && u.email.toLowerCase() === verified.email.toLowerCase()
      );
    } else if (accessToken) {
      const sbUser = await verifySupabaseRecoveryAccessToken(String(accessToken));
      if (!sbUser) {
        res.status(400).json({ error: 'Recovery session is invalid or has expired.' });
        return;
      }
      targetIdx = db.users.findIndex(
        (u) => u.id === sbUser.id || u.email.toLowerCase() === sbUser.email.toLowerCase()
      );
    } else {
      res.status(400).json({ error: 'Password reset token is required.' });
      return;
    }

    if (targetIdx === -1) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    db.users[targetIdx].password_hash = hashPassword(passwordStr);
    db.users[targetIdx].updated_at = new Date().toISOString();
    saveDb(db);
    await updateSupabaseAuthPassword(db.users[targetIdx].id, passwordStr);

    res.json({ message: 'Your password has been reset. You can now sign in.' });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: ReturnType<typeof getRequestUser> })
      .currentUser!;
    res.json({ user: sanitizeProfile(user) });
  });

  app.patch('/api/auth/profile', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const { full_name, phone } = req.body ?? {};
    const db = loadDb();
    const idx = db.users.findIndex((u) => u.id === user.id);
    if (idx === -1) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (full_name) db.users[idx].full_name = String(full_name).trim();
    if (phone) db.users[idx].phone = String(phone).trim();
    db.users[idx].updated_at = new Date().toISOString();
    saveDb(db);
    res.json({ user: sanitizeProfile(db.users[idx]) });
  });

  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword || String(newPassword).length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }
    const db = loadDb();
    const idx = db.users.findIndex((u) => u.id === user.id);
    if (idx === -1 || db.users[idx].password_hash !== hashPassword(String(currentPassword))) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }
    const nextPassword = String(newPassword);
    db.users[idx].password_hash = hashPassword(nextPassword);
    db.users[idx].updated_at = new Date().toISOString();
    saveDb(db);
    await updateSupabaseAuthPassword(db.users[idx].id, nextPassword);
    res.json({ message: 'Password updated successfully.' });
  });

  // --- Public Catalog Routes ---
  app.get('/api/settings', (_req, res) => {
    const db = loadDb();
    res.json(db.settings);
  });

  app.get('/api/banners', (req, res) => {
    const db = loadDb();
    const type = req.query.type as string | undefined;
    const items = db.banners
      .filter((b) => b.is_active && (!type || b.type === type))
      .sort((a, b) => a.sort_order - b.sort_order);
    res.json(items);
  });

  app.get('/api/categories', (_req, res) => {
    const db = loadDb();
    const categories = db.categories
      .filter((c) => c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cat) => ({
        ...cat,
        product_count: db.products.filter(
          (p) => !p.is_deleted && p.status === 'active' && p.category_id === cat.id
        ).length,
      }));
    res.json(categories);
  });

  app.get('/api/businesses', (_req, res) => {
    const db = loadDb();
    const businesses = (db.businesses ?? [])
      .filter((b) => b.is_active)
      .map((biz) => {
        const category = db.categories.find((c) => c.id === biz.category_id);
        return {
          ...biz,
          category_name: category?.name ?? 'General',
          product_count: db.products.filter(
            (p) => !p.is_deleted && p.status === 'active' && p.business_id === biz.id
          ).length,
        };
      });
    res.json(businesses);
  });

  app.get('/api/products', (req, res) => {
    const db = loadDb();
    const {
      category,
      business,
      search,
      minPrice,
      maxPrice,
      minRating,
      inStockOnly,
      sort = 'newest',
      featured,
      page = '1',
      perPage = '12',
    } = req.query as Record<string, string>;

    let items = db.products
      .filter((p) => !p.is_deleted && p.status !== 'draft')
      .map((p) => enrichProduct(db, p));

    if (category) {
      const catSlugs = category.split(',').map((s) => s.trim().toLowerCase());
      const matchingCats = db.categories.filter(
        (c) => catSlugs.includes(c.slug.toLowerCase()) || catSlugs.includes(c.id)
      );
      const matchingCatIds = new Set(matchingCats.map((c) => c.id));
      // Include child categories
      for (const c of db.categories) {
        if (c.parent_id && matchingCatIds.has(c.parent_id)) {
          matchingCatIds.add(c.id);
        }
      }
      items = items.filter((p) => p.category_id && matchingCatIds.has(p.category_id));
    }

    if (business) {
      const bizKeys = business.split(',').map((s) => s.trim().toLowerCase());
      const matchingBiz = (db.businesses ?? []).filter(
        (b) => bizKeys.includes(b.slug.toLowerCase()) || bizKeys.includes(b.id.toLowerCase())
      );
      const matchingBizIds = new Set(matchingBiz.map((b) => b.id));
      items = items.filter((p) => p.business_id && matchingBizIds.has(p.business_id));
    }

    if (search) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.category_name?.toLowerCase().includes(q) ?? false) ||
          (p.business_name?.toLowerCase().includes(q) ?? false)
      );
    }

    if (minPrice) {
      const min = Number(minPrice);
      if (!Number.isNaN(min)) {
        items = items.filter((p) => getEffectivePrice(p) >= min);
      }
    }

    if (maxPrice) {
      const max = Number(maxPrice);
      if (!Number.isNaN(max)) {
        items = items.filter((p) => getEffectivePrice(p) <= max);
      }
    }

    if (minRating) {
      const minR = Number(minRating);
      if (!Number.isNaN(minR)) {
        items = items.filter((p) => (p.rating_avg ?? 0) >= minR);
      }
    }

    if (inStockOnly === 'true') {
      items = items.filter((p) => p.stock_quantity > 0 && p.status !== 'out_of_stock');
    }

    if (featured === 'true') {
      items = items.filter((p) => p.is_featured);
    }

    switch (sort) {
      case 'price_asc':
        items.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        break;
      case 'price_desc':
        items.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        break;
      case 'best_rated':
        items.sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0));
        break;
      case 'newest':
      default:
        items.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }

    const total = items.length;
    const pNum = Math.max(1, Number(page) || 1);
    const limit = Math.max(1, Math.min(48, Number(perPage) || 12));
    const offset = (pNum - 1) * limit;
    const paginated = items.slice(offset, offset + limit);

    res.json({
      items: paginated,
      total,
      page: pNum,
      perPage: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  });

  app.get('/api/products/:slug', (req, res) => {
    const db = loadDb();
    const product = db.products.find(
      (p) => !p.is_deleted && p.slug === req.params.slug
    );
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const enriched = enrichProduct(db, product);
    const related = db.products
      .filter(
        (p) =>
          !p.is_deleted &&
          p.status === 'active' &&
          p.id !== product.id &&
          p.category_id === product.category_id
      )
      .slice(0, 4)
      .map((p) => enrichProduct(db, p));
    res.json({ product: enriched, related });
  });

  // --- Reviews ---
  app.get('/api/reviews', (req, res) => {
    const db = loadDb();
    const productId = req.query.productId as string | undefined;
    const userId = req.query.userId as string | undefined;
    let reviews = db.reviews.filter((r) => r.is_approved);
    if (productId) reviews = reviews.filter((r) => r.product_id === productId);
    if (userId) reviews = reviews.filter((r) => r.user_id === userId);
    reviews.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    res.json(reviews);
  });

  app.get('/api/reviews/eligibility/:productId', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    const productId = req.params.productId;
    const deliveredOrder = db.orders.find(
      (o) =>
        o.user_id === user.id &&
        o.status === 'delivered' &&
        (o.items ?? []).some((i) => i.product_id === productId)
    );
    const existingReview = db.reviews.find(
      (r) => r.user_id === user.id && r.product_id === productId
    );
    res.json({
      canReview: Boolean(deliveredOrder) && !existingReview,
      hasPurchased: Boolean(deliveredOrder),
      existingReview: existingReview ?? null,
    });
  });

  app.post('/api/reviews', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const { product_id, rating, comment } = req.body ?? {};
    const numRating = Number(rating);
    if (!product_id || Number.isNaN(numRating) || numRating < 1 || numRating > 5) {
      res.status(400).json({ error: 'Valid product and star rating (1-5) are required.' });
      return;
    }
    const db = loadDb();
    const deliveredOrder = db.orders.find(
      (o) =>
        o.user_id === user.id &&
        o.status === 'delivered' &&
        (o.items ?? []).some((i) => i.product_id === product_id)
    );
    if (!deliveredOrder) {
      res
        .status(403)
        .json({ error: 'Only customers with a delivered order for this product can leave a review.' });
      return;
    }
    if (db.reviews.some((r) => r.user_id === user.id && r.product_id === product_id)) {
      res.status(409).json({ error: 'You have already reviewed this product.' });
      return;
    }
    const product = db.products.find((p) => p.id === product_id);
    const review: Review = {
      id: `rev-${crypto.randomUUID().slice(0, 8)}`,
      product_id,
      product_title: product?.title,
      user_id: user.id,
      user_name: user.full_name,
      order_id: deliveredOrder.id,
      rating: numRating,
      comment: String(comment ?? '').trim(),
      is_approved: true,
      created_at: new Date().toISOString(),
    };
    db.reviews.push(review);
    saveDb(db);
    res.status(201).json(review);
  });

  app.patch('/api/reviews/:id', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    const idx = db.reviews.findIndex((r) => r.id === req.params.id && r.user_id === user.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }
    const { rating, comment } = req.body ?? {};
    if (rating !== undefined) {
      const rNum = Number(rating);
      if (rNum >= 1 && rNum <= 5) db.reviews[idx].rating = rNum;
    }
    if (comment !== undefined) db.reviews[idx].comment = String(comment).trim();
    db.reviews[idx].updated_at = new Date().toISOString();
    saveDb(db);
    res.json(db.reviews[idx]);
  });

  // --- Cart Routes ---
  app.get('/api/cart', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    const items = db.cart_items
      .filter((ci) => ci.user_id === user.id)
      .map((ci) => {
        const product = db.products.find((p) => p.id === ci.product_id);
        const variant = product?.variants?.find((v) => v.id === ci.variant_id) ?? null;
        return {
          ...ci,
          product: product ? enrichProduct(db, product) : undefined,
          variant,
        };
      })
      .filter((ci) => ci.product && !ci.product.is_deleted);
    res.json(items);
  });

  app.post('/api/cart', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const { product_id, variant_id = null, quantity = 1 } = req.body ?? {};
    const qty = Math.max(1, Number(quantity) || 1);
    const db = loadDb();
    const product = db.products.find((p) => p.id === product_id && !p.is_deleted);
    if (!product || product.stock_quantity <= 0 || product.status === 'out_of_stock') {
      res.status(400).json({ error: 'This product is currently out of stock.' });
      return;
    }
    const existingIdx = db.cart_items.findIndex(
      (ci) =>
        ci.user_id === user.id &&
        ci.product_id === product_id &&
        (ci.variant_id ?? null) === (variant_id ?? null)
    );
    if (existingIdx >= 0) {
      db.cart_items[existingIdx].quantity = Math.min(
        product.stock_quantity,
        db.cart_items[existingIdx].quantity + qty
      );
      db.cart_items[existingIdx].updated_at = new Date().toISOString();
    } else {
      db.cart_items.push({
        id: `ci-${crypto.randomUUID().slice(0, 8)}`,
        user_id: user.id,
        product_id,
        variant_id: variant_id ?? null,
        quantity: Math.min(product.stock_quantity, qty),
        created_at: new Date().toISOString(),
      });
    }
    saveDb(db);
    res.status(201).json({ ok: true });
  });

  app.patch('/api/cart/:id', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const { quantity } = req.body ?? {};
    const qty = Number(quantity);
    const db = loadDb();
    const idx = db.cart_items.findIndex((ci) => ci.id === req.params.id && ci.user_id === user.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Cart item not found.' });
      return;
    }
    if (qty <= 0) {
      db.cart_items.splice(idx, 1);
    } else {
      const product = db.products.find((p) => p.id === db.cart_items[idx].product_id);
      const maxStock = product?.stock_quantity ?? qty;
      db.cart_items[idx].quantity = Math.min(maxStock, qty);
      db.cart_items[idx].updated_at = new Date().toISOString();
    }
    saveDb(db);
    res.json({ ok: true });
  });

  app.delete('/api/cart/:id', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    db.cart_items = db.cart_items.filter(
      (ci) => !(ci.id === req.params.id && ci.user_id === user.id)
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // --- Wishlist Routes ---
  app.get('/api/wishlist', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    const items = db.wishlist_items
      .filter((wi) => wi.user_id === user.id)
      .map((wi) => {
        const product = db.products.find((p) => p.id === wi.product_id && !p.is_deleted);
        return {
          ...wi,
          product: product ? enrichProduct(db, product) : undefined,
        };
      })
      .filter((wi) => wi.product);
    res.json(items);
  });

  app.post('/api/wishlist', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const { product_id } = req.body ?? {};
    const db = loadDb();
    const exists = db.wishlist_items.some(
      (wi) => wi.user_id === user.id && wi.product_id === product_id
    );
    if (!exists) {
      db.wishlist_items.push({
        id: `wl-${crypto.randomUUID().slice(0, 8)}`,
        user_id: user.id,
        product_id,
        created_at: new Date().toISOString(),
      });
      saveDb(db);
    }
    res.status(201).json({ ok: true });
  });

  app.delete('/api/wishlist/:productId', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    db.wishlist_items = db.wishlist_items.filter(
      (wi) => !(wi.user_id === user.id && wi.product_id === req.params.productId)
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // --- Saved Addresses ---
  app.get('/api/addresses', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    res.json(db.addresses.filter((a) => a.user_id === user.id));
  });

  app.post('/api/addresses', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const { full_name, phone, address_line1, city, area, postal_code, is_default } = req.body ?? {};
    if (!full_name || !phone || !address_line1 || !city) {
      res.status(400).json({ error: 'Name, phone, street address, and city are required.' });
      return;
    }
    const db = loadDb();
    if (is_default) {
      for (const a of db.addresses) {
        if (a.user_id === user.id) a.is_default = false;
      }
    }
    const addr = {
      id: `addr-${crypto.randomUUID().slice(0, 8)}`,
      user_id: user.id,
      full_name: String(full_name).trim(),
      phone: String(phone).trim(),
      address_line1: String(address_line1).trim(),
      city: String(city).trim(),
      area: String(area ?? '').trim(),
      postal_code: String(postal_code ?? '').trim(),
      is_default: Boolean(is_default) || !db.addresses.some((a) => a.user_id === user.id),
      created_at: new Date().toISOString(),
    };
    db.addresses.push(addr);
    saveDb(db);
    res.status(201).json(addr);
  });

  app.patch('/api/addresses/:id', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    const idx = db.addresses.findIndex((a) => a.id === req.params.id && a.user_id === user.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Address not found.' });
      return;
    }
    const { full_name, phone, address_line1, city, area, postal_code, is_default } = req.body ?? {};
    if (is_default) {
      for (const a of db.addresses) {
        if (a.user_id === user.id) a.is_default = false;
      }
    }
    Object.assign(db.addresses[idx], {
      ...(full_name !== undefined ? { full_name: String(full_name).trim() } : {}),
      ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
      ...(address_line1 !== undefined ? { address_line1: String(address_line1).trim() } : {}),
      ...(city !== undefined ? { city: String(city).trim() } : {}),
      ...(area !== undefined ? { area: String(area).trim() } : {}),
      ...(postal_code !== undefined ? { postal_code: String(postal_code).trim() } : {}),
      ...(is_default !== undefined ? { is_default: Boolean(is_default) } : {}),
      updated_at: new Date().toISOString(),
    });
    saveDb(db);
    res.json(db.addresses[idx]);
  });

  app.delete('/api/addresses/:id', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    db.addresses = db.addresses.filter(
      (a) => !(a.id === req.params.id && a.user_id === user.id)
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // --- Coupons ---
  app.post('/api/coupons/validate', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const { code, subtotal } = req.body ?? {};
    if (!code) {
      res.status(400).json({ error: 'Please enter a coupon code.' });
      return;
    }
    const db = loadDb();
    const normalized = String(code).trim().toUpperCase();
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === normalized);
    const hasUsed = coupon
      ? db.coupon_usages.some((u) => u.coupon_id === coupon.id && u.user_id === user.id)
      : false;
    const result = validateAndCalculateCoupon(coupon, Number(subtotal) || 0, hasUsed);
    if (!result.valid) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({
      coupon,
      discountAmount: result.discountAmount,
    });
  });

  // --- Orders (Customer) ---
  app.get('/api/orders', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    const orders = db.orders
      .filter((o) => o.user_id === user.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(orders);
  });

  app.get('/api/orders/:id', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    const order = db.orders.find(
      (o) =>
        (o.id === req.params.id || o.order_number === req.params.id) &&
        (o.user_id === user.id || user.role === 'admin')
    );
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json(order);
  });

  app.post('/api/orders', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const {
      shipping_address,
      payment_method,
      payment_proof_url = null,
      coupon_code = null,
      save_address = false,
    } = req.body ?? {};

    if (
      !shipping_address?.full_name ||
      !shipping_address?.phone ||
      !shipping_address?.address_line1 ||
      !shipping_address?.city
    ) {
      res.status(400).json({ error: 'Complete shipping address is required.' });
      return;
    }

    const db = loadDb();
    if (!['cod', 'jazzcash', 'easypaisa'].includes(String(payment_method))) {
      res.status(400).json({ error: 'Unsupported payment method. Use COD, JazzCash, or EasyPaisa.' });
      return;
    }
    if (payment_method === 'cod' && !db.settings.cod_enabled) {
      res.status(400).json({ error: 'Cash on Delivery is currently disabled.' });
      return;
    }

    const cartRows = db.cart_items.filter((ci) => ci.user_id === user.id);
    if (cartRows.length === 0) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    const orderItems: OrderItem[] = [];
    let subtotal = 0;
    const now = new Date().toISOString();

    for (const ci of cartRows) {
      const product = db.products.find((p) => p.id === ci.product_id && !p.is_deleted);
      if (!product || product.stock_quantity < ci.quantity || product.status === 'out_of_stock') {
        res.status(400).json({
          error: `${product?.title ?? 'An item'} does not have sufficient stock (${product?.stock_quantity ?? 0} available).`,
        });
        return;
      }
      const variant = product.variants?.find((v) => v.id === ci.variant_id) ?? null;
      const unitPrice = getEffectivePrice(product, variant?.price_modifier ?? 0);
      const lineTotal = unitPrice * ci.quantity;
      subtotal += lineTotal;
      orderItems.push({
        id: `oi-${crypto.randomUUID().slice(0, 8)}`,
        order_id: '',
        product_id: product.id,
        variant_id: ci.variant_id,
        product_title: product.title,
        product_image: product.images[0] ?? null,
        variant_info: variant ? `${variant.variant_name}: ${variant.variant_value}` : null,
        quantity: ci.quantity,
        unit_price: unitPrice,
        total_price: lineTotal,
        created_at: now,
      });
    }

    let discountAmount = 0;
    let appliedCouponId: string | null = null;
    let appliedCouponCode: string | null = null;

    if (coupon_code) {
      const normalized = String(coupon_code).trim().toUpperCase();
      const coupon = db.coupons.find((c) => c.code.toUpperCase() === normalized);
      const hasUsed = coupon
        ? db.coupon_usages.some((u) => u.coupon_id === coupon.id && u.user_id === user.id)
        : false;
      const validation = validateAndCalculateCoupon(coupon, subtotal, hasUsed);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }
      discountAmount = validation.discountAmount;
      appliedCouponId = coupon!.id;
      appliedCouponCode = coupon!.code;
    }

    const shippingCost = calculateShipping(
      subtotal,
      db.settings.flat_shipping_cost,
      db.settings.free_shipping_threshold
    );
    const total = Math.max(0, subtotal - discountAmount + shippingCost);
    const dateStamp = now.slice(0, 10).replace(/-/g, '');
    const seq = String(db.orders.length + 101).padStart(4, '0');
    const orderId = `ord-${crypto.randomUUID().slice(0, 8)}`;

    for (const item of orderItems) {
      item.order_id = orderId;
      const pIdx = db.products.findIndex((p) => p.id === item.product_id);
      if (pIdx !== -1) {
        db.products[pIdx].stock_quantity = Math.max(
          0,
          db.products[pIdx].stock_quantity - item.quantity
        );
        if (db.products[pIdx].stock_quantity === 0) {
          db.products[pIdx].status = 'out_of_stock';
        }
      }
    }

    const newOrder: Order = {
      id: orderId,
      order_number: `ZM-${dateStamp}-${seq}`,
      user_id: user.id,
      customer_name: user.full_name,
      customer_email: user.email,
      status: 'pending',
      payment_method,
      payment_status: 'pending',
      payment_proof_url,
      subtotal,
      shipping_cost: shippingCost,
      discount_amount: discountAmount,
      total,
      coupon_id: appliedCouponId,
      coupon_code: appliedCouponCode,
      shipping_address: {
        ...shipping_address,
        email: shipping_address.email?.trim() || user.email,
      },
      tracking_number: null,
      admin_notes: null,
      cancel_reason: null,
      items: orderItems,
      created_at: now,
      updated_at: now,
    };

    db.orders.unshift(newOrder);

    if (appliedCouponId) {
      const cIdx = db.coupons.findIndex((c) => c.id === appliedCouponId);
      if (cIdx !== -1) db.coupons[cIdx].used_count += 1;
      db.coupon_usages.push({
        id: `cu-${crypto.randomUUID().slice(0, 8)}`,
        coupon_id: appliedCouponId,
        user_id: user.id,
        order_id: orderId,
        used_at: now,
      });
    }

    if (save_address) {
      db.addresses.push({
        id: `addr-${crypto.randomUUID().slice(0, 8)}`,
        user_id: user.id,
        full_name: shipping_address.full_name,
        phone: shipping_address.phone,
        address_line1: shipping_address.address_line1,
        city: shipping_address.city,
        area: shipping_address.area ?? '',
        postal_code: shipping_address.postal_code ?? '',
        is_default: db.addresses.filter((a) => a.user_id === user.id).length === 0,
        created_at: now,
      });
    }

    // Clear user's cart
    db.cart_items = db.cart_items.filter((ci) => ci.user_id !== user.id);
    saveDb(db);
    res.status(201).json(newOrder);
  });

  app.post('/api/orders/:id/cancel', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    const idx = db.orders.findIndex(
      (o) => o.id === req.params.id && (o.user_id === user.id || user.role === 'admin')
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (!canCancelOrder(db.orders[idx].status)) {
      res.status(400).json({ error: 'Only pending orders can be cancelled.' });
      return;
    }
    db.orders[idx].status = 'cancelled';
    db.orders[idx].cancel_reason = String(req.body?.reason ?? 'Cancelled by customer').trim();
    db.orders[idx].updated_at = new Date().toISOString();
    // Restore stock
    for (const item of db.orders[idx].items ?? []) {
      const pIdx = db.products.findIndex((p) => p.id === item.product_id);
      if (pIdx !== -1) {
        db.products[pIdx].stock_quantity += item.quantity;
        if (db.products[pIdx].status === 'out_of_stock' && db.products[pIdx].stock_quantity > 0) {
          db.products[pIdx].status = 'active';
        }
      }
    }
    saveDb(db);
    res.json(db.orders[idx]);
  });

  app.post('/api/orders/:id/return', requireAuth, (req, res) => {
    const user = (req as express.Request & { currentUser: NonNullable<ReturnType<typeof getRequestUser>> })
      .currentUser;
    const db = loadDb();
    const idx = db.orders.findIndex((o) => o.id === req.params.id && o.user_id === user.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (db.orders[idx].return_requested) {
      res.status(400).json({ error: 'A return request has already been submitted for this order.' });
      return;
    }
    if (!canRequestReturn(db.orders[idx].status, db.orders[idx].created_at)) {
      res.status(400).json({
        error: 'Return requests are only eligible within 7 days of delivered orders.',
      });
      return;
    }
    const reason = String(req.body?.reason ?? '').trim();
    if (!reason) {
      res.status(400).json({ error: 'Please provide a reason for your return request.' });
      return;
    }
    db.orders[idx].return_requested = true;
    db.orders[idx].return_reason = reason;
    db.orders[idx].updated_at = new Date().toISOString();
    saveDb(db);
    res.json(db.orders[idx]);
  });

  // --- Admin Routes ---
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const db = loadDb();
    const activeOrders = db.orders.filter((o) => o.status !== 'cancelled');
    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = db.orders.filter((o) => o.status === 'pending').length;
    const totalCustomers = db.users.filter((u) => u.role === 'customer').length;

    const nowMs = Date.now();
    const todayKey = new Date().toISOString().slice(0, 10);
    const weekAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
    const monthAgoMs = nowMs - 30 * 24 * 60 * 60 * 1000;

    let todaySales = 0;
    let weekSales = 0;
    let monthSales = 0;
    for (const o of activeOrders) {
      const orderTime = new Date(o.created_at).getTime();
      if (o.created_at.slice(0, 10) === todayKey) todaySales += o.total;
      if (orderTime >= weekAgoMs) weekSales += o.total;
      if (orderTime >= monthAgoMs) monthSales += o.total;
    }

    const ordersByStatus: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of db.orders) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
    }

    const lowStockProducts = db.products
      .filter(
        (p) => !p.is_deleted && p.stock_quantity <= db.settings.low_stock_threshold
      )
      .map((p) => enrichProduct(db, p));

    // Build 14-day / 30-day revenue series
    const chartMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      chartMap.set(key, 0);
    }
    for (const o of activeOrders) {
      const day = o.created_at.slice(0, 10);
      if (chartMap.has(day)) {
        chartMap.set(day, (chartMap.get(day) ?? 0) + o.total);
      }
    }
    const revenueChart = Array.from(chartMap.entries()).map(([date, revenue]) => ({
      date: date.slice(5),
      revenue,
    }));

    const recentOrders = [...db.orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    res.json({
      stats: {
        totalRevenue,
        todaySales,
        weekSales,
        monthSales,
        totalOrders: db.orders.length,
        totalCustomers,
        pendingOrders,
        ordersByStatus,
      },
      revenueChart,
      recentOrders,
      lowStockProducts,
    });
  });

  app.get('/api/admin/products', requireAdmin, (_req, res) => {
    const db = loadDb();
    const products = db.products
      .filter((p) => !p.is_deleted)
      .map((p) => enrichProduct(db, p))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(products);
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const body = req.body ?? {};
    const parsedPrice = Number(body.price);
    const parsedSalePrice =
      body.sale_price !== undefined && body.sale_price !== null && body.sale_price !== ''
        ? Number(body.sale_price)
        : null;
    if (!body.title || !body.sku || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      res.status(400).json({ error: 'Title, SKU, and a positive price are required.' });
      return;
    }
    if (parsedSalePrice !== null && (Number.isNaN(parsedSalePrice) || parsedSalePrice <= 0 || parsedSalePrice >= parsedPrice)) {
      res.status(400).json({ error: 'Sale price must be greater than 0 and less than regular price.' });
      return;
    }
    const db = loadDb();
    const normalizedSku = String(body.sku).trim().toUpperCase();
    if (db.products.some((p) => !p.is_deleted && p.sku.toUpperCase() === normalizedSku)) {
      res.status(409).json({ error: 'A product with this SKU already exists.' });
      return;
    }
    const baseSlug = slugify(String(body.slug || body.title));
    const uniqueSlug = db.products.some((p) => p.slug === baseSlug)
      ? `${baseSlug}-${Date.now().toString().slice(-4)}`
      : baseSlug;
    const stockQty = Math.max(0, Number(body.stock_quantity) || 0);
    const requestedStatus = body.status || 'active';
    const finalStatus =
      stockQty === 0 && requestedStatus === 'active' ? 'out_of_stock' : requestedStatus;
    const now = new Date().toISOString();
    const newProduct: Product = {
      id: `prod-${crypto.randomUUID().slice(0, 8)}`,
      title: String(body.title).trim(),
      slug: uniqueSlug,
      description: String(body.description ?? '').trim(),
      sku: normalizedSku,
      category_id: body.category_id || null,
      business_id: body.business_id || null,
      price: parsedPrice,
      sale_price: parsedSalePrice,
      stock_quantity: stockQty,
      images:
        Array.isArray(body.images) && body.images.length > 0
          ? body.images
          : ['/src/assets/images/prod_headphones_1795178619261.jpg'],
      status: finalStatus,
      is_deleted: false,
      is_featured: Boolean(body.is_featured),
      variants: Array.isArray(body.variants) ? body.variants : [],
      created_at: now,
      updated_at: now,
    };
    db.products.unshift(newProduct);
    saveDb(db);
    res.status(201).json(enrichProduct(db, newProduct));
  });

  app.patch('/api/admin/products/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    const idx = db.products.findIndex((p) => p.id === req.params.id && !p.is_deleted);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const body = req.body ?? {};
    const nextPrice = body.price !== undefined ? Number(body.price) : db.products[idx].price;
    if (Number.isNaN(nextPrice) || nextPrice <= 0) {
      res.status(400).json({ error: 'Price must be greater than 0.' });
      return;
    }
    const nextSalePrice =
      body.sale_price !== undefined
        ? body.sale_price !== null && body.sale_price !== ''
          ? Number(body.sale_price)
          : null
        : db.products[idx].sale_price;
    if (
      nextSalePrice !== null &&
      (Number.isNaN(nextSalePrice) || nextSalePrice <= 0 || nextSalePrice >= nextPrice)
    ) {
      res.status(400).json({ error: 'Sale price must be greater than 0 and less than regular price.' });
      return;
    }
    const nextSku =
      body.sku !== undefined ? String(body.sku).trim().toUpperCase() : db.products[idx].sku;
    if (!nextSku) {
      res.status(400).json({ error: 'SKU cannot be empty.' });
      return;
    }
    if (
      body.sku !== undefined &&
      db.products.some((p) => p.id !== req.params.id && !p.is_deleted && p.sku.toUpperCase() === nextSku)
    ) {
      res.status(409).json({ error: 'Another product already uses this SKU.' });
      return;
    }

    const nextStock =
      body.stock_quantity !== undefined
        ? Math.max(0, Number(body.stock_quantity))
        : db.products[idx].stock_quantity;
    let nextStatus = body.status !== undefined ? body.status : db.products[idx].status;
    if (nextStock === 0 && nextStatus === 'active') {
      nextStatus = 'out_of_stock';
    } else if (nextStock > 0 && body.stock_quantity !== undefined && body.status === undefined && db.products[idx].status === 'out_of_stock') {
      nextStatus = 'active';
    }

    Object.assign(db.products[idx], {
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.description !== undefined ? { description: String(body.description).trim() } : {}),
      sku: nextSku,
      ...(body.category_id !== undefined ? { category_id: body.category_id || null } : {}),
      ...(body.business_id !== undefined ? { business_id: body.business_id || null } : {}),
      price: nextPrice,
      sale_price: nextSalePrice,
      stock_quantity: nextStock,
      ...(Array.isArray(body.images) && body.images.length > 0 ? { images: body.images } : {}),
      status: nextStatus,
      ...(body.is_featured !== undefined ? { is_featured: Boolean(body.is_featured) } : {}),
      ...(Array.isArray(body.variants) ? { variants: body.variants } : {}),
      updated_at: new Date().toISOString(),
    });
    saveDb(db);
    res.json(enrichProduct(db, db.products[idx]));
  });

  app.post('/api/admin/products/bulk-status', requireAdmin, (req, res) => {
    const { ids, status } = req.body ?? {};
    if (!Array.isArray(ids) || !status) {
      res.status(400).json({ error: 'Product IDs and target status are required.' });
      return;
    }
    const db = loadDb();
    for (const p of db.products) {
      if (ids.includes(p.id)) {
        p.status = status;
        p.updated_at = new Date().toISOString();
      }
    }
    saveDb(db);
    res.json({ ok: true });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    db.products[idx].is_deleted = true;
    db.products[idx].updated_at = new Date().toISOString();
    saveDb(db);
    res.json({ ok: true });
  });

  // --- Admin Categories ---
  app.get('/api/admin/categories', requireAdmin, (_req, res) => {
    const db = loadDb();
    const categories = db.categories.map((c) => ({
      ...c,
      product_count: db.products.filter((p) => !p.is_deleted && p.category_id === c.id).length,
    }));
    res.json(categories);
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const { name, slug, parent_id = null, image_url = null, is_active = true } = req.body ?? {};
    if (!name) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const db = loadDb();
    const newCat = {
      id: `cat-${crypto.randomUUID().slice(0, 8)}`,
      name: String(name).trim(),
      slug: slug ? slugify(String(slug)) : slugify(String(name)),
      parent_id: parent_id || null,
      image_url: image_url || '/src/assets/images/prod_headphones_1795178619261.jpg',
      is_active: Boolean(is_active),
      sort_order: db.categories.length + 1,
      created_at: new Date().toISOString(),
    };
    db.categories.push(newCat);
    saveDb(db);
    res.status(201).json(newCat);
  });

  app.patch('/api/admin/categories/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    const idx = db.categories.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    const { name, slug, parent_id, image_url, is_active } = req.body ?? {};
    Object.assign(db.categories[idx], {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(slug !== undefined ? { slug: slugify(String(slug)) } : {}),
      ...(parent_id !== undefined ? { parent_id: parent_id || null } : {}),
      ...(image_url !== undefined ? { image_url } : {}),
      ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
      updated_at: new Date().toISOString(),
    });
    saveDb(db);
    res.json(db.categories[idx]);
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    db.categories = db.categories.filter((c) => c.id !== req.params.id);
    for (const p of db.products) {
      if (p.category_id === req.params.id) p.category_id = null;
    }
    saveDb(db);
    res.json({ ok: true });
  });

  // --- Admin Orders ---
  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    const db = loadDb();
    const sorted = [...db.orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    res.json(sorted);
  });

  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    const idx = db.orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const { status, payment_status, tracking_number, admin_notes, cancel_reason } = req.body ?? {};
    const prevStatus = db.orders[idx].status;
    if (status) db.orders[idx].status = status;
    if (payment_status) db.orders[idx].payment_status = payment_status;
    if (tracking_number !== undefined) db.orders[idx].tracking_number = tracking_number;
    if (admin_notes !== undefined) db.orders[idx].admin_notes = admin_notes;
    if (cancel_reason !== undefined) db.orders[idx].cancel_reason = cancel_reason;
    db.orders[idx].updated_at = new Date().toISOString();

    // Restore stock when transitioning a non-cancelled order to cancelled
    if (status === 'cancelled' && prevStatus !== 'cancelled') {
      for (const item of db.orders[idx].items ?? []) {
        const pIdx = db.products.findIndex((p) => p.id === item.product_id);
        if (pIdx !== -1) {
          db.products[pIdx].stock_quantity += item.quantity;
          if (db.products[pIdx].status === 'out_of_stock' && db.products[pIdx].stock_quantity > 0) {
            db.products[pIdx].status = 'active';
          }
        }
      }
    }

    saveDb(db);
    res.json(db.orders[idx]);
  });

  // --- Admin Customers ---
  app.get('/api/admin/customers', requireAdmin, (_req, res) => {
    const db = loadDb();
    const customers = db.users
      .filter((u) => u.role === 'customer')
      .map((u) => {
        const userOrders = db.orders.filter((o) => o.user_id === u.id);
        return {
          ...sanitizeProfile(u),
          orders_count: userOrders.length,
          total_spent: userOrders
            .filter((o) => o.status !== 'cancelled')
            .reduce((s, o) => s + o.total, 0),
        };
      });
    res.json(customers);
  });

  app.get('/api/admin/customers/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    const customer = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
    if (!customer) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    const orders = db.orders
      .filter((o) => o.user_id === customer.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const addresses = db.addresses.filter((a) => a.user_id === customer.id);
    res.json({
      customer: {
        ...sanitizeProfile(customer),
        orders_count: orders.length,
        total_spent: orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
      },
      addresses,
      orders,
    });
  });

  app.patch('/api/admin/customers/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    const idx = db.users.findIndex((u) => u.id === req.params.id && u.role === 'customer');
    if (idx === -1) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    if (req.body?.is_blocked !== undefined) {
      db.users[idx].is_blocked = Boolean(req.body.is_blocked);
      db.users[idx].updated_at = new Date().toISOString();
    }
    saveDb(db);
    res.json(sanitizeProfile(db.users[idx]));
  });

  // --- Admin Coupons ---
  app.get('/api/admin/coupons', requireAdmin, (_req, res) => {
    const db = loadDb();
    res.json(db.coupons);
  });

  app.post('/api/admin/coupons', requireAdmin, (req, res) => {
    const { code, type, value, min_order_amount, max_uses, expires_at } = req.body ?? {};
    const numValue = Number(value);
    const numMinOrder = Number(min_order_amount) || 0;
    if (!code || !type || Number.isNaN(numValue) || numValue <= 0) {
      res.status(400).json({ error: 'Code, type, and a positive value are required.' });
      return;
    }
    if (type === 'percentage' && numValue > 100) {
      res.status(400).json({ error: 'Percentage discount cannot exceed 100%.' });
      return;
    }
    if (numMinOrder < 0) {
      res.status(400).json({ error: 'Minimum order amount cannot be negative.' });
      return;
    }
    const db = loadDb();
    const upper = String(code).trim().toUpperCase();
    if (db.coupons.some((c) => c.code.toUpperCase() === upper)) {
      res.status(409).json({ error: 'A coupon with this code already exists.' });
      return;
    }
    const coupon = {
      id: `cpn-${crypto.randomUUID().slice(0, 8)}`,
      code: upper,
      type,
      value: numValue,
      min_order_amount: numMinOrder,
      max_uses: max_uses ? Math.max(1, Number(max_uses)) : null,
      used_count: 0,
      expires_at: expires_at || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    db.coupons.unshift(coupon);
    saveDb(db);
    res.status(201).json(coupon);
  });

  app.patch('/api/admin/coupons/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    const idx = db.coupons.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }
    const { code, type, value, min_order_amount, max_uses, expires_at, is_active } = req.body ?? {};
    if (code !== undefined) {
      const upper = String(code).trim().toUpperCase();
      if (!upper) {
        res.status(400).json({ error: 'Coupon code cannot be empty.' });
        return;
      }
      if (db.coupons.some((c, i) => i !== idx && c.code.toUpperCase() === upper)) {
        res.status(409).json({ error: 'Another coupon already uses this code.' });
        return;
      }
    }
    const nextType = type !== undefined ? type : db.coupons[idx].type;
    const nextValue = value !== undefined ? Number(value) : db.coupons[idx].value;
    if (Number.isNaN(nextValue) || nextValue <= 0) {
      res.status(400).json({ error: 'Coupon value must be greater than 0.' });
      return;
    }
    if (nextType === 'percentage' && nextValue > 100) {
      res.status(400).json({ error: 'Percentage discount cannot exceed 100%.' });
      return;
    }
    Object.assign(db.coupons[idx], {
      ...(code !== undefined ? { code: String(code).trim().toUpperCase() } : {}),
      type: nextType,
      value: nextValue,
      ...(min_order_amount !== undefined
        ? { min_order_amount: Math.max(0, Number(min_order_amount) || 0) }
        : {}),
      ...(max_uses !== undefined ? { max_uses: max_uses ? Math.max(1, Number(max_uses)) : null } : {}),
      ...(expires_at !== undefined ? { expires_at: expires_at || null } : {}),
      ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
      updated_at: new Date().toISOString(),
    });
    saveDb(db);
    res.json(db.coupons[idx]);
  });

  // --- Admin Reviews ---
  app.get('/api/admin/reviews', requireAdmin, (_req, res) => {
    const db = loadDb();
    const enriched = [...db.reviews]
      .map((r) => ({
        ...r,
        product_title:
          r.product_title ||
          db.products.find((p) => p.id === r.product_id)?.title ||
          'Product',
        user_name:
          r.user_name ||
          db.users.find((u) => u.id === r.user_id)?.full_name ||
          'Customer',
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(enriched);
  });

  app.patch('/api/admin/reviews/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    const idx = db.reviews.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }
    if (req.body?.is_approved !== undefined) {
      db.reviews[idx].is_approved = Boolean(req.body.is_approved);
    }
    saveDb(db);
    res.json(db.reviews[idx]);
  });

  app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    db.reviews = db.reviews.filter((r) => r.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // --- Admin Banners ---
  app.get('/api/admin/banners', requireAdmin, (_req, res) => {
    const db = loadDb();
    res.json([...db.banners].sort((a, b) => a.sort_order - b.sort_order));
  });

  app.post('/api/admin/banners', requireAdmin, (req, res) => {
    const { title, subtitle, image_url, link_url, type = 'hero', sort_order = 1 } = req.body ?? {};
    if (!image_url) {
      res.status(400).json({ error: 'Banner image URL is required.' });
      return;
    }
    const db = loadDb();
    const banner = {
      id: `ban-${crypto.randomUUID().slice(0, 8)}`,
      title: String(title ?? '').trim(),
      subtitle: String(subtitle ?? '').trim(),
      image_url: String(image_url).trim(),
      link_url: String(link_url ?? '/products').trim(),
      type,
      sort_order: Number(sort_order) || 1,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    db.banners.push(banner);
    saveDb(db);
    res.status(201).json(banner);
  });

  app.patch('/api/admin/banners/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    const idx = db.banners.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Banner not found.' });
      return;
    }
    const { title, subtitle, image_url, link_url, type, sort_order, is_active } = req.body ?? {};
    Object.assign(db.banners[idx], {
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(subtitle !== undefined ? { subtitle: String(subtitle).trim() } : {}),
      ...(image_url !== undefined ? { image_url: String(image_url).trim() } : {}),
      ...(link_url !== undefined ? { link_url: String(link_url).trim() || '/products' } : {}),
      ...(type === 'hero' || type === 'promo' ? { type } : {}),
      ...(sort_order !== undefined ? { sort_order: Math.max(1, Number(sort_order) || 1) } : {}),
      ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
    });
    saveDb(db);
    res.json(db.banners[idx]);
  });

  app.delete('/api/admin/banners/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    db.banners = db.banners.filter((b) => b.id !== req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // --- Admin Businesses ---
  app.get('/api/admin/businesses', requireAdmin, (_req, res) => {
    const db = loadDb();
    const businesses = (db.businesses ?? []).map((biz) => {
      const category = db.categories.find((c) => c.id === biz.category_id);
      return {
        ...biz,
        category_name: category?.name ?? 'General',
        product_count: db.products.filter((p) => !p.is_deleted && p.business_id === biz.id).length,
      };
    });
    res.json(businesses);
  });

  app.post('/api/admin/businesses', requireAdmin, (req, res) => {
    const body = req.body ?? {};
    const name = String(body.name ?? '').trim();
    if (!name) {
      res.status(400).json({ error: 'Business name is required.' });
      return;
    }
    const db = loadDb();
    if (!Array.isArray(db.businesses)) db.businesses = [];
    const baseSlug = slugify(String(body.slug || name));
    const uniqueSlug = db.businesses.some((b) => b.slug === baseSlug)
      ? `${baseSlug}-${Date.now().toString().slice(-4)}`
      : baseSlug;
    const now = new Date().toISOString();
    const business: Business = {
      id: `biz-${crypto.randomUUID().slice(0, 8)}`,
      name,
      slug: uniqueSlug,
      category_id: body.category_id || null,
      tagline: String(body.tagline ?? '').trim(),
      description: String(body.description ?? '').trim(),
      details: String(body.details ?? '').trim(),
      city: String(body.city ?? 'Lahore').trim() || 'Lahore',
      whatsapp_number: String(body.whatsapp_number ?? db.settings.whatsapp_number ?? '03296730804').trim(),
      image_url:
        String(body.image_url ?? '').trim() ||
        '/src/assets/images/poster_admin_welcome_1795191692080.jpg',
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      created_at: now,
      updated_at: now,
    };
    db.businesses.unshift(business);
    saveDb(db);
    const category = db.categories.find((c) => c.id === business.category_id);
    res.status(201).json({ ...business, category_name: category?.name ?? 'General', product_count: 0 });
  });

  app.patch('/api/admin/businesses/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    if (!Array.isArray(db.businesses)) db.businesses = [];
    const idx = db.businesses.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Business not found.' });
      return;
    }
    const body = req.body ?? {};
    if (body.name !== undefined && !String(body.name).trim()) {
      res.status(400).json({ error: 'Business name cannot be empty.' });
      return;
    }
    Object.assign(db.businesses[idx], {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.category_id !== undefined ? { category_id: body.category_id || null } : {}),
      ...(body.tagline !== undefined ? { tagline: String(body.tagline).trim() } : {}),
      ...(body.description !== undefined ? { description: String(body.description).trim() } : {}),
      ...(body.details !== undefined ? { details: String(body.details).trim() } : {}),
      ...(body.city !== undefined ? { city: String(body.city).trim() } : {}),
      ...(body.whatsapp_number !== undefined
        ? { whatsapp_number: String(body.whatsapp_number).trim() }
        : {}),
      ...(body.image_url !== undefined && String(body.image_url).trim()
        ? { image_url: String(body.image_url).trim() }
        : {}),
      ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
      updated_at: new Date().toISOString(),
    });
    saveDb(db);
    const updated = db.businesses[idx];
    const category = db.categories.find((c) => c.id === updated.category_id);
    res.json({
      ...updated,
      category_name: category?.name ?? 'General',
      product_count: db.products.filter((p) => !p.is_deleted && p.business_id === updated.id).length,
    });
  });

  app.delete('/api/admin/businesses/:id', requireAdmin, (req, res) => {
    const db = loadDb();
    if (!Array.isArray(db.businesses)) db.businesses = [];
    db.businesses = db.businesses.filter((b) => b.id !== req.params.id);
    for (const p of db.products) {
      if (p.business_id === req.params.id) {
        p.business_id = null;
      }
    }
    saveDb(db);
    res.json({ ok: true });
  });

  // --- Admin Data Quality ---
  app.get('/api/admin/data-quality', requireAdmin, (_req, res) => {
    const db = loadDb();
    const report = evaluateCatalogDataQuality(
      db.products,
      db.categories,
      db.businesses ?? [],
      db.settings.low_stock_threshold
    );
    res.json({
      ...report,
      storeReadiness: {
        hasWhatsappNumber: Boolean(db.settings.whatsapp_number?.trim()),
        hasAdminPoster: Boolean(db.settings.admin_poster_image_url?.trim()),
        activeBannersCount: db.banners.filter((b) => b.is_active).length,
      },
    });
  });

  // --- Admin Settings & Reports ---
  app.patch('/api/admin/settings', requireAdmin, (req, res) => {
    const db = loadDb();
    const {
      store_name,
      store_logo_url,
      contact_email,
      contact_phone,
      flat_shipping_cost,
      free_shipping_threshold,
      cod_enabled,
      low_stock_threshold,
      maintenance_mode,
      whatsapp_number,
      admin_poster_enabled,
      admin_poster_title,
      admin_poster_subtitle,
      admin_poster_image_url,
      admin_poster_cta_label,
      admin_poster_cta_url,
    } = req.body ?? {};
    Object.assign(db.settings, {
      ...(store_name !== undefined ? { store_name: String(store_name).trim() || 'Zyro Mall' } : {}),
      ...(store_logo_url !== undefined ? { store_logo_url: store_logo_url || null } : {}),
      ...(contact_email !== undefined ? { contact_email: String(contact_email).trim() } : {}),
      ...(contact_phone !== undefined ? { contact_phone: String(contact_phone).trim() } : {}),
      ...(flat_shipping_cost !== undefined
        ? { flat_shipping_cost: Math.max(0, Number(flat_shipping_cost) || 0) }
        : {}),
      ...(free_shipping_threshold !== undefined
        ? { free_shipping_threshold: Math.max(0, Number(free_shipping_threshold) || 0) }
        : {}),
      ...(cod_enabled !== undefined ? { cod_enabled: Boolean(cod_enabled) } : {}),
      ...(low_stock_threshold !== undefined
        ? { low_stock_threshold: Math.max(0, Number(low_stock_threshold) || 0) }
        : {}),
      ...(maintenance_mode !== undefined ? { maintenance_mode: Boolean(maintenance_mode) } : {}),
      ...(whatsapp_number !== undefined
        ? { whatsapp_number: String(whatsapp_number).trim() || '03296730804' }
        : {}),
      ...(admin_poster_enabled !== undefined
        ? { admin_poster_enabled: Boolean(admin_poster_enabled) }
        : {}),
      ...(admin_poster_title !== undefined
        ? { admin_poster_title: String(admin_poster_title).trim() }
        : {}),
      ...(admin_poster_subtitle !== undefined
        ? { admin_poster_subtitle: String(admin_poster_subtitle).trim() }
        : {}),
      ...(admin_poster_image_url !== undefined && String(admin_poster_image_url).trim()
        ? { admin_poster_image_url: String(admin_poster_image_url).trim() }
        : {}),
      ...(admin_poster_cta_label !== undefined
        ? { admin_poster_cta_label: String(admin_poster_cta_label).trim() || 'Browse Live Storefront' }
        : {}),
      ...(admin_poster_cta_url !== undefined
        ? { admin_poster_cta_url: String(admin_poster_cta_url).trim() || '/products' }
        : {}),
      updated_at: new Date().toISOString(),
    });
    saveDb(db);
    res.json(db.settings);
  });

  app.get('/api/admin/reports', requireAdmin, (req, res) => {
    const db = loadDb();
    const { from, to } = req.query as { from?: string; to?: string };
    let orders = [...db.orders];
    if (from) orders = orders.filter((o) => o.created_at.slice(0, 10) >= from);
    if (to) orders = orders.filter((o) => o.created_at.slice(0, 10) <= to);

    const statusCounts: Record<string, number> = {};
    const productSales = new Map<
      string,
      { product_title: string; units: number; revenue: number }
    >();
    const dailyRevenue = new Map<string, number>();

    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
      if (o.status !== 'cancelled') {
        const day = o.created_at.slice(0, 10);
        dailyRevenue.set(day, (dailyRevenue.get(day) ?? 0) + o.total);
        for (const item of o.items ?? []) {
          const key = item.product_id ?? item.product_title;
          const prev = productSales.get(key) ?? {
            product_title: item.product_title,
            units: 0,
            revenue: 0,
          };
          prev.units += item.quantity;
          prev.revenue += item.total_price;
          productSales.set(key, prev);
        }
      }
    }

    const statusBreakdown = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
    const bestSellers = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    const revenueSeries = Array.from(dailyRevenue.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    res.json({
      orders,
      statusBreakdown,
      bestSellers,
      revenueSeries,
    });
  });

  // --- Smart Catalog & Merchandising Advisor Endpoint ---
  app.post('/api/ai/analyze', async (req, res) => {
    const { query, mode = 'catalog' } = req.body ?? {};
    if (!query || !String(query).trim()) {
      res.status(400).json({ error: 'Please enter a question or scenario to analyze.' });
      return;
    }

    const db = loadDb();
    const activeProducts = db.products.filter(
      (p) => !p.is_deleted && p.status !== 'draft' && p.stock_quantity > 0
    );
    const terms = String(query)
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (mode === 'admin_report') {
      const lowStock = db.products.filter(
        (p) => !p.is_deleted && p.stock_quantity <= db.settings.low_stock_threshold
      );
      const validOrders = db.orders.filter((o) => o.status !== 'cancelled');
      const totalRevenue = validOrders.reduce((s, o) => s + o.total, 0);
      const answer = [
        `Zyro Mall Operations Summary:`,
        `• Active catalog: ${activeProducts.length} in-stock products across ${db.categories.length} categories.`,
        `• Valid orders: ${validOrders.length} totaling PKR ${totalRevenue.toLocaleString('en-PK')}.`,
        `• Low-stock / out-of-stock alerts (<= ${db.settings.low_stock_threshold} units): ${lowStock.length} product(s).`,
        lowStock.length > 0
          ? `• Priority restock: ${lowStock
              .slice(0, 5)
              .map((p) => `${p.title} (${p.stock_quantity} left)`)
              .join(', ')}.`
          : `• Inventory health is strong across all active SKUs.`,
        `• Free shipping threshold is set to PKR ${db.settings.free_shipping_threshold.toLocaleString('en-PK')} — bundle items around PKR 2,500–3,500 to lift average order value.`,
      ].join('\n');
      res.json({ answer });
      return;
    }

    const scored = activeProducts
      .map((p) => {
        const hay = `${p.title} ${p.description} ${p.sku}`.toLowerCase();
        const hits = terms.reduce((acc, term) => acc + (hay.includes(term) ? 1 : 0), 0);
        return { product: p, score: hits + (p.is_featured ? 0.5 : 0) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((entry) => entry.product);

    const activeCoupon = db.coupons.find((c) => c.is_active);
    const recommendations = scored
      .map((p) => {
        const price = getEffectivePrice(p);
        return `• ${p.title} (${p.sku}) — PKR ${price.toLocaleString('en-PK')} (${p.stock_quantity} in stock)`;
      })
      .join('\n');

    const answer = [
      `Top matches from Zyro Mall's live catalog:`,
      recommendations,
      '',
      `Free delivery applies automatically on orders of PKR ${db.settings.free_shipping_threshold.toLocaleString('en-PK')} or more (otherwise flat PKR ${db.settings.flat_shipping_cost}).`,
      activeCoupon
        ? `Tip: Apply promo code ${activeCoupon.code} in your cart for extra savings.`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    res.json({ answer });
  });

  // --- Vite / Static Serving ---
  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zyro Mall server running at http://localhost:${PORT}`);
  });
}

startServer();
