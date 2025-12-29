import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import Sidebar from "../components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Plus, Minus, CalendarIcon, Search, User, Phone, 
  ShoppingCart, Trash2, Check, Package, Users, ChevronDown, X
} from "lucide-react";

const BancoPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  // Products state
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("tutti");
  const [productSearch, setProductSearch] = useState("");
  
  // Customer state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Order state
  const [orderItems, setOrderItems] = useState([]);
  const [pickupDate, setPickupDate] = useState(null);
  const [pickupTimeSlot, setPickupTimeSlot] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Today's orders
  const [todayOrders, setTodayOrders] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  // Categories state
  const [categories, setCategories] = useState([]);

  const timeSlots = [
    { value: "08:00-10:00", label: "08:00 - 10:00" },
    { value: "10:00-12:00", label: "10:00 - 12:00" },
    { value: "12:00-13:30", label: "12:00 - 13:30" },
    { value: "16:30-18:00", label: "16:30 - 18:00" },
    { value: "18:00-20:00", label: "18:00 - 20:00" }
  ];

  useEffect(() => {
    fetchProducts();
    fetchTodayOrders();
    fetchAllCustomers();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      const filtered = allCustomers.filter(c => 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      );
      setCustomers(filtered);
    } else {
      setCustomers(allCustomers.slice(0, 10));
    }
  }, [customerSearch, allCustomers]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, { headers });
      setCategories([{ id: "tutti", name: "tutti", label: "Tutti" }, ...response.data]);
    } catch (error) {
      setCategories([
        { id: "tutti", name: "tutti", label: "Tutti" },
        { id: "bovino", name: "bovino", label: "Bovino" },
        { id: "suino", name: "suino", label: "Suino" },
        { id: "preparati", name: "preparati", label: "Preparati" },
        { id: "altro", name: "altro", label: "Altro" }
      ]);
    }
  };

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

  const fetchTodayOrders = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const response = await axios.get(`${API}/orders?pickup_date=${today}`, { headers });
      setTodayOrders(response.data);
    } catch (error) {
      console.error("Error fetching today's orders:", error);
    }
  };

  const fetchAllCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`, { headers });
      setAllCustomers(response.data);
      setCustomers(response.data.slice(0, 10));
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setShowCustomerDropdown(false);
    setCustomerSearch("");
    toast.success(`Cliente selezionato: ${customer.name}`);
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "tutti" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryLabel = (catName) => {
    const cat = categories.find(c => c.name === catName);
    return cat?.label || catName;
  };

  const addToOrder = (product) => {
    const existing = orderItems.find(item => item.product_id === product.id);
    if (existing) {
      setOrderItems(orderItems.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit: product.unit,
        notes: ""
      }]);
    }
    toast.success(`${product.name} aggiunto`);
  };

  const updateItemQuantity = (productId, delta) => {
    setOrderItems(orderItems.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(0.5, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateItemNotes = (productId, notes) => {
    setOrderItems(orderItems.map(item => 
      item.product_id === productId ? { ...item, notes } : item
    ));
  };

  const removeItem = (productId) => {
    setOrderItems(orderItems.filter(item => item.product_id !== productId));
  };

  const clearOrder = () => {
    setOrderItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedCustomer(null);
    setPickupDate(null);
    setPickupTimeSlot("");
    setOrderNotes("");
  };

  const submitOrder = async () => {
    if (!customerName || !customerPhone || orderItems.length === 0 || !pickupDate || !pickupTimeSlot) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        items: orderItems,
        pickup_date: format(pickupDate, "yyyy-MM-dd"),
        pickup_time_slot: pickupTimeSlot,
        notes: orderNotes
      };

      await axios.post(`${API}/orders`, orderData, { headers });
      toast.success("Ordine creato con successo!");
      clearOrder();
      fetchTodayOrders();
      fetchAllCustomers(); // Refresh customers in case new one was added
    } catch (error) {
      toast.error("Errore nella creazione dell'ordine");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      nuovo: "bg-yellow-100 text-yellow-800 border-yellow-200",
      in_lavorazione: "bg-blue-100 text-blue-800 border-blue-200",
      pronto: "bg-green-100 text-green-800 border-green-200",
      consegnato: "bg-gray-100 text-gray-600 border-gray-200"
    };
    const labels = {
      nuovo: "Nuovo",
      in_lavorazione: "In Lavorazione",
      pronto: "Pronto",
      consegnato: "Consegnato"
    };
    return (
      <Badge className={`${styles[status] || styles.nuovo} border`}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F9F5F0]">
      <Sidebar />
      
      {/* Mobile: Stack vertically, Desktop: Side by side */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pt-16 md:pt-0">
        {/* Left: Product Catalog */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-[#5D1919] mb-1 md:mb-2">Nuovo Ordine</h1>
            <p className="text-sm md:text-base text-muted-foreground">Seleziona i prodotti dal catalogo</p>
          </div>

          {/* Search & Categories */}
          <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                data-testid="product-search"
                placeholder="Cerca prodotto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-10 h-10 md:h-12 border-[#D6CFC7]"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat.id || cat.name}
                  data-testid={`category-${cat.name}`}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`category-tab text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 ${selectedCategory === cat.name ? 'active' : 'bg-white border border-[#D6CFC7]'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid - 2 cols on mobile, 3 on tablet, 4 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id}
                data-testid={`product-card-${product.id}`}
                className="card-hover cursor-pointer border-[#D6CFC7]"
                onClick={() => addToOrder(product)}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#2D2D2D] text-sm md:text-base truncate">{product.name}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{product.description}</p>
                    </div>
                    <Badge variant="outline" className="border-[#C5A059] text-[#C5A059] text-xs ml-1 shrink-0">
                      {product.unit}
                    </Badge>
                  </div>
                  <div className="mt-2 md:mt-3 flex justify-end">
                    <Button size="sm" className="bg-[#5D1919] hover:bg-[#4A1212] h-8 w-8 md:h-9 md:w-9 p-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Today's Orders Preview */}
          {todayOrders.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-[#5D1919] mb-4">
                Ordini di Oggi ({todayOrders.length})
              </h2>
              <div className="space-y-3">
                {todayOrders.slice(0, 5).map(order => (
                  <Card key={order.id} className="border-[#D6CFC7]">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Ritiro: {order.pickup_time_slot}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Order Summary - Fixed bottom on mobile, sidebar on desktop */}
        <div className="w-full lg:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-[#D6CFC7] p-4 md:p-6 overflow-auto max-h-[50vh] lg:max-h-none">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-[#5D1919] flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Riepilogo Ordine
            </h2>
            {orderItems.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearOrder}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                data-testid="clear-order-btn"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Svuota
              </Button>
            )}
          </div>

          {/* Customer Info */}
          <div className="space-y-4 mb-6">
            {/* Customer selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Seleziona Cliente dal Registro
              </Label>
              <Popover open={showCustomerDropdown} onOpenChange={setShowCustomerDropdown}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    data-testid="customer-selector"
                    className="w-full h-12 justify-between border-[#D6CFC7] text-left font-normal"
                  >
                    {selectedCustomer ? (
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#5D1919]" />
                        {selectedCustomer.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Cerca cliente esistente...</span>
                    )}
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Cerca per nome o telefono..." 
                      value={customerSearch}
                      onValueChange={setCustomerSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-2">Nessun cliente trovato</p>
                          <p className="text-xs text-muted-foreground">Inserisci manualmente i dati sotto</p>
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Clienti registrati">
                        {customers.map(customer => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.phone}`}
                            onSelect={() => selectCustomer(customer)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="w-8 h-8 rounded-full bg-[#5D1919] text-white flex items-center justify-center text-sm">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">{customer.phone}</p>
                              </div>
                              {selectedCustomer?.id === customer.id && (
                                <Check className="w-4 h-4 text-[#5D1919]" />
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedCustomer && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearSelectedCustomer}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3 mr-1" /> Nuovo cliente
                </Button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#D6CFC7]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  {selectedCustomer ? "Dati cliente" : "Oppure inserisci manualmente"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" /> Nome Cliente *
              </Label>
              <Input
                data-testid="customer-name-input"
                placeholder="Nome cliente"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (selectedCustomer) setSelectedCustomer(null);
                }}
                className="h-12 border-[#D6CFC7]"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> Telefono *
              </Label>
              <Input
                data-testid="customer-phone-input"
                placeholder="Numero telefono"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  if (selectedCustomer) setSelectedCustomer(null);
                }}
                className="h-12 border-[#D6CFC7]"
              />
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <Label className="mb-2 block">Prodotti ({orderItems.length})</Label>
            {orderItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nessun prodotto selezionato</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3 pr-4">
                  {orderItems.map(item => (
                    <div 
                      key={item.product_id} 
                      className="p-3 bg-[#F9F5F0] rounded-lg"
                      data-testid={`order-item-${item.product_id}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{item.product_name}</span>
                        <button 
                          onClick={() => removeItem(item.product_id)}
                          className="text-red-500 hover:text-red-700"
                          data-testid={`remove-item-${item.product_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateItemQuantity(item.product_id, -0.5)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-16 text-center font-semibold">
                          {item.quantity} {item.unit}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateItemQuantity(item.product_id, 0.5)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Note (es. taglio sottile)"
                        value={item.notes}
                        onChange={(e) => updateItemNotes(item.product_id, e.target.value)}
                        className="mt-2 h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Pickup Date & Time */}
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> Data Ritiro *
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-testid="pickup-date-btn"
                    className={`w-full h-12 justify-start text-left font-normal border-[#D6CFC7] ${!pickupDate && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pickupDate ? format(pickupDate, "PPP", { locale: it }) : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={pickupDate}
                    onSelect={(date) => {
                      setPickupDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fascia Oraria *</Label>
              <Select value={pickupTimeSlot} onValueChange={setPickupTimeSlot}>
                <SelectTrigger data-testid="pickup-time-select" className="h-12 border-[#D6CFC7]">
                  <SelectValue placeholder="Seleziona orario" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(slot => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 mb-6">
            <Label>Note Ordine</Label>
            <Textarea
              data-testid="order-notes"
              placeholder="Note aggiuntive per l'ordine..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="border-[#D6CFC7] min-h-[80px]"
            />
          </div>

          {/* Submit Button */}
          <Button
            data-testid="submit-order-btn"
            onClick={submitOrder}
            disabled={submitting || !customerName || !customerPhone || orderItems.length === 0 || !pickupDate || !pickupTimeSlot}
            className="w-full h-14 bg-[#5D1919] hover:bg-[#4A1212] text-lg font-semibold"
          >
            {submitting ? (
              "Creazione ordine..."
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" /> Crea Ordine
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BancoPage;
