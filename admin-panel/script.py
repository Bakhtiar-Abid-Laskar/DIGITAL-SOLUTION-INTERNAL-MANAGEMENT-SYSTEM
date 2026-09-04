import re

with open('src/app/(admin)/sales/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace Catalog State and Effect
old_state = '''  // Inventory Catalog State
  const [inventoryCatalog, setInventoryCatalog] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [activeItemSearchIndex, setActiveItemSearchIndex] = useState<number | null>(null);

  // Load Inventory Catalog
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const { data, error } = await supabase
          .from("inventory")
          .select("id, product_id, selling_rate, quantity, products(name, tax_mode, cgst_rate, sgst_rate, igst_rate)")
          .eq("products.is_active", true)
          .limit(100);

        if (!error && data) {
          setInventoryCatalog(data);
        }
      } catch (err: any) {
        console.error("Error fetching catalog:", err?.message || err);
      } finally {
        setCatalogLoading(false);
      }
    };
    fetchCatalog();
  }, []);'''

new_state = '''  // Inventory Catalog State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeItemSearchIndex, setActiveItemSearchIndex] = useState<number | null>(null);
  const [focusedResultIndex, setFocusedResultIndex] = useState<number>(-1);

  const activeQuery = activeItemSearchIndex !== null ? items[activeItemSearchIndex]?.item_name : "";

  // Debounced Remote Search
  useEffect(() => {
    if (activeItemSearchIndex === null) {
      setSearchResults([]);
      setIsSearching(false);
      setFocusedResultIndex(-1);
      return;
    }

    const query = (activeQuery || "").trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      setFocusedResultIndex(-1);
      return;
    }

    const searchCatalog = async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("inventory")
          .select("id, product_id, selling_rate, quantity, products!inner(name, sku, hsn_sac, unit, tax_mode, cgst_rate, sgst_rate, igst_rate, is_active)")
          .eq("products.is_active", true)
          .or(
ame.ilike.%%,sku.ilike.%%, { referencedTable: 'products' })
          .limit(15);

        if (!error && data) {
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } catch (err: any) {
        console.error("Error searching catalog:", err?.message || err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
        setFocusedResultIndex(-1);
      }
    };

    const timeout = setTimeout(searchCatalog, 300);
    return () => clearTimeout(timeout);
  }, [activeItemSearchIndex, activeQuery]);'''

content = content.replace(old_state, new_state)

# 2. Update getProductName and add getProductSKU
old_getters = '''  const getProductName = (inv: any): string => {
    if (!inv) return "";
    if (Array.isArray(inv.products)) return inv.products[0]?.name || "";
    return inv.products?.name || "";
  };

  const getProductStock = (inv: any): number => {
    return Number(inv?.quantity) || 0;
  };'''

new_getters = '''  const getProductName = (inv: any): string => {
    if (!inv) return "";
    if (Array.isArray(inv.products)) return inv.products[0]?.name || "";
    return inv.products?.name || "";
  };

  const getProductSKU = (inv: any): string => {
    if (!inv) return "";
    const p = Array.isArray(inv.products) ? inv.products[0] : inv.products;
    return p?.sku || "";
  };

  const getProductStock = (inv: any): number => {
    return Number(inv?.quantity) || 0;
  };'''

content = content.replace(old_getters, new_getters)

# 3. Update handleProductSelect
old_handle_select = '''  const handleProductSelect = (index: number, inv: any) => {
    if (!inv) {
      updateItem(index, { inventory_id: "", product_id: null, item_name: "", rate_input: "" });
      return;
    }
    const productName = getProductName(inv);
    updateItem(index, {
      inventory_id: inv.id,
      product_id: inv.product_id,
      item_name: productName,
      rate_input: inv.selling_rate ? String(inv.selling_rate) : "",
      amount_input: "", // Clear amount to let rate take precedence
    });
  };'''

new_handle_select = '''  const handleProductSelect = (index: number, inv: any) => {
    if (!inv) {
      updateItem(index, { inventory_id: "", product_id: null, item_name: "", rate_input: "", amount_input: "" });
      return;
    }
    const productName = getProductName(inv);
    const prod = Array.isArray(inv.products) ? inv.products[0] : inv.products;
    const rate = inv.selling_rate ? Number(inv.selling_rate) : 0;
    const qty = items[index].quantity || 1;
    
    updateItem(index, {
      inventory_id: inv.id,
      product_id: inv.product_id,
      item_name: productName,
      rate_input: rate ? String(rate) : "",
      amount_input: rate ? String(rate * qty) : "",
      cgst_rate: prod?.cgst_rate || 0,
      sgst_rate: prod?.sgst_rate || 0,
      igst_rate: prod?.igst_rate || 0,
      tax_mode: prod?.tax_mode || 'exclusive'
    });
  };'''

content = content.replace(old_handle_select, new_handle_select)

# 4. Update the quantity/rate change handlers for auto-calculating Amount
# Quantity handler
old_qty_handler = '''onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}'''
new_qty_handler = '''onChange={(e) => {
                              const qty = Number(e.target.value);
                              const rate = Number(item.rate_input);
                              updateItem(index, { 
                                quantity: qty, 
                                amount_input: rate && qty ? String(rate * qty) : item.amount_input 
                              });
                            }}'''
content = content.replace(old_qty_handler, new_qty_handler)

# Rate handler
old_rate_handler = '''onChange={(e) => updateItem(index, { rate_input: e.target.value, amount_input: "" })}'''
new_rate_handler = '''onChange={(e) => {
                              const rate = Number(e.target.value);
                              const qty = item.quantity;
                              updateItem(index, { 
                                rate_input: e.target.value, 
                                amount_input: rate && qty ? String(rate * qty) : "" 
                              });
                            }}'''
content = content.replace(old_rate_handler, new_rate_handler)

with open('src/app/(admin)/sales/new/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Phase 1-4 changes written successfully (Part 1)")
