import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { 
  CalendarIcon, Search, User, Phone, Clock, Package,
  History, Users, FileText, Trash2, Eye, FileDown, Printer,
  Pencil, Plus, Minus, Save, X
} from "lucide-react";

const StoricoPage = () => {
  const { token, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState("ordini");
  
  // Orders state
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [statusFilter, setStatusFilter] = useState("tutti");
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  
  // Customers state
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  
  // Detail dialog
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  
  // Edit order dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editNotes, setEditNotes] = useState("");
  const [products, setProducts] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState("pickup_date");
  const [sortDirection, setSortDirection] = useState("desc");
  
  const headers = { Authorization: `Bearer ${token}` };

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await axios.patch(`${API}/orders/${orderId}/status`, { status: newStatus }, { headers });
      toast.success(`Stato aggiornato: ${getStatusLabel(newStatus)}`);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      nuovo: "Nuovo",
      in_lavorazione: "In Lavorazione",
      pronto: "Pronto",
      parzialmente_ritirato: "Parzialmente Ritirato",
      ritirato: "Ritirato",
      consegnato: "Consegnato"
    };
    return labels[status] || status;
  };

  // Edit order functions
  const openEditDialog = (order) => {
    setEditingOrder(order);
    setEditItems([...order.items]);
    setEditNotes(order.notes || "");
    setShowEditDialog(true);
    setShowDetail(false);
  };

  const addProductToEdit = (product) => {
    const existing = editItems.find(item => item.product_id === product.id);
    if (existing) {
      setEditItems(editItems.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setEditItems([...editItems, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit: product.unit,
        notes: ""
      }]);
    }
  };

  const updateEditItemQuantity = (productId, delta) => {
    setEditItems(editItems.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(0.5, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateEditItemNotes = (productId, notes) => {
    setEditItems(editItems.map(item => 
      item.product_id === productId ? { ...item, notes } : item
    ));
  };

  const removeEditItem = (productId) => {
    setEditItems(editItems.filter(item => item.product_id !== productId));
  };

  const saveOrderEdit = async () => {
    if (editItems.length === 0) {
      toast.error("Aggiungi almeno un prodotto");
      return;
    }

    setSavingEdit(true);
    try {
      const updateData = {
        items: editItems,
        notes: editNotes
      };

      await axios.put(`${API}/orders/${editingOrder.id}`, updateData, { headers });
      toast.success("Ordine modificato con successo!");
      setShowEditDialog(false);
      fetchOrders();
    } catch (error) {
      toast.error("Errore nella modifica dell'ordine");
    } finally {
      setSavingEdit(false);
    }
  };

  // Generate PDF function
  const generatePDF = (order) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoUrl = "https://customer-assets.emergentagent.com/job_319faa5c-5fca-49f2-9e55-096d5a0f1183/artifacts/hvvg6jn6_518372070_1411016301023513_6348586323466964816_n.jpg";
    
    // Logo in alto a destra (piccolo piccolo)
    try {
      doc.addImage(logoUrl, 'JPEG', pageWidth - 30, 8, 18, 15);
    } catch (e) {
      doc.setFontSize(8);
      doc.setTextColor(93, 25, 25);
      doc.text('MACELLERIA TUMMINELLO', pageWidth - 10, 15, { align: 'right' });
    }
    
    // Titolo a sinistra con numero ordine
    doc.setTextColor(93, 25, 25);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('COMANDA ORDINE', 15, 20);
    
    // Numero ordine
    if (order.order_number) {
      doc.setFontSize(12);
      doc.text(`N° ${order.order_number}`, 85, 20);
    }
    
    doc.setDrawColor(93, 25, 25);
    doc.setLineWidth(0.5);
    doc.line(15, 24, pageWidth - 35, 24);
    
    // Status badge
    const statusLabels = {
      nuovo: "NUOVO",
      in_lavorazione: "IN LAVORAZIONE",
      pronto: "PRONTO",
      parzialmente_ritirato: "PARZIALMENTE RITIRATO",
      ritirato: "RITIRATO",
      consegnato: "CONSEGNATO"
    };
    const statusColors = {
      nuovo: [254, 243, 199],
      in_lavorazione: [219, 234, 254],
      pronto: [220, 252, 231],
      parzialmente_ritirato: [254, 215, 170],
      ritirato: [220, 252, 231],
      consegnato: [243, 244, 246]
    };
    const statusTextColors = {
      nuovo: [161, 98, 7],
      in_lavorazione: [30, 64, 175],
      pronto: [22, 101, 52],
      parzialmente_ritirato: [194, 65, 12],
      ritirato: [22, 101, 52],
      consegnato: [75, 85, 99]
    };
    
    // Status box sotto il titolo
    const statusColor = statusColors[order.status] || statusColors.nuovo;
    const statusTextColor = statusTextColors[order.status] || statusTextColors.nuovo;
    const statusText = statusLabels[order.status] || order.status.toUpperCase();
    const statusWidth = doc.getTextWidth(statusText) + 10;
    
    doc.setFillColor(...statusColor);
    doc.roundedRect(15, 28, statusWidth, 8, 1.5, 1.5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...statusTextColor);
    doc.setFont('helvetica', 'bold');
    doc.text(statusText, 20, 33);
    
    // Data e ora ritiro
    doc.setTextColor(45, 45, 45);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    let y = 45;
    
    doc.text('DATA RITIRO:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(order.pickup_date), "dd/MM/yyyy"), 50, y);
    
    doc.setFont('helvetica', 'bold');
    doc.text('ORARIO:', 90, y);
    doc.setFont('helvetica', 'normal');
    doc.text(order.pickup_time_slot, 115, y);
    
    // Cliente
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(order.customer_name, 42, y);
    
    doc.setFont('helvetica', 'bold');
    doc.text('TEL:', 100, y);
    doc.setFont('helvetica', 'normal');
    doc.text(order.customer_phone, 112, y);
    
    // Linea separatrice
    y += 5;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(15, y, pageWidth - 15, y);
    
    // Intestazione prodotti
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(93, 25, 25);
    doc.text('PRODOTTI ORDINATI', 15, y);
    doc.text('QTÀ', pageWidth - 45, y);
    doc.text('✓', pageWidth - 18, y);
    
    y += 2;
    doc.setDrawColor(93, 25, 25);
    doc.setLineWidth(0.3);
    doc.line(15, y, pageWidth - 15, y);
    
    // Lista prodotti con note sotto ogni prodotto
    doc.setTextColor(45, 45, 45);
    y += 5;
    
    order.items.forEach((item, index) => {
      if (y > 265) {
        doc.addPage();
        y = 15;
      }
      
      // Checkbox quadrato (più piccolo)
      doc.setDrawColor(93, 25, 25);
      doc.setLineWidth(0.4);
      doc.rect(pageWidth - 22, y - 3, 6, 6, 'S');
      
      // Nome prodotto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(item.product_name, 15, y);
      
      // Tag "NEW" per prodotti aggiunti successivamente
      if (item.is_new) {
        const productNameWidth = doc.getTextWidth(item.product_name);
        doc.setFillColor(34, 197, 94); // Verde
        doc.roundedRect(17 + productNameWidth, y - 3.5, 12, 5, 1, 1, 'F');
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('NEW', 18 + productNameWidth, y - 0.5);
        doc.setTextColor(45, 45, 45);
      }
      
      // Quantità
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const qtyText = `${item.quantity} ${item.unit}`;
      doc.text(qtyText, pageWidth - 45, y);
      
      // Nota del prodotto (sotto, indentata)
      if (item.notes) {
        y += 4;
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9);
        doc.text(`  → ${item.notes}`, 15, y);
        doc.setTextColor(45, 45, 45);
      }
      
      // Data aggiunta se è un prodotto nuovo
      if (item.is_new && item.added_at) {
        y += 4;
        doc.setFontSize(7);
        doc.setTextColor(34, 197, 94);
        doc.text(`  ✓ Aggiunto il ${format(new Date(item.added_at), "dd/MM/yyyy HH:mm")}`, 15, y);
        doc.setTextColor(45, 45, 45);
      }
      
      // Linea tratteggiata tra prodotti (più sottile)
      y += 4;
      doc.setDrawColor(210, 210, 210);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.setLineWidth(0.15);
      doc.line(15, y, pageWidth - 15, y);
      doc.setLineDashPattern([], 0);
      
      y += 5;
    });
    
    // Note ordine
    if (order.notes) {
      y += 3;
      doc.setFillColor(254, 249, 195);
      doc.rect(15, y - 3, pageWidth - 30, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(161, 98, 7);
      doc.text('NOTE ORDINE:', 18, y + 2);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(order.notes, pageWidth - 40);
      doc.text(splitNotes, 18, y + 7);
    }
    
    // Storico modifiche (se presente)
    if (order.modifications && order.modifications.length > 0) {
      y += 18;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'bold');
      doc.text('MODIFICHE:', 15, y);
      doc.setFont('helvetica', 'normal');
      order.modifications.forEach((mod, idx) => {
        y += 4;
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        doc.text(`${format(new Date(mod.date), "dd/MM/yyyy HH:mm")} - ${mod.description} (${mod.modified_by})`, 15, y);
      });
    }
    
    // Footer
    const footerY = 287;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text(`Creato da: ${order.created_by} | ${format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}`, 15, footerY);
    doc.text('Contrada Ettore Infersa 126, Marsala (TP)', pageWidth - 15, footerY, { align: 'right' });
    
    // Save PDF
    const fileName = `comanda_${order.customer_name.replace(/\s+/g, '_')}_${format(new Date(order.pickup_date), "ddMMyyyy")}.pdf`;
    doc.save(fileName);
    toast.success('PDF scaricato!');
  };

  const printOrder = (order) => {
    const statusLabels = {
      nuovo: "NUOVO",
      in_lavorazione: "IN LAVORAZIONE",
      pronto: "PRONTO",
      consegnato: "CONSEGNATO"
    };
    
    const printContent = `
      <html>
        <head>
          <title>Ordine - ${order.customer_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; border-bottom: 2px solid #5D1919; padding-bottom: 10px; color: #5D1919; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
            .status-nuovo { background: #fef3c7; color: #92400e; }
            .status-in_lavorazione { background: #dbeafe; color: #1e40af; }
            .status-pronto { background: #dcfce7; color: #166534; }
            .status-consegnato { background: #f3f4f6; color: #4b5563; }
            .info { margin: 15px 0; }
            .items { margin-top: 20px; }
            .item { padding: 10px 0; border-bottom: 1px dashed #ccc; display: flex; align-items: center; }
            .item-checkbox { width: 20px; height: 20px; border: 2px solid #5D1919; margin-right: 15px; }
            .item-details { flex: 1; }
            .item-qty { font-weight: bold; min-width: 80px; text-align: right; }
            .time { font-size: 28px; font-weight: bold; text-align: center; margin: 20px 0; color: #5D1919; }
            .notes { margin-top: 20px; padding: 10px; background: #fef3c7; border-radius: 4px; }
            .item-notes { color: #d97706; font-style: italic; font-size: 14px; margin-top: 4px; }
          </style>
        </head>
        <body>
          <h1>MACELLERIA TUMMINELLO</h1>
          <span class="status status-${order.status}">${statusLabels[order.status] || order.status}</span>
          <div class="time">RITIRO: ${order.pickup_time_slot}</div>
          <div class="info">
            <strong>Cliente:</strong> ${order.customer_name}<br>
            <strong>Telefono:</strong> ${order.customer_phone}<br>
            <strong>Data:</strong> ${format(new Date(order.pickup_date), "dd/MM/yyyy")}
          </div>
          <div class="items">
            <h3>PRODOTTI:</h3>
            ${order.items.map(item => `
              <div class="item">
                <div class="item-checkbox"></div>
                <div class="item-details">
                  <strong>${item.product_name}</strong>
                  ${item.notes ? `<div class="item-notes">→ ${item.notes}</div>` : ''}
                </div>
                <div class="item-qty">${item.quantity} ${item.unit}</div>
              </div>
            `).join('')}
          </div>
          ${order.notes ? `<div class="notes"><strong>Note ordine:</strong> ${order.notes}</div>` : ''}
          <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
            Contrada Ettore Infersa 126, Marsala (TP)
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchProducts();
  }, [fromDate, toDate, statusFilter]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`, { headers });
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      let url = `${API}/orders?`;
      if (fromDate) url += `from_date=${format(fromDate, "yyyy-MM-dd")}&`;
      if (toDate) url += `to_date=${format(toDate, "yyyy-MM-dd")}&`;
      if (statusFilter !== "tutti") url += `status=${statusFilter}&`;
      
      const response = await axios.get(url, { headers });
      setOrders(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento ordini");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`, { headers });
      setCustomers(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo ordine?")) return;
    
    try {
      await axios.delete(`${API}/orders/${orderId}`, { headers });
      toast.success("Ordine eliminato");
      fetchOrders();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      nuovo: "bg-yellow-100 text-yellow-800 border-yellow-200",
      in_lavorazione: "bg-blue-100 text-blue-800 border-blue-200",
      pronto: "bg-green-100 text-green-800 border-green-200",
      parzialmente_ritirato: "bg-orange-100 text-orange-800 border-orange-200",
      ritirato: "bg-emerald-100 text-emerald-800 border-emerald-200",
      consegnato: "bg-gray-100 text-gray-600 border-gray-200"
    };
    const labels = {
      nuovo: "Nuovo",
      in_lavorazione: "In Lavorazione",
      pronto: "Pronto",
      parzialmente_ritirato: "Parz. Ritirato",
      ritirato: "Ritirato",
      consegnato: "Consegnato"
    };
    return { style: styles[status] || styles.nuovo, label: labels[status] || status };
  };

  const StatusDropdown = ({ order }) => {
    const statusInfo = getStatusBadge(order.status);
    return (
      <Select 
        value={order.status} 
        onValueChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
      >
        <SelectTrigger 
          className={`w-auto h-auto px-2.5 py-0.5 text-xs font-semibold border rounded-full ${statusInfo.style}`}
          data-testid={`status-badge-${order.id}`}
        >
          <SelectValue>{statusInfo.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="nuovo">Nuovo</SelectItem>
          <SelectItem value="in_lavorazione">In Lavorazione</SelectItem>
          <SelectItem value="pronto">Pronto</SelectItem>
          <SelectItem value="parzialmente_ritirato">Parzialmente Ritirato</SelectItem>
          <SelectItem value="ritirato">Ritirato</SelectItem>
          <SelectItem value="consegnato">Consegnato</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  const filteredOrders = orders.filter(order => {
    if (!orderSearch) return true;
    const search = orderSearch.toLowerCase();
    return (
      order.customer_name.toLowerCase().includes(search) ||
      order.customer_phone.includes(search) ||
      (order.order_number && order.order_number.includes(search)) ||
      order.items.some(item => item.product_name.toLowerCase().includes(search))
    );
  });

  // Sorting function
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortColumn) {
      case "order_number":
        // Extract number from "NUM/YEAR" format
        aVal = a.order_number ? parseInt(a.order_number.split("/")[0]) : 0;
        bVal = b.order_number ? parseInt(b.order_number.split("/")[0]) : 0;
        break;
      case "pickup_date":
        aVal = a.pickup_date;
        bVal = b.pickup_date;
        break;
      case "pickup_time_slot":
        aVal = a.pickup_time_slot;
        bVal = b.pickup_time_slot;
        break;
      case "customer_name":
        aVal = a.customer_name.toLowerCase();
        bVal = b.customer_name.toLowerCase();
        break;
      case "status":
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        aVal = a[sortColumn];
        bVal = b[sortColumn];
    }
    
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortableHeader = ({ column, children }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column && (
          <span className="text-[#5D1919]">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </TableHead>
  );

  const filteredCustomers = customers.filter(customer => {
    if (!customerSearch) return true;
    const search = customerSearch.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.phone.includes(search)
    );
  });

  const clearFilters = () => {
    setFromDate(null);
    setToDate(null);
    setStatusFilter("tutti");
    setOrderSearch("");
  };

  return (
    <div className="flex h-screen bg-[#F9F5F0]">
      <Sidebar />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#5D1919] mb-2">Storico Ordini</h1>
          <p className="text-muted-foreground">Consulta e stampa ordini passati</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-[#D6CFC7]">
            <TabsTrigger 
              value="ordini" 
              data-testid="tab-ordini"
              className="data-[state=active]:bg-[#5D1919] data-[state=active]:text-white"
            >
              <History className="w-4 h-4 mr-2" /> Ordini
            </TabsTrigger>
            <TabsTrigger 
              value="clienti"
              data-testid="tab-clienti"
              className="data-[state=active]:bg-[#5D1919] data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" /> Clienti
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="ordini" className="space-y-4">
            {/* Filters */}
            <Card className="border-[#D6CFC7]">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-1 block">Cerca</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        data-testid="order-search"
                        placeholder="Cliente, telefono, prodotto..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="pl-9 border-[#D6CFC7]"
                      />
                    </div>
                  </div>
                  
                  {/* From Date */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Da</label>
                    <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[140px] border-[#D6CFC7]">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate ? format(fromDate, "dd/MM/yy") : "Data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={fromDate}
                          onSelect={(date) => {
                            setFromDate(date);
                            setFromDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* To Date */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">A</label>
                    <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[140px] border-[#D6CFC7]">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? format(toDate, "dd/MM/yy") : "Data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={toDate}
                          onSelect={(date) => {
                            setToDate(date);
                            setToDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Status Filter */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Stato</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px] border-[#D6CFC7]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tutti">Tutti</SelectItem>
                        <SelectItem value="nuovo">Nuovo</SelectItem>
                        <SelectItem value="in_lavorazione">In Lavorazione</SelectItem>
                        <SelectItem value="pronto">Pronto</SelectItem>
                        <SelectItem value="consegnato">Consegnato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Clear Filters */}
                  <Button 
                    variant="ghost" 
                    onClick={clearFilters}
                    className="text-[#5D1919]"
                  >
                    Pulisci filtri
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card className="border-[#D6CFC7]">
              <ScrollArea className="h-[calc(100vh-380px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader column="order_number">N° Ordine</SortableHeader>
                      <SortableHeader column="pickup_date">Data Ritiro</SortableHeader>
                      <SortableHeader column="pickup_time_slot">Orario</SortableHeader>
                      <SortableHeader column="customer_name">Cliente</SortableHeader>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Prodotti</TableHead>
                      <SortableHeader column="status">Stato</SortableHeader>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="spinner mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : sortedOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Nessun ordine trovato</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedOrders.map(order => (
                        <TableRow key={order.id} data-testid={`history-order-${order.id}`}>
                          <TableCell className="font-mono font-semibold text-[#5D1919]">
                            {order.order_number || '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(order.pickup_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-[#C5A059]">
                              {order.pickup_time_slot}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.customer_name}
                          </TableCell>
                          <TableCell>{order.customer_phone}</TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {order.items.length} prodott{order.items.length === 1 ? 'o' : 'i'}
                            </span>
                          </TableCell>
                          <TableCell><StatusDropdown order={order} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowDetail(true);
                                }}
                                data-testid={`view-order-${order.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {user?.role === "banco" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => deleteOrder(order.id)}
                                  data-testid={`delete-order-${order.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
            
            <p className="text-sm text-muted-foreground">
              {sortedOrders.length} ordini trovati
            </p>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="clienti" className="space-y-4">
            {/* Search */}
            <Card className="border-[#D6CFC7]">
              <CardContent className="p-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    data-testid="customer-search"
                    placeholder="Cerca cliente per nome o telefono..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 border-[#D6CFC7]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map(customer => (
                <Card 
                  key={customer.id} 
                  className="border-[#D6CFC7]"
                  data-testid={`customer-card-${customer.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#5D1919] text-white flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#2D2D2D] truncate">
                          {customer.name}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {customer.phone}
                        </p>
                        {customer.notes && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {customer.notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Cliente dal {format(new Date(customer.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-[#D6CFC7] mb-4" />
                <p className="text-muted-foreground">Nessun cliente trovato</p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              {filteredCustomers.length} clienti
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Dettaglio Ordine {selectedOrder.order_number && <span className="text-[#5D1919] font-mono">#{selectedOrder.order_number}</span>}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">Ritiro</p>
                    <p className="text-lg font-semibold">
                      {format(new Date(selectedOrder.pickup_date), "dd MMMM yyyy", { locale: it })}
                    </p>
                    <Badge variant="outline" className="mt-1 border-[#C5A059]">
                      <Clock className="w-3 h-3 mr-1" /> {selectedOrder.pickup_time_slot}
                    </Badge>
                  </div>
                  <StatusDropdown order={selectedOrder} />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-[#5D1919]" />
                    <span className="font-semibold">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{selectedOrder.customer_phone}</span>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-[#F9F5F0]">
                  <h4 className="font-semibold mb-3">Prodotti</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          {item.notes && (
                            <p className="text-sm text-amber-600">→ {item.notes}</p>
                          )}
                        </div>
                        <span className="font-semibold">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedOrder.notes && (
                  <div className="bg-amber-50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Note:</p>
                    <p>{selectedOrder.notes}</p>
                  </div>
                )}
                
                {/* Storico modifiche */}
                {selectedOrder.modifications && selectedOrder.modifications.length > 0 && (
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Modifiche:</p>
                    <div className="space-y-2">
                      {selectedOrder.modifications.map((mod, idx) => (
                        <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                            {format(new Date(mod.date), "dd/MM/yyyy HH:mm")}
                          </span>
                          <span>{mod.description}</span>
                          <span className="text-xs text-gray-400">({mod.modified_by})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground border-t pt-3">
                  <p>Creato da: {selectedOrder.created_by}</p>
                  <p>Data creazione: {format(new Date(selectedOrder.created_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </div>
              
              <DialogFooter className="flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => openEditDialog(selectedOrder)}
                  data-testid="edit-order-btn"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Modifica
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => generatePDF(selectedOrder)}
                  data-testid="history-download-pdf-btn"
                >
                  <FileDown className="w-4 h-4 mr-2" /> PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => printOrder(selectedOrder)}
                  data-testid="history-print-btn"
                >
                  <Printer className="w-4 h-4 mr-2" /> Stampa
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {editingOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#5D1919]" />
                  Modifica Ordine - {editingOrder.customer_name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-auto space-y-4">
                {/* Info ordine */}
                <div className="bg-[#F9F5F0] p-3 rounded-lg text-sm">
                  <p><strong>Data ritiro:</strong> {format(new Date(editingOrder.pickup_date), "dd/MM/yyyy")} - {editingOrder.pickup_time_slot}</p>
                  <p><strong>Telefono:</strong> {editingOrder.customer_phone}</p>
                </div>

                {/* Prodotti nell'ordine */}
                <div>
                  <Label className="text-sm font-semibold">Prodotti nell'ordine ({editItems.length})</Label>
                  <ScrollArea className="h-[200px] mt-2 border rounded-lg p-2">
                    {editItems.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Nessun prodotto</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {editItems.map(item => (
                          <div key={item.product_id} className="p-2 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-sm">{item.product_name}</span>
                              <button 
                                onClick={() => removeEditItem(item.product_id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => updateEditItemQuantity(item.product_id, -0.5)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-16 text-center text-sm font-semibold">
                                {item.quantity} {item.unit}
                              </span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => updateEditItemQuantity(item.product_id, 0.5)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <Input
                              placeholder="Note prodotto..."
                              value={item.notes || ""}
                              onChange={(e) => updateEditItemNotes(item.product_id, e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Aggiungi prodotto */}
                <div>
                  <Label className="text-sm font-semibold">Aggiungi prodotto</Label>
                  <div className="mt-2 border rounded-lg p-2 max-h-[150px] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {products.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          className="flex items-center gap-2 p-2 text-left text-sm border rounded-lg hover:bg-[#F9F5F0] hover:border-[#5D1919] transition-colors"
                          onClick={() => addProductToEdit(product)}
                        >
                          <Plus className="w-4 h-4 text-[#5D1919] flex-shrink-0" />
                          <span className="truncate">{product.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">({product.unit})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Note ordine */}
                <div>
                  <Label className="text-sm font-semibold">Note ordine</Label>
                  <Textarea
                    placeholder="Note aggiuntive..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="mt-2 min-h-[60px]"
                  />
                </div>

                {/* Avviso modifica */}
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
                  <p className="text-amber-800">
                    <strong>Nota:</strong> Le modifiche verranno registrate con data e ora nel sistema.
                  </p>
                </div>
              </div>
              
              <DialogFooter className="flex-row gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Annulla
                </Button>
                <Button 
                  onClick={saveOrderEdit}
                  disabled={savingEdit || editItems.length === 0}
                  className="bg-[#5D1919] hover:bg-[#4A1212]"
                  data-testid="save-edit-btn"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingEdit ? "Salvataggio..." : "Salva Modifiche"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoricoPage;
