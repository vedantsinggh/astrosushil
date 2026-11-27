'use client';

import { GstBreakdown, rupeeTextToPaise } from '../GstBreakdown';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiErrorMessage } from '../../lib/api/uploads';
import type { UploadedFileRef } from '../../lib/api/uploads';
import {
  CategoryTreeNode,
  ShopDiscountType,
  ShopProduct,
  ShopProductInput,
  ShopProductType,
  ShopProductVariantInput,
  createShopProduct,
  discountInputText,
  fetchCategoryTree,
  flattenCategoryTree,
  paiseToRupeesText,
  rupeesToPaise,
  updateShopProduct,
} from '../../lib/api/catalogue';
import { UploadField } from '../uploads/UploadField';
import { Checkbox, Field, Notice, SectionCard, TagInput, gridTwo, smallButton } from './ui';

const MAX_IMAGES = 10;
const MAX_VARIANTS = 50;

interface VariantForm {
  uid: string;
  /** Row id of a stored variant; absent for one added in this form. */
  id?: string;
  name: string;
  value: string;
  mrp: string;
  stock: string;
  metaTitle: string;
  metaDescription: string;
  file: UploadedFileRef | null;
  fileName: string;
  fileChanged: boolean;
}

interface FormState {
  type: ShopProductType;
  name: string;
  hindiTitle: string;
  shortDescription: string;
  description: string;
  hindiDescription: string;
  categoryId: string;
  sku: string;
  hsnSac: string;
  hasVariants: boolean;
  mrp: string;
  discountType: ShopDiscountType;
  discountValue: string;
  stock: string;
  gstEnabled: boolean;
  gstRate: string;
  gstType: 'inclusive' | 'exclusive';
  weightGrams: string;
  length: string;
  width: string;
  height: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  isPublished: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  thumbnail: UploadedFileRef | null;
  images: UploadedFileRef[];
  productFile: UploadedFileRef | null;
  productFileName: string;
}

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `variant-${uidCounter}`;
}

function emptyVariant(): VariantForm {
  return { uid: nextUid(), name: '', value: '', mrp: '', stock: '0', metaTitle: '', metaDescription: '', file: null, fileName: '', fileChanged: false };
}

function numberText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function initialState(product?: ShopProduct): FormState {
  if (!product) {
    return {
      type: 'physical',
      name: '',
      hindiTitle: '',
      shortDescription: '',
      description: '',
      hindiDescription: '',
      categoryId: '',
      sku: '',
      hsnSac: '',
      hasVariants: false,
      mrp: '',
      discountType: 'percentage',
      discountValue: '',
      stock: '',
      gstEnabled: true,
      gstRate: '0',
      gstType: 'exclusive',
      weightGrams: '',
      length: '',
      width: '',
      height: '',
      metaTitle: '',
      metaDescription: '',
      keywords: [],
      isPublished: true,
      isAvailable: true,
      isFeatured: false,
      isTrending: false,
      isBestSeller: false,
      thumbnail: null,
      images: [],
      productFile: null,
      productFileName: '',
    };
  }
  const galleryKeys = Array.isArray(product.metadata?.galleryKeys) ? (product.metadata?.galleryKeys as unknown[]) : [];
  const assetName = typeof product.metadata?.digitalAssetName === 'string' ? (product.metadata.digitalAssetName as string) : '';
  return {
    type: product.type,
    name: product.name,
    hindiTitle: product.hindiTitle ?? '',
    shortDescription: product.shortDescription ?? '',
    description: product.description ?? '',
    hindiDescription: product.hindiDescription ?? '',
    categoryId: product.categoryId ?? '',
    sku: product.sku ?? '',
    hsnSac: product.hsnSac ?? '',
    hasVariants: product.hasVariants,
    mrp: product.hasVariants ? '' : paiseToRupeesText(product.mrp),
    discountType: product.discountType,
    discountValue: discountInputText(product),
    stock: numberText(product.stock),
    gstEnabled: product.gst.enabled,
    gstRate: numberText(product.gst.rate),
    gstType: product.gst.type,
    weightGrams: numberText(product.weightGrams),
    length: numberText(product.dimensions?.length),
    width: numberText(product.dimensions?.width),
    height: numberText(product.dimensions?.height),
    metaTitle: product.metaTitle ?? '',
    metaDescription: product.metaDescription ?? '',
    keywords: product.keywords ?? [],
    isPublished: product.isPublished,
    isAvailable: product.isAvailable,
    isFeatured: product.isFeatured,
    isTrending: product.isTrending,
    isBestSeller: product.isBestSeller,
    thumbnail: product.thumbnail ? { url: product.thumbnail, key: product.thumbnailKey } : null,
    images: (product.images ?? []).map((url, index) => ({
      url,
      key: galleryKeys.length === product.images.length && typeof galleryKeys[index] === 'string' ? (galleryKeys[index] as string) : null,
    })),
    productFile: product.downloadableFile ? { url: null, key: product.downloadableFile.key } : null,
    productFileName: assetName,
  };
}

function initialVariants(product?: ShopProduct): VariantForm[] {
  if (!product) return [];
  return product.variants.map((v) => ({
    uid: nextUid(),
    id: v.variantId,
    name: v.name,
    value: v.value,
    mrp: paiseToRupeesText(v.mrp),
    stock: numberText(v.stock),
    metaTitle: v.metaTitle ?? '',
    metaDescription: v.metaDescription ?? '',
    file: v.downloadableFile ? { url: null, key: v.downloadableFile.key } : null,
    fileName: v.downloadableFile?.name ?? '',
    fileChanged: false,
  }));
}

function parseWholeNumber(text: string, min: number): number | null {
  const trimmed = text.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= min ? value : null;
}

function parseDecimal(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Selling price (rupee text) the server derives from MRP and discount (shop-pricing.ts deriveSellingPrice). */
function sellingPriceText(mrpText: string, discountType: string, discountText: string): string {
  const mrp = rupeeTextToPaise(mrpText);
  if (mrp === null) return '';
  const d = Number(String(discountText ?? '').trim() || '0');
  if (!Number.isFinite(d) || d <= 0) return (mrp / 100).toFixed(2);
  const price = discountType === 'percentage' ? Math.max(0, Math.round(mrp - (mrp * Math.round(d * 100)) / 10000)) : Math.max(0, mrp - Math.round(d * 100));
  return (price / 100).toFixed(2);
}

export function ProductForm({ product, onSaved }: { product?: ShopProduct; onSaved: (product: ShopProduct) => void }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState<FormState>(() => initialState(product));
  const [variants, setVariants] = useState<VariantForm[]>(() => initialVariants(product));
  const [thumbnailChanged, setThumbnailChanged] = useState(false);
  const [imagesChanged, setImagesChanged] = useState(false);
  const [productFileChanged, setProductFileChanged] = useState(false);
  const [variantsChanged, setVariantsChanged] = useState(false);

  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCategoryTree()
      .then((tree) => {
        if (!cancelled) setCategories(tree);
      })
      .catch((err) => {
        if (!cancelled) setCategoriesError(apiErrorMessage(err, 'Categories could not be loaded'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryOptions = useMemo(() => flattenCategoryTree(categories), [categories]);
  const isDigital = form.type === 'digital';
  const isPhysical = form.type === 'physical';

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const updateVariant = (uid: string, patch: Partial<VariantForm>) => {
    setVariants((current) => current.map((v) => (v.uid === uid ? { ...v, ...patch } : v)));
    setVariantsChanged(true);
  };

  /** Checks the form against the backend schema and builds the request body. */
  const build = (): { body: ShopProductInput | null; problems: string[] } => {
    const found: string[] = [];
    const name = form.name.trim();
    if (name.length < 2 || name.length > 300) found.push('Product name must be 2 to 300 characters.');
    if (form.shortDescription.trim().length > 2000) found.push('Short description must be at most 2000 characters.');
    if (form.sku.trim().length > 100) found.push('SKU must be at most 100 characters.');
    if (form.hsnSac.trim() && !/^(\d{4}|\d{6}|\d{8})$/.test(form.hsnSac.trim())) found.push('HSN code must be 4, 6 or 8 digits.');
    if (form.metaTitle.trim().length > 300) found.push('Meta title must be at most 300 characters.');
    if (form.metaDescription.trim().length > 1000) found.push('Meta description must be at most 1000 characters.');

    const body: ShopProductInput = {
      name,
      hindiTitle: form.hindiTitle.trim() || null,
      shortDescription: form.shortDescription.trim() || null,
      description: form.description || null,
      hindiDescription: form.hindiDescription || null,
      type: form.type,
      categoryId: form.categoryId || null,
      hasVariants: form.hasVariants,
      discountType: form.discountType,
      sku: form.sku.trim() || null,
      hsnSac: form.hsnSac.trim() || null,
      metaTitle: form.metaTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
      keywords: form.keywords,
      isPublished: form.isPublished,
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
      isTrending: form.isTrending,
      isBestSeller: form.isBestSeller,
    };

    // Discount: a percentage (0 to 100) or a fixed amount in rupees, sent as paise.
    if (form.discountValue.trim() === '') {
      body.discountValue = 0;
    } else if (form.discountType === 'percentage') {
      const percent = parseDecimal(form.discountValue);
      if (percent === null || percent > 100) found.push('Discount must be a percentage between 0 and 100.');
      else body.discountValue = percent;
    } else {
      const paise = rupeesToPaise(form.discountValue);
      if (paise === null) found.push('Discount must be an amount in rupees (up to 2 decimals).');
      else body.discountValue = paise;
    }

    // GST
    const rate = form.gstRate.trim() === '' ? 0 : parseDecimal(form.gstRate);
    if (rate === null || rate > 100) found.push('GST rate must be between 0 and 100.');
    else body.gst = { enabled: form.gstEnabled, rate, type: form.gstType };

    // Price and stock: on the product, or on each variant.
    if (!form.hasVariants) {
      const mrp = rupeesToPaise(form.mrp);
      if (mrp === null) found.push('MRP is required: an amount in rupees (up to 2 decimals).');
      else body.mrpPaise = mrp;

      if (form.stock.trim() !== '') {
        const stock = parseWholeNumber(form.stock, -1);
        if (stock === null) found.push('Stock must be a whole number (-1 means stock is not tracked).');
        else body.stock = stock;
      }
    } else {
      if (variants.length === 0) found.push('Add at least one variant, or turn variants off.');
      const sendVariants = !isEdit || variantsChanged || product?.hasVariants !== true;
      const list: ShopProductVariantInput[] = [];
      variants.forEach((v, index) => {
        const label = `Variant ${index + 1}`;
        const vName = v.name.trim();
        const vValue = v.value.trim();
        if (!vName || vName.length > 100) found.push(`${label}: option name is required (up to 100 characters).`);
        if (!vValue || vValue.length > 200) found.push(`${label}: value is required (up to 200 characters).`);
        const mrp = rupeesToPaise(v.mrp);
        if (mrp === null) found.push(`${label}: MRP is required, in rupees.`);
        const stock = v.stock.trim() === '' ? 0 : parseWholeNumber(v.stock, 0);
        if (stock === null) found.push(`${label}: stock must be a whole number, 0 or more.`);
        if (isDigital && !v.file?.key) found.push(`${label}: a digital variant needs a downloadable file.`);

        const item: ShopProductVariantInput = {
          ...(v.id ? { id: v.id } : {}),
          name: vName,
          value: vValue,
          mrpPaise: mrp ?? 0,
          stock: stock ?? 0,
          metaTitle: v.metaTitle.trim(),
          metaDescription: v.metaDescription.trim(),
        };
        // A stored file that was not touched is left out, which keeps it.
        if (!v.id || v.fileChanged) {
          item.downloadableFile = v.file?.key ? { key: v.file.key, ...(v.fileName.trim() ? { name: v.fileName.trim() } : {}) } : null;
        }
        list.push(item);
      });
      if (sendVariants) body.variants = list;
    }

    // Shipping details
    if (form.weightGrams.trim() === '') {
      body.weightGrams = null;
    } else {
      const weight = parseWholeNumber(form.weightGrams, 0);
      if (weight === null) found.push('Weight must be a whole number of grams.');
      else body.weightGrams = weight;
    }
    const dims: { length?: number; width?: number; height?: number } = {};
    for (const key of ['length', 'width', 'height'] as const) {
      if (form[key].trim() === '') continue;
      const value = parseDecimal(form[key]);
      if (value === null) found.push(`Dimension "${key}" must be a number, 0 or more.`);
      else dims[key] = value;
    }
    body.dimensions = Object.keys(dims).length > 0 ? dims : null;

    // Files: on an update only what was changed is sent, so untouched stored references stay as they are.
    if (form.images.length > MAX_IMAGES) found.push(`At most ${MAX_IMAGES} gallery images.`);
    if (!isEdit) {
      if (form.images.length > 0) body.images = form.images;
      if (form.thumbnail) body.thumbnail = form.thumbnail;
    } else {
      if (imagesChanged) body.images = form.images;
      if (thumbnailChanged) body.thumbnail = form.thumbnail;
    }
    if (isDigital && !form.hasVariants) {
      const file = form.productFile?.key
        ? { key: form.productFile.key, ...(form.productFileName.trim() ? { name: form.productFileName.trim() } : {}) }
        : null;
      if (!isEdit) {
        if (file) body.downloadableFile = file;
      } else if (productFileChanged) {
        body.downloadableFile = file;
      }
    }

    return { body: found.length > 0 ? null : body, problems: found };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError(null);
    const result = build();
    setProblems(result.problems);
    if (!result.body) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setIsSaving(true);
    try {
      const saved = product ? await updateShopProduct(product.id, result.body) : await createShopProduct(result.body);
      onSaved(saved);
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'Failed to save the product'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {saveError && <Notice kind="error">{saveError}</Notice>}
      {problems.length > 0 && (
        <Notice kind="error">
          Please fix the following before saving:
          <ul style={{ margin: '0.4rem 0 0 1.1rem' }}>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Notice>
      )}

      <SectionCard title="Basic Information">
        <div style={gridTwo}>
          <Field label="Product Type" required>
            <select className="input-control" value={form.type} onChange={(e) => set('type', e.target.value as ShopProductType)}>
              <option value="physical">Physical (shipped)</option>
              <option value="digital">Digital (download)</option>
              <option value="service">Service</option>
            </select>
          </Field>
          <Field label="Category" error={categoriesError}>
            <select className="input-control" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">No category</option>
              {categoryOptions.map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {'— '.repeat(depth)}
                  {node.name} ({node.productType}
                  {node.isActive ? '' : ', inactive'})
                </option>
              ))}
              {form.categoryId && !categoryOptions.some(({ node }) => node.id === form.categoryId) && (
                <option value={form.categoryId}>{product?.categoryInfo?.name || 'Current category'}</option>
              )}
            </select>
          </Field>
        </div>
        {form.type === 'service' && (
          <Notice kind="warning">
            Service products have no delivery rule on the server yet (docs/integration/modules/shop.md, hook 6). Do not
            publish a service product until that is in place.
          </Notice>
        )}
        <Field label="Product Name" required hint={isEdit ? 'The URL slug is set when the product is created and does not change with the name.' : undefined}>
          <input type="text" className="input-control" required minLength={2} maxLength={300} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Hindi Title">
          <input type="text" className="input-control" maxLength={300} value={form.hindiTitle} onChange={(e) => set('hindiTitle', e.target.value)} />
        </Field>
        <Field label="Short Description" hint="A brief summary shown in listings.">
          <textarea className="input-control" rows={2} maxLength={2000} value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
        </Field>
        <Field label="Full Description" hint="Plain text or HTML. It is stored exactly as typed.">
          <textarea className="input-control" rows={8} maxLength={100000} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Hindi Description">
          <textarea className="input-control" rows={4} maxLength={100000} value={form.hindiDescription} onChange={(e) => set('hindiDescription', e.target.value)} />
        </Field>
        <Field label="SKU" style={{ maxWidth: '320px' }}>
          <input type="text" className="input-control" maxLength={100} value={form.sku} onChange={(e) => set('sku', e.target.value)} />
        </Field>
        <Field label="HSN code (GST invoice)" style={{ maxWidth: '320px' }}>
          <input type="text" inputMode="numeric" className="input-control" maxLength={8} placeholder="Blank = default from Website Settings" value={form.hsnSac} onChange={(e) => set('hsnSac', e.target.value.replace(/\D/g, ''))} />
        </Field>
      </SectionCard>

      <SectionCard title="Pricing & Tax">
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          The selling price is calculated by the server from the MRP and the discount{form.hasVariants ? ', for each variant' : ''}.
        </p>
        <div style={gridTwo}>
          {!form.hasVariants && (
            <Field label="MRP (₹)" required>
              <input type="text" inputMode="decimal" className="input-control" placeholder="Maximum retail price" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
            </Field>
          )}
          <Field label="Discount Type">
            <select className="input-control" value={form.discountType} onChange={(e) => set('discountType', e.target.value as ShopDiscountType)}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount (₹)</option>
            </select>
          </Field>
          <Field label={form.discountType === 'percentage' ? 'Discount (%)' : 'Discount (₹)'} hint="Leave empty for no discount.">
            <input type="text" inputMode="decimal" className="input-control" value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)} />
          </Field>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <Checkbox label="Apply GST" checked={form.gstEnabled} onChange={(v) => set('gstEnabled', v)} hint="Turn off if this product is tax-exempt." />
        </div>
        <div style={gridTwo}>
          <Field label="GST Rate (%)">
            <input type="text" inputMode="decimal" className="input-control" disabled={!form.gstEnabled} value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} />
          </Field>
          <Field label="This price is">
            <select className="input-control" disabled={!form.gstEnabled} value={form.gstType} onChange={(e) => set('gstType', e.target.value as 'inclusive' | 'exclusive')}>
              <option value="exclusive">Exclusive of GST</option>
              <option value="inclusive">Inclusive of GST</option>
            </select>
          </Field>
        </div>
        {!form.hasVariants && (
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selling price after discount:</span>
            <GstBreakdown amountText={sellingPriceText(form.mrp, form.discountType, form.discountValue)} ratePercentText={form.gstRate} inclusive={form.gstType === 'inclusive'} gstEnabled={form.gstEnabled} />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Variants">
        <div style={{ marginBottom: '1rem' }}>
          <Checkbox
            label="This product has variants"
            checked={form.hasVariants}
            onChange={(v) => {
              set('hasVariants', v);
              setVariantsChanged(true);
              if (v && variants.length === 0) setVariants([emptyVariant()]);
            }}
            hint="Each variant has its own MRP and stock; a digital product's variant also has its own file."
          />
        </div>
        {form.hasVariants && isEdit && (
          <Notice kind="warning">
            The list below is saved as the complete list of variants. A variant you remove here is deleted from the
            product and from customers&apos; carts when you save.
          </Notice>
        )}
        {form.hasVariants &&
          variants.map((v, index) => (
            <div key={v.uid} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>
                  Variant {index + 1}
                  {!v.id && isEdit ? ' (new)' : ''}
                </strong>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ ...smallButton, color: 'var(--badge-danger-text)' }}
                  onClick={() => {
                    setVariants((current) => current.filter((x) => x.uid !== v.uid));
                    setVariantsChanged(true);
                  }}
                >
                  Remove
                </button>
              </div>
              <div style={gridTwo}>
                <Field label="Option Name" required>
                  <input type="text" className="input-control" placeholder="e.g. Size" maxLength={100} value={v.name} onChange={(e) => updateVariant(v.uid, { name: e.target.value })} />
                </Field>
                <Field label="Value" required>
                  <input type="text" className="input-control" placeholder="e.g. Large" maxLength={200} value={v.value} onChange={(e) => updateVariant(v.uid, { value: e.target.value })} />
                </Field>
                <Field label="MRP (₹)" required>
                  <input type="text" inputMode="decimal" className="input-control" value={v.mrp} onChange={(e) => updateVariant(v.uid, { mrp: e.target.value })} />
                  <GstBreakdown amountText={sellingPriceText(v.mrp, form.discountType, form.discountValue)} ratePercentText={form.gstRate} inclusive={form.gstType === 'inclusive'} gstEnabled={form.gstEnabled} />
                </Field>
                <Field label="Stock">
                  <input type="text" inputMode="numeric" className="input-control" value={v.stock} onChange={(e) => updateVariant(v.uid, { stock: e.target.value })} />
                </Field>
                <Field label="Meta Title">
                  <input type="text" className="input-control" maxLength={300} value={v.metaTitle} onChange={(e) => updateVariant(v.uid, { metaTitle: e.target.value })} />
                </Field>
                <Field label="Meta Description">
                  <input type="text" className="input-control" maxLength={1000} value={v.metaDescription} onChange={(e) => updateVariant(v.uid, { metaDescription: e.target.value })} />
                </Field>
              </div>
              {isDigital && (
                <div>
                  <UploadField
                    purpose="digital-product"
                    label="Downloadable File *"
                    hint="The file customers receive after buying this variant. It is stored privately."
                    value={v.file}
                    disabled={isSaving}
                    onChange={(file) => updateVariant(v.uid, { file, fileChanged: true })}
                  />
                  <Field label="File name shown to customers" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. guide.pdf"
                      maxLength={255}
                      value={v.fileName}
                      onChange={(e) => updateVariant(v.uid, { fileName: e.target.value, fileChanged: Boolean(v.file) || v.fileChanged })}
                    />
                  </Field>
                </div>
              )}
            </div>
          ))}
        {form.hasVariants && variants.length < MAX_VARIANTS && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
            onClick={() => {
              setVariants((current) => [...current, emptyVariant()]);
              setVariantsChanged(true);
            }}
          >
            Add Variant
          </button>
        )}
      </SectionCard>

      {!form.hasVariants && (
        <SectionCard title="Inventory">
          <Field label="Stock" hint="-1 means stock is not tracked. Left empty on a new product: 0 for a physical product, not tracked otherwise." style={{ maxWidth: '320px' }}>
            <input type="text" inputMode="numeric" className="input-control" placeholder="Available quantity" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
          </Field>
        </SectionCard>
      )}

      {isDigital && !form.hasVariants && (
        <SectionCard title="Downloadable File">
          <UploadField
            purpose="digital-product"
            hint="The file customers receive after buying. It is stored privately and never shown publicly."
            value={form.productFile}
            disabled={isSaving}
            onChange={(file) => {
              set('productFile', file);
              setProductFileChanged(true);
            }}
          />
          <Field label="File name shown to customers" style={{ marginTop: '0.75rem', marginBottom: 0, maxWidth: '420px' }}>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. guide.pdf"
              maxLength={255}
              value={form.productFileName}
              onChange={(e) => {
                set('productFileName', e.target.value);
                if (form.productFile) setProductFileChanged(true);
              }}
            />
          </Field>
        </SectionCard>
      )}

      <SectionCard title="Images">
        {isDigital && (
          <Notice kind="info">
            The thumbnail and preview images of a digital product are watermarked by the server when they are uploaded.
            If the server reports that image processing is unavailable, the image is not uploaded and the message is
            shown under the field.
          </Notice>
        )}
        <div style={{ marginBottom: '1.25rem' }}>
          <UploadField
            purpose="product"
            label="Thumbnail"
            watermark={isDigital}
            value={form.thumbnail}
            disabled={isSaving}
            onChange={(thumbnail) => {
              set('thumbnail', thumbnail);
              setThumbnailChanged(true);
            }}
          />
        </div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          Gallery ({form.images.length} of {MAX_IMAGES})
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.75rem' }}>
          {form.images.map((image, index) => (
            <UploadField
              key={`${image.key || image.url || 'image'}-${index}`}
              purpose="product"
              watermark={isDigital}
              value={image}
              disabled={isSaving}
              onChange={(next) => {
                setForm((current) => ({
                  ...current,
                  images: next ? current.images.map((img, i) => (i === index ? next : img)) : current.images.filter((_, i) => i !== index),
                }));
                setImagesChanged(true);
              }}
            />
          ))}
          {form.images.length < MAX_IMAGES && (
            <UploadField
              key={`add-${form.images.length}`}
              purpose="product"
              watermark={isDigital}
              value={null}
              hint="Add a gallery image."
              disabled={isSaving}
              onChange={(next) => {
                if (!next) return;
                setForm((current) => ({ ...current, images: [...current.images, next] }));
                setImagesChanged(true);
              }}
            />
          )}
        </div>
      </SectionCard>

      {isPhysical && (
        <SectionCard title="Shipping Details">
          <div style={gridTwo}>
            <Field label="Weight (grams)">
              <input type="text" inputMode="numeric" className="input-control" placeholder="e.g. 250" value={form.weightGrams} onChange={(e) => set('weightGrams', e.target.value)} />
            </Field>
            <Field label="Length (cm)">
              <input type="text" inputMode="decimal" className="input-control" value={form.length} onChange={(e) => set('length', e.target.value)} />
            </Field>
            <Field label="Width (cm)">
              <input type="text" inputMode="decimal" className="input-control" value={form.width} onChange={(e) => set('width', e.target.value)} />
            </Field>
            <Field label="Height (cm)">
              <input type="text" inputMode="decimal" className="input-control" value={form.height} onChange={(e) => set('height', e.target.value)} />
            </Field>
          </div>
        </SectionCard>
      )}

      <SectionCard title="SEO">
        <Field label="Meta Title">
          <input type="text" className="input-control" maxLength={300} value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} />
        </Field>
        <Field label="Meta Description">
          <textarea className="input-control" rows={2} maxLength={1000} value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
        </Field>
        <Field label="Keywords / Tags" hint="Press Enter to add. Up to 50.">
          <TagInput value={form.keywords} onChange={(keywords) => set('keywords', keywords)} placeholder="Add keyword and press Enter" />
        </Field>
      </SectionCard>

      <SectionCard title="Publishing">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <Checkbox label="Published" checked={form.isPublished} onChange={(v) => set('isPublished', v)} hint="Visible in the shop." />
          <Checkbox label="Available" checked={form.isAvailable} onChange={(v) => set('isAvailable', v)} hint="Can be bought." />
          <Checkbox label="Featured" checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} />
          <Checkbox label="Trending" checked={form.isTrending} onChange={(v) => set('isTrending', v)} />
          <Checkbox label="Best Seller" checked={form.isBestSeller} onChange={(v) => set('isBestSeller', v)} />
        </div>
      </SectionCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '2rem' }}>
        <Link href={product ? `/shop-products/${product.id}` : '/shop-products'} className="btn btn-secondary">
          Cancel
        </Link>
        <button type="submit" disabled={isSaving} className="btn btn-primary">
          {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
