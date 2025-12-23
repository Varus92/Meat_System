import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { 
  Plus, Trash2, Package, Search, Pencil, 
  Tag, Euro, Save, X, FolderPlus
} from "lucide-react";

const CatalogoPage = () => {
  const { token } = useAuth();
  
  // Products state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("tutti");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Product form
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    description: "",
    unit: "kg",
    price: ""
  });
  const [savingProduct, setSavingProduct] = useState(false);
  
  // Category form
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    label: ""
  });
  const [savingCategory, setSavingCategory] = useState(false);
  
  const headers = { Authorization: `Bearer ${token}` };

  const units = [
    { value: "kg", label: "Chilogrammi (kg)" },
    { value: "pz", label: "Pezzi (pz)" },
    { value: "porzione", label: "Porzione" },
    { value: "etto", label: "Etto (100g)" },
    { value: "litro", label: "Litro" }
  ];

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`, { headers });
      setProducts(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento prodotti");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, { headers });
      setCategories(response.data);
    } catch (error) {
      // If no categories, seed them
      console.log("No categories found, using defaults");
    }
  };

  // Product handlers
  const openProductDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        category: product.category,
        description: product.description || "",
        unit: product.unit,
        price: product.price !== null ? product.price.toString() : ""
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: "",
        category: categories.length > 0 ? categories[0].name : "bovino",
        description: "",
        unit: "kg",
        price: ""
      });
    }
    setShowProductDialog(true);
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.category) {
      toast.error("Inserisci nome e categoria");
      return;
    }
    
    setSavingProduct(true);
    try {
      const data = {
        ...productForm,
        price: productForm.price ? parseFloat(productForm.price) : null
      };
      
      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, data, { headers });
        toast.success("Prodotto aggiornato");
      } else {
        await axios.post(`${API}/products`, data, { headers });
        toast.success("Prodotto aggiunto");
      }
      
      setShowProductDialog(false);
      fetchProducts();
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo prodotto?")) return;
    
    try {
      await axios.delete(`${API}/products/${productId}`, { headers });
      toast.success("Prodotto eliminato");
      fetchProducts();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  // Category handlers
  const openCategoryDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        label: category.label
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: "",
        label: ""
      });
    }
    setShowCategoryDialog(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name || !categoryForm.label) {
      toast.error("Inserisci nome e etichetta");
      return;
    }
    
    // Normalize name (lowercase, no spaces)
    const normalizedName = categoryForm.name.toLowerCase().replace(/\s+/g, '_');
    
    setSavingCategory(true);
    try {
      const data = {
        name: normalizedName,
        label: categoryForm.label
      };
      
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory.id}`, data, { headers });
        toast.success("Categoria aggiornata");
      } else {
        await axios.post(`${API}/categories`, data, { headers });
        toast.success("Categoria aggiunta");
      }
      
      setShowCategoryDialog(false);
      fetchCategories();
    } catch (error) {
      const message = error.response?.data?.detail || "Errore nel salvataggio";
      toast.error(message);
    } finally {
      setSavingCategory(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa categoria?")) return;
    
    try {
      await axios.delete(`${API}/categories/${categoryId}`, { headers });
      toast.success("Categoria eliminata");
      fetchCategories();
    } catch (error) {
      const message = error.response?.data?.detail || "Errore nell'eliminazione";
      toast.error(message);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "tutti" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryLabel = (categoryName) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.label || categoryName;
  };

  const getCategoryColor = (category) => {
    const colors = {
      bovino: "bg-red-100 text-red-800 border-red-200",
      suino: "bg-pink-100 text-pink-800 border-pink-200",
      preparati: "bg-amber-100 text-amber-800 border-amber-200",
      altro: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return colors[category] || "bg-blue-100 text-blue-800 border-blue-200";
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return "-";
    return `€${price.toFixed(2)}`;
  };

  return (
    <div className="flex h-screen bg-[#F9F5F0]">
      <Sidebar />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#5D1919] mb-2">Catalogo</h1>
          <p className="text-muted-foreground">Gestisci prodotti e categorie</p>
        </div>

        <Tabs defaultValue="prodotti" className="space-y-6">
          <TabsList className="bg-white border border-[#D6CFC7]">
            <TabsTrigger 
              value="prodotti" 
              data-testid="tab-prodotti"
              className="data-[state=active]:bg-[#5D1919] data-[state=active]:text-white"
            >
              <Package className="w-4 h-4 mr-2" /> Prodotti
            </TabsTrigger>
            <TabsTrigger 
              value="categorie"
              data-testid="tab-categorie"
              className="data-[state=active]:bg-[#5D1919] data-[state=active]:text-white"
            >
              <Tag className="w-4 h-4 mr-2" /> Categorie
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="prodotti" className="space-y-4">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  data-testid="catalog-search"
                  placeholder="Cerca prodotto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 border-[#D6CFC7]"
                />
              </div>
              
              <Button 
                onClick={() => openProductDialog()}
                className="bg-[#5D1919] hover:bg-[#4A1212]"
                data-testid="add-product-btn"
              >
                <Plus className="w-4 h-4 mr-2" /> Nuovo Prodotto
              </Button>
            </div>

            {/* Category filters */}
            <div className="flex gap-2 flex-wrap">
              <button
                data-testid="catalog-category-tutti"
                onClick={() => setSelectedCategory("tutti")}
                className={`category-tab ${selectedCategory === "tutti" ? 'active' : 'bg-white border border-[#D6CFC7]'}`}
              >
                Tutti
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  data-testid={`catalog-category-${cat.name}`}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`category-tab ${selectedCategory === cat.name ? 'active' : 'bg-white border border-[#D6CFC7]'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Package className="w-20 h-20 text-[#D6CFC7] mb-4" />
                <h3 className="text-xl font-semibold text-[#2D2D2D]">Nessun prodotto</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Nessun risultato per la ricerca" : "Aggiungi il primo prodotto"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <Card 
                    key={product.id}
                    className="border-[#D6CFC7] hover:shadow-md transition-all"
                    data-testid={`catalog-product-${product.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <Badge className={`${getCategoryColor(product.category)} border`}>
                          {getCategoryLabel(product.category)}
                        </Badge>
                        <Badge variant="outline" className="border-[#C5A059] text-[#C5A059]">
                          {product.unit}
                        </Badge>
                      </div>
                      
                      <h3 className="font-semibold text-lg text-[#2D2D2D] mb-1">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {product.description}
                        </p>
                      )}
                      
                      {/* Price */}
                      <div className="flex items-center gap-1 mb-3">
                        <Euro className="w-4 h-4 text-[#5D1919]" />
                        <span className="font-semibold text-[#5D1919]">
                          {formatPrice(product.price)}
                        </span>
                        {product.price && (
                          <span className="text-sm text-muted-foreground">/{product.unit}</span>
                        )}
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openProductDialog(product)}
                          data-testid={`edit-product-${product.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-1" /> Modifica
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteProduct(product.id)}
                          data-testid={`delete-product-${product.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} prodotti
            </p>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categorie" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Gestisci le categorie dei prodotti
              </p>
              <Button 
                onClick={() => openCategoryDialog()}
                className="bg-[#5D1919] hover:bg-[#4A1212]"
                data-testid="add-category-btn"
              >
                <FolderPlus className="w-4 h-4 mr-2" /> Nuova Categoria
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(category => {
                const productCount = products.filter(p => p.category === category.name).length;
                return (
                  <Card 
                    key={category.id} 
                    className="border-[#D6CFC7]"
                    data-testid={`category-card-${category.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg text-[#2D2D2D]">
                            {category.label}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Codice: {category.name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {productCount} prodott{productCount === 1 ? 'o' : 'i'}
                          </p>
                        </div>
                        <Badge className={`${getCategoryColor(category.name)} border`}>
                          {category.label}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCategoryDialog(category)}
                          data-testid={`edit-category-${category.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-1" /> Modifica
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteCategory(category.id)}
                          data-testid={`delete-category-${category.id}`}
                          disabled={productCount > 0}
                          title={productCount > 0 ? "Impossibile eliminare: categoria in uso" : ""}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {categories.length === 0 && (
              <div className="text-center py-12">
                <Tag className="w-16 h-16 mx-auto text-[#D6CFC7] mb-4" />
                <p className="text-muted-foreground">Nessuna categoria</p>
                <Button 
                  onClick={() => openCategoryDialog()}
                  className="mt-4 bg-[#5D1919] hover:bg-[#4A1212]"
                >
                  <Plus className="w-4 h-4 mr-2" /> Crea prima categoria
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Modifica Prodotto" : "Nuovo Prodotto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Prodotto *</Label>
              <Input
                data-testid="product-name-input"
                placeholder="Es. Bistecca di Scottona"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="border-[#D6CFC7]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select 
                  value={productForm.category} 
                  onValueChange={(v) => setProductForm({ ...productForm, category: v })}
                >
                  <SelectTrigger data-testid="product-category-select" className="border-[#D6CFC7]">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Unità di Misura</Label>
                <Select 
                  value={productForm.unit} 
                  onValueChange={(v) => setProductForm({ ...productForm, unit: v })}
                >
                  <SelectTrigger data-testid="product-unit-select" className="border-[#D6CFC7]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Prezzo (€/{productForm.unit})</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  data-testid="product-price-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Es. 15.90"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="pl-9 border-[#D6CFC7]"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Input
                data-testid="product-description-input"
                placeholder="Descrizione opzionale"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="border-[#D6CFC7]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={saveProduct}
              disabled={savingProduct || !productForm.name || !productForm.category}
              className="bg-[#5D1919] hover:bg-[#4A1212]"
              data-testid="save-product-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingProduct ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Modifica Categoria" : "Nuova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Etichetta (nome visualizzato) *</Label>
              <Input
                data-testid="category-label-input"
                placeholder="Es. Pollame"
                value={categoryForm.label}
                onChange={(e) => setCategoryForm({ 
                  ...categoryForm, 
                  label: e.target.value,
                  name: editingCategory ? categoryForm.name : e.target.value.toLowerCase().replace(/\s+/g, '_')
                })}
                className="border-[#D6CFC7]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Codice interno</Label>
              <Input
                data-testid="category-name-input"
                placeholder="Es. pollame"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                className="border-[#D6CFC7]"
                disabled={!!editingCategory}
              />
              <p className="text-xs text-muted-foreground">
                Codice univoco (senza spazi, minuscolo)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={saveCategory}
              disabled={savingCategory || !categoryForm.name || !categoryForm.label}
              className="bg-[#5D1919] hover:bg-[#4A1212]"
              data-testid="save-category-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingCategory ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogoPage;
