import { supabase } from './supabase'

// Helper — throws on Supabase error
function check<T>(data: T | null, error: unknown): T {
  if (error) throw new Error((error as { message?: string }).message || 'Supabase error')
  return data!
}

function margin(sell: number, buy: number) {
  return { margin: sell - buy, profitPercentage: buy > 0 ? ((sell - buy) / buy) * 100 : 0 }
}

function stockStatus(qty: number): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  return qty <= 0 ? 'OUT_OF_STOCK' : qty <= 5 ? 'LOW_STOCK' : 'IN_STOCK'
}

// Upload a base64 data URL to Supabase Storage and return the public URL.
// Falls back to returning the original data URL if upload fails.
export async function uploadBillPhoto(dataUrl: string): Promise<string> {
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('bill-photos').upload(path, blob, { contentType: blob.type, upsert: false })
    if (error) return dataUrl
    const { data } = supabase.storage.from('bill-photos').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return dataUrl
  }
}

const api = {
  get: async (path: string, config?: { params?: Record<string, string>; responseType?: string }) => {
    const params = config?.params || {}

    // ── PRODUCTS ──
    if (path === '/products') {
      let q = supabase.from('Product').select('*, category:Category(*), supplier:Supplier(*), priceRange:PriceRange(*)').order('createdAt', { ascending: false })
      if (params.q) q = q.or(`name.ilike.%${params.q}%,code.ilike.%${params.q}%`)
      if (params.categoryId) q = q.eq('categoryId', params.categoryId)
      if (params.supplierId) q = q.eq('supplierId', params.supplierId)
      const { data, error } = await q
      const rows = check(data, error)
      return { data: rows.map(p => ({ ...p, purchasePrice: Number(p.purchasePrice), sellingPrice: Number(p.sellingPrice), mrp: p.mrp ? Number(p.mrp) : null, ...margin(Number(p.sellingPrice), Number(p.purchasePrice)) })) }
    }

    // ── CATEGORIES ──
    if (path === '/categories') {
      const { data, error } = await supabase.from('Category').select('*').order('name')
      return { data: check(data, error) }
    }

    // ── SUPPLIERS ──
    if (path === '/suppliers') {
      const { data, error } = await supabase.from('Supplier').select('*').order('name')
      return { data: check(data, error) }
    }

    // ── CUSTOMERS ──
    if (path === '/customers') {
      const { data, error } = await supabase.from('Customer').select('*').order('name')
      return { data: check(data, error)?.map(c => ({ ...c, totalSpend: Number(c.totalSpend) })) }
    }

    // ── PRICE RANGES ──
    if (path === '/price-ranges') {
      const { data: ranges, error } = await supabase.from('PriceRange').select('*').order('minPrice')
      check(ranges, error)
      const { data: prods } = await supabase.from('Product').select('priceRangeId').not('priceRangeId', 'is', null)
      const countMap = new Map<string, number>()
      prods?.forEach(p => p.priceRangeId && countMap.set(p.priceRangeId, (countMap.get(p.priceRangeId) || 0) + 1))
      return { data: ranges!.map(r => ({ ...r, minPrice: Number(r.minPrice), maxPrice: Number(r.maxPrice), itemCount: countMap.get(r.id) || 0 })) }
    }

    // ── PURCHASES ──
    if (path === '/purchases') {
      const { data, error } = await supabase.from('Purchase').select('*, supplier:Supplier(*), items:PurchaseItem(*, product:Product(*))').order('purchaseDate', { ascending: false })
      return { data: check(data, error)?.map(p => ({ ...p, totalAmount: Number(p.totalAmount), invoiceBillAmount: p.invoiceBillAmount ? Number(p.invoiceBillAmount) : null, transportCost: Number(p.transportCost) })) }
    }

    // ── SALES ──
    if (path === '/sales') {
      let q = supabase.from('Sale').select('*, customer:Customer(*), items:SaleItem(*, product:Product(*, supplier:Supplier(*), category:Category(*)))').order('saleDate', { ascending: false })
      if (params.from) q = q.gte('saleDate', params.from)
      const { data, error } = await q
      return { data: check(data, error)?.map(s => ({ ...s, totalAmount: Number(s.totalAmount), revenue: Number(s.revenue), netProfit: Number(s.netProfit) })) }
    }

    // ── EXPENSES ──
    if (path === '/expenses') {
      const { data, error } = await supabase.from('Expense').select('*').order('date', { ascending: false })
      return { data: check(data, error)?.map(e => ({ ...e, amount: Number(e.amount) })) }
    }

    // ── DASHBOARD ──
    if (path === '/dashboard') {
      const [{ data: prods }, { data: salesD }, { data: exps }, { data: purch }, { data: pitems }] = await Promise.all([
        supabase.from('Product').select('id,name,purchasePrice,sellingPrice,quantity,stockStatus'),
        supabase.from('Sale').select('revenue,netProfit,saleDate,totalAmount'),
        supabase.from('Expense').select('amount'),
        supabase.from('Purchase').select('id,totalAmount,invoiceBillAmount,transportCost'),
        supabase.from('PurchaseItem').select('purchaseId,costPrice,quantity')
      ])
      const itemsMap = new Map<string, typeof pitems extends (infer T)[] | null ? T[] : never>()
      pitems?.forEach((i: any) => { if (!itemsMap.has(i.purchaseId)) itemsMap.set(i.purchaseId, []); (itemsMap.get(i.purchaseId) as any[]).push(i) })
      const totalInvestment = purch?.reduce((s, p) => { const inv = p.invoiceBillAmount ? Number(p.invoiceBillAmount) : (itemsMap.get(p.id) || []).reduce((a: number, i: any) => a + Number(i.costPrice) * i.quantity, 0); return s + inv + Number(p.transportCost || 0) }, 0) || 0
      const totalInventoryValue = prods?.reduce((s, p) => s + Number(p.purchasePrice) * p.quantity, 0) || 0
      const estimatedRevenue = prods?.reduce((s, p) => s + Number(p.sellingPrice) * p.quantity, 0) || 0
      const estimatedProfit = prods?.reduce((s, p) => s + (Number(p.sellingPrice) - Number(p.purchasePrice)) * p.quantity, 0) || 0
      const totalRevenue = salesD?.reduce((s, x) => s + Number(x.revenue), 0) || 0
      const totalProfit = salesD?.reduce((s, x) => s + Number(x.netProfit), 0) || 0
      const stockRemaining = prods?.reduce((s, p) => s + p.quantity, 0) || 0
      const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todaysSales = salesD?.filter(s => new Date(s.saleDate) >= today).length || 0
      const monthlyProfit = salesD?.filter(s => { const d = new Date(s.saleDate); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() }).reduce((s, x) => s + Number(x.netProfit), 0) || 0
      const totalExpenses = exps?.reduce((s, e) => s + Number(e.amount), 0) || 0
      const progress = totalInvestment > 0 ? Math.min((totalRevenue / totalInvestment) * 100, 100) : 0
      return { data: { cards: { totalInvestment, totalInventoryValue, totalSales: salesD?.length || 0, totalRevenue, totalProfit, monthlyProfit, todaysSales, stockRemaining, netProfitAfterExpenses: totalProfit - totalExpenses, estimatedRevenue, estimatedProfit, totalTransportCost: purch?.reduce((s, p) => s + Number(p.transportCost || 0), 0) || 0 }, investmentRecovery: { remainingInvestment: Math.max(totalInvestment - totalRevenue, 0), progress } } }
    }

    // ── ANALYTICS OVERVIEW ──
    if (path === '/analytics/overview') {
      const [{ data: salesFull }, { data: prods }, { data: cats }] = await Promise.all([
        supabase.from('Sale').select('saleDate,totalAmount,items:SaleItem(lineTotal,purchasePrice,quantity,product:Product(name,category:Category(name)))'),
        supabase.from('Product').select('id,name,categoryId,quantity,category:Category(name)'),
        supabase.from('Category').select('id,name')
      ])
      const dailyMap = new Map<string, number>(); const catProfit = new Map<string, number>(); const topMap = new Map<string, number>()
      salesFull?.forEach((sale: any) => {
        const d = new Date(sale.saleDate).toISOString().slice(0, 10)
        dailyMap.set(d, (dailyMap.get(d) || 0) + Number(sale.totalAmount))
        sale.items?.forEach((item: any) => {
          const cat = item.product?.category?.name || 'Other'
          catProfit.set(cat, (catProfit.get(cat) || 0) + Number(item.lineTotal) - Number(item.purchasePrice) * item.quantity)
          topMap.set(item.product?.name || '?', (topMap.get(item.product?.name || '?') || 0) + item.quantity)
        })
      })
      const lowStock = prods?.filter(p => p.quantity > 0 && p.quantity <= 5).map((p: any) => ({ id: p.id || '', name: p.name || '', quantity: p.quantity })) || []
      const outOfStock = prods?.filter(p => p.quantity === 0).map((p: any) => ({ id: p.id || '', name: p.name || '', quantity: 0 })) || []
      return { data: { dailySalesTrend: [...dailyMap.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)), categoryWiseProfit: [...catProfit.entries()].map(([name, value]) => ({ name, value })), inventoryDistribution: cats?.map(c => ({ name: c.name, value: prods?.filter(p => p.categoryId === c.id).reduce((s, p) => s + p.quantity, 0) || 0 })) || [], topSellingProducts: [...topMap.entries()].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 10), notifications: { lowStock, outOfStock } } }
    }

    // ── ANALYTICS SALES ──
    if (path.startsWith('/analytics/sales')) {
      const period = (config?.params?.period as string) || 'month'
      const now = new Date(); let from: string | undefined
      if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      else if (period === 'year') from = new Date(now.getFullYear(), 0, 1).toISOString()
      let q = supabase.from('Sale').select('saleDate,totalAmount,items:SaleItem(lineTotal,purchasePrice,quantity,product:Product(name,category:Category(name),supplier:Supplier(name),priceRange:PriceRange(name)))')
      if (from) q = q.gte('saleDate', from)
      const { data: salesA } = await q
      const catMap = new Map<string, { revenue: number; quantity: number; profit: number }>()
      const supMap = new Map<string, { revenue: number; quantity: number; profit: number }>()
      const itemMap = new Map<string, { revenue: number; quantity: number; profit: number }>()
      const rangeMap = new Map<string, { revenue: number; quantity: number; profit: number }>()
      const monthMap = new Map<string, { revenue: number; count: number }>()
      salesA?.forEach((sale: any) => {
        const mk = new Date(sale.saleDate).toISOString().slice(0, 7)
        const em = monthMap.get(mk) || { revenue: 0, count: 0 }; monthMap.set(mk, { revenue: em.revenue + Number(sale.totalAmount), count: em.count + 1 })
        sale.items?.forEach((item: any) => {
          const rev = Number(item.lineTotal); const profit = rev - Number(item.purchasePrice) * item.quantity; const qty = item.quantity
          const add = (map: typeof catMap, key: string) => { const e = map.get(key) || { revenue: 0, quantity: 0, profit: 0 }; map.set(key, { revenue: e.revenue + rev, quantity: e.quantity + qty, profit: e.profit + profit }) }
          add(catMap, item.product?.category?.name || 'Other')
          if (item.product?.supplier?.name) add(supMap, item.product.supplier.name)
          add(itemMap, item.product?.name || '?')
          add(rangeMap, item.product?.priceRange?.name || 'Unclassified')
        })
      })
      const toArr = (map: typeof catMap) => [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue)
      return { data: { categoryWise: toArr(catMap), supplierWise: toArr(supMap), topItems: toArr(itemMap).slice(0, 15), priceRangeWise: toArr(rangeMap), monthlySalesTrend: [...monthMap.entries()].map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month)) } }
    }

    throw new Error(`Unknown GET path: ${path}`)
  },

  post: async (path: string, data?: any) => {
    const now = new Date().toISOString()

    // ── AUTH LOGIN ──
    if (path === '/auth/login') {
      const { email, password } = data
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !authData.session || !authData.user) throw new Error('Invalid credentials')
      const user = authData.user
      return {
        data: {
          token: authData.session.access_token,
          user: {
            id: user.id,
            name: user.user_metadata?.name || user.email || 'Owner',
            email: user.email || email,
            role: user.app_metadata?.role || user.user_metadata?.role || 'ADMIN'
          }
        }
      }
    }

    // ── PRODUCTS ──
    if (path === '/products') {
      let priceRangeId = data.priceRangeId || null
      if (!priceRangeId && data.sellingPrice > 0) {
        const { data: ranges } = await supabase.from('PriceRange').select('id').lte('minPrice', String(data.sellingPrice)).gte('maxPrice', String(data.sellingPrice)).limit(1)
        if (ranges?.length) priceRangeId = ranges[0].id
      }
      const qty = data.quantity || 0
      const { data: row, error } = await supabase.from('Product').insert({ id: crypto.randomUUID(), ...data, priceRangeId, stockStatus: stockStatus(qty), purchasePrice: String(data.purchasePrice), sellingPrice: String(data.sellingPrice), mrp: data.mrp ? String(data.mrp) : null, discountLimit: data.discountLimit ?? null, createdAt: now, updatedAt: now }).select('*, category:Category(*), supplier:Supplier(*), priceRange:PriceRange(*)').single()
      if (error) throw new Error(error.message)
      return { data: { ...row, purchasePrice: Number(row.purchasePrice), sellingPrice: Number(row.sellingPrice), ...margin(Number(row.sellingPrice), Number(row.purchasePrice)) } }
    }

    // ── CATEGORIES ──
    if (path === '/categories') {
      const { data: row, error } = await supabase.from('Category').insert({ id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now }).select().single()
      if (error) throw new Error(error.message)
      return { data: row }
    }

    // ── SUPPLIERS ──
    if (path === '/suppliers') {
      const { data: row, error } = await supabase.from('Supplier').insert({ id: crypto.randomUUID(), outstandingPayments: '0', ...data, createdAt: now, updatedAt: now }).select().single()
      if (error) throw new Error(error.message)
      return { data: row }
    }

    // ── CUSTOMERS ──
    if (path === '/customers') {
      const { data: row, error } = await supabase.from('Customer').insert({ id: crypto.randomUUID(), totalSpend: '0', lifetimeValue: '0', ...data, createdAt: now, updatedAt: now }).select().single()
      if (error) throw new Error(error.message)
      return { data: row }
    }

    // ── PRICE RANGES ──
    if (path === '/price-ranges') {
      const id = crypto.randomUUID()
      const { data: row, error } = await supabase.from('PriceRange').insert({ id, name: data.name, minPrice: String(data.minPrice), maxPrice: String(data.maxPrice), createdAt: now, updatedAt: now }).select().single()
      if (error) throw new Error(error.message)
      await supabase.from('Product').update({ priceRangeId: id }).gte('sellingPrice', String(data.minPrice)).lte('sellingPrice', String(data.maxPrice))
      return { data: { ...row, minPrice: Number(row.minPrice), maxPrice: Number(row.maxPrice) } }
    }

    // ── PURCHASES ──
    if (path === '/purchases') {
      const { purchaseDate, supplierId, invoiceNo, invoiceBillAmount, transportCost, items, billPhoto } = data
      const purchaseId = crypto.randomUUID()
      const itemsCost = items.reduce((s: number, i: any) => s + i.quantity * i.costPrice, 0)
      const totalAmount = (invoiceBillAmount ?? itemsCost) + (transportCost || 0)
      const { error: pe } = await supabase.from('Purchase').insert({ id: purchaseId, purchaseDate, supplierId, invoiceNo: invoiceNo || `INV-${Date.now()}`, totalAmount: String(totalAmount), invoiceBillAmount: invoiceBillAmount ? String(invoiceBillAmount) : null, transportCost: String(transportCost || 0), billPhoto: billPhoto || null, createdAt: now, updatedAt: now })
      if (pe) throw new Error(pe.message)
      for (const item of items) {
        await supabase.from('PurchaseItem').insert({ id: crypto.randomUUID(), purchaseId, productId: item.productId, quantity: item.quantity, costPrice: String(item.costPrice), lineTotal: String(item.quantity * item.costPrice), createdAt: now })
        const { data: prod } = await supabase.from('Product').select('quantity').eq('id', item.productId).single()
        if (prod) { const nq = prod.quantity + item.quantity; await supabase.from('Product').update({ quantity: nq, purchasePrice: String(item.costPrice), stockStatus: stockStatus(nq), updatedAt: now }).eq('id', item.productId) }
      }
      return { data: { id: purchaseId } }
    }

    // ── SALES ──
    if (path === '/sales') {
      const { saleDate, customerId, paymentMethod, discount, gst, items } = data
      const saleId = crypto.randomUUID()
      let revenue = 0; let cogs = 0
      const itemDetails: { productId: string; quantity: number; unitPrice: number; purchasePrice: number }[] = []
      for (const item of items) {
        revenue += item.unitPrice * item.quantity
        const { data: prod } = await supabase.from('Product').select('purchasePrice,quantity').eq('id', item.productId).single()
        const pp = prod ? Number(prod.purchasePrice) : 0
        cogs += pp * item.quantity
        itemDetails.push({ ...item, purchasePrice: pp })
      }
      const grossProfit = revenue - cogs; const netProfit = grossProfit - (discount || 0); const totalAmount = revenue - (discount || 0) + (gst || 0)
      const { error: se } = await supabase.from('Sale').insert({ id: saleId, saleDate, customerId: customerId || null, paymentMethod, discount: String(discount || 0), gst: String(gst || 0), totalAmount: String(totalAmount), revenue: String(revenue), cogs: String(cogs), grossProfit: String(grossProfit), netProfit: String(netProfit), marginPercent: String(revenue > 0 ? (netProfit / revenue) * 100 : 0), createdAt: now, updatedAt: now })
      if (se) throw new Error(se.message)
      for (const item of itemDetails) {
        await supabase.from('SaleItem').insert({ id: crypto.randomUUID(), saleId, productId: item.productId, quantity: item.quantity, unitPrice: String(item.unitPrice), purchasePrice: String(item.purchasePrice), lineTotal: String(item.quantity * item.unitPrice), createdAt: now })
        const { data: prod } = await supabase.from('Product').select('quantity').eq('id', item.productId).single()
        if (prod) { const nq = Math.max(0, prod.quantity - item.quantity); await supabase.from('Product').update({ quantity: nq, stockStatus: stockStatus(nq), updatedAt: now }).eq('id', item.productId) }
      }
      if (customerId) {
        const { data: cust } = await supabase.from('Customer').select('totalSpend,lifetimeValue').eq('id', customerId).single()
        if (cust) await supabase.from('Customer').update({ totalSpend: String(Number(cust.totalSpend) + totalAmount), lifetimeValue: String(Number(cust.lifetimeValue) + totalAmount), updatedAt: now }).eq('id', customerId)
      }
      return { data: { id: saleId } }
    }

    // ── EXPENSES ──
    if (path === '/expenses') {
      const { data: row, error } = await supabase.from('Expense').insert({ id: crypto.randomUUID(), ...data, amount: String(data.amount), createdAt: now, updatedAt: now }).select().single()
      if (error) throw new Error(error.message)
      return { data: row }
    }

    // ── RECALCULATE CUSTOMER SPEND ──
    if (path.startsWith('/customers/') && path.endsWith('/recalculate')) {
      const custId = path.split('/')[2]
      const { data: sales } = await supabase.from('Sale').select('totalAmount').eq('customerId', custId)
      const total = (sales ?? []).reduce((s: number, r: any) => s + Number(r.totalAmount), 0)
      await supabase.from('Customer').update({ totalSpend: String(total), lifetimeValue: String(total), updatedAt: new Date().toISOString() }).eq('id', custId)
      return { data: { totalSpend: total } }
    }

    // ── REASSIGN PRICE RANGES ──
    if (path === '/products/reassign-price-ranges') {
      const { data: prods } = await supabase.from('Product').select('id,sellingPrice')
      const { data: ranges } = await supabase.from('PriceRange').select('id,minPrice,maxPrice')
      for (const prod of prods || []) {
        const match = ranges?.find(r => Number(r.minPrice) <= Number(prod.sellingPrice) && Number(r.maxPrice) >= Number(prod.sellingPrice))
        await supabase.from('Product').update({ priceRangeId: match?.id || null }).eq('id', prod.id)
      }
      return { data: { updated: prods?.length || 0 } }
    }

    throw new Error(`Unknown POST path: ${path}`)
  },

  put: async (path: string, data?: any) => {
    const parts = path.split('/'); const id = parts[parts.length - 1]; const resource = parts[parts.length - 2]
    const tableMap: Record<string, string> = { products: 'Product', categories: 'Category', suppliers: 'Supplier', customers: 'Customer', 'price-ranges': 'PriceRange', expenses: 'Expense', sales: 'Sale', purchases: 'Purchase' }
    const table = tableMap[resource]
    if (!table) throw new Error(`Unknown PUT: ${path}`)

    // For price ranges: re-assign products after update
    if (table === 'PriceRange' && (data.minPrice !== undefined || data.maxPrice !== undefined)) {
      const { data: row, error } = await supabase.from('PriceRange').update({ ...data, minPrice: data.minPrice ? String(data.minPrice) : undefined, maxPrice: data.maxPrice ? String(data.maxPrice) : undefined, updatedAt: new Date().toISOString() }).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      await supabase.from('Product').update({ priceRangeId: id }).gte('sellingPrice', row.minPrice).lte('sellingPrice', row.maxPrice)
      return { data: { ...row, minPrice: Number(row.minPrice), maxPrice: Number(row.maxPrice) } }
    }

    // For products: handle price/stock fields
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() }
    if (data.purchasePrice !== undefined) updateData.purchasePrice = String(data.purchasePrice)
    if (data.sellingPrice !== undefined) updateData.sellingPrice = String(data.sellingPrice)
    if (data.mrp !== undefined) updateData.mrp = data.mrp ? String(data.mrp) : null
    if (data.quantity !== undefined) updateData.stockStatus = stockStatus(data.quantity)

    const { data: row, error } = await supabase.from(table).update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return { data: row }
  },

  delete: async (path: string) => {
    const parts = path.split('/'); const id = parts[parts.length - 1]; const resource = parts[parts.length - 2]

    // ── DELETE PURCHASE ITEM (keeps the purchase + supplier intact) ──
    if (resource === 'purchase-items') {
      // Get the item before deleting so we can reverse its stock effect
      const { data: item } = await supabase.from('PurchaseItem').select('purchaseId, productId, quantity, costPrice, lineTotal').eq('id', id).single()
      if (item) {
        // Decrement product stock
        const { data: prod } = await supabase.from('Product').select('quantity').eq('id', item.productId).single()
        if (prod) {
          const nq = Math.max(0, prod.quantity - item.quantity)
          await supabase.from('Product').update({ quantity: nq, stockStatus: stockStatus(nq), updatedAt: new Date().toISOString() }).eq('id', item.productId)
        }
        // Delete the item row
        await supabase.from('PurchaseItem').delete().eq('id', id)
        // Recalculate purchase totalAmount from remaining items
        const { data: remaining } = await supabase.from('PurchaseItem').select('lineTotal').eq('purchaseId', item.purchaseId)
        const newTotal = (remaining ?? []).reduce((s: number, r: any) => s + Number(r.lineTotal), 0)
        await supabase.from('Purchase').update({ totalAmount: String(newTotal), updatedAt: new Date().toISOString() }).eq('id', item.purchaseId)
      }
      return { data: null, status: 204 }
    }

    const tableMap: Record<string, string> = { products: 'Product', categories: 'Category', suppliers: 'Supplier', customers: 'Customer', 'price-ranges': 'PriceRange', expenses: 'Expense', sales: 'Sale', purchases: 'Purchase' }
    const table = tableMap[resource]
    if (!table) throw new Error(`Unknown DELETE: ${path}`)

    if (table === 'Sale') {
      // Reverse effects: restock products + fix customer totalSpend
      const { data: sale } = await supabase.from('Sale').select('customerId, totalAmount, items:SaleItem(productId, quantity)').eq('id', id).single()
      if (sale) {
        // Restock each product
        for (const item of sale.items ?? []) {
          const { data: prod } = await supabase.from('Product').select('quantity').eq('id', item.productId).single()
          if (prod) {
            const nq = prod.quantity + item.quantity
            await supabase.from('Product').update({ quantity: nq, stockStatus: stockStatus(nq), updatedAt: new Date().toISOString() }).eq('id', item.productId)
          }
        }
        // Reverse customer spend
        if (sale.customerId) {
          const { data: cust } = await supabase.from('Customer').select('totalSpend, lifetimeValue').eq('id', sale.customerId).single()
          if (cust) {
            const amt = Number(sale.totalAmount)
            await supabase.from('Customer').update({
              totalSpend: String(Math.max(0, Number(cust.totalSpend) - amt)),
              lifetimeValue: String(Math.max(0, Number(cust.lifetimeValue) - amt)),
              updatedAt: new Date().toISOString()
            }).eq('id', sale.customerId)
          }
        }
      }
      await supabase.from('SaleItem').delete().eq('saleId', id)
    }

    if (table === 'Purchase') await supabase.from('PurchaseItem').delete().eq('purchaseId', id)
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { data: null, status: 204 }
  }
}

export default api as {
  get: (path: string, config?: { params?: Record<string, string>; responseType?: string }) => Promise<{ data: any }>
  post: (path: string, data?: any) => Promise<{ data: any }>
  put: (path: string, data?: any) => Promise<{ data: any }>
  delete: (path: string) => Promise<{ data: any; status?: number }>
}
