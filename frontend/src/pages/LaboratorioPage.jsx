import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { API, useAuth } from "../App";
import { toast } from "sonner";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import { Checkbox } from "../components/ui/checkbox";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { 
  CalendarIcon, Bell, RefreshCw, Clock, User, Phone, 
  ChefHat, CheckCircle2, Truck, AlertCircle, Printer,
  Package, ArrowRight, FileDown, Check, Eye
} from "lucide-react";

// Notification sound
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    setTimeout(() => {
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      setTimeout(() => oscillator.stop(), 300);
    }, 100);
  } catch (e) {
    console.log("Audio not available");
  }
};

const LaboratorioPage = () => {
  const { token } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [newOrders, setNewOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("tutti");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  
  // Pop-up nuovi ordini non confermati
  const [unacknowledgedOrders, setUnacknowledgedOrders] = useState([]);
  const [showNewOrdersPopup, setShowNewOrdersPopup] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());
  
  const previousNewCount = useRef(0);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchOrders = useCallback(async () => {
    try {
      // Carica tutti gli ordini attivi (non completati/consegnati)
      const response = await axios.get(`${API}/orders`, { headers });
      // Filtra escludendo ritirato e consegnato
      const activeOrders = response.data.filter(order => 
        order.status !== 'ritirato' && order.status !== 'consegnato'
      );
      
      // Applica filtro stato se selezionato
      let filteredOrders = activeOrders;
      if (statusFilter !== "tutti") {
        filteredOrders = activeOrders.filter(order => order.status === statusFilter);
      }
      
      // Ordina per data ritiro e poi per orario
      filteredOrders.sort((a, b) => {
        if (a.pickup_date !== b.pickup_date) {
          return a.pickup_date.localeCompare(b.pickup_date);
        }
        return a.pickup_time_slot.localeCompare(b.pickup_time_slot);
      });
      
      setOrders(filteredOrders);
    } catch (error) {
      toast.error("Errore nel caricamento ordini");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, token]);

  const fetchNewOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/orders?status=nuovo`, { headers });
      setNewOrders(response.data);
    } catch (error) {
      console.error("Error fetching new orders:", error);
    }
  }, [token]);

  // Fetch unacknowledged orders for pop-up
  const fetchUnacknowledgedOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/orders/unacknowledged`, { headers });
      const orders = response.data;
      setUnacknowledgedOrders(orders);
      
      // Show pop-up if there are unacknowledged orders
      if (orders.length > 0) {
        setShowNewOrdersPopup(true);
        playNotificationSound();
      }
    } catch (error) {
      console.error("Error fetching unacknowledged orders:", error);
    }
  }, [token]);

  // Acknowledge an order
  const acknowledgeOrder = async (orderId) => {
    try {
      await axios.patch(`${API}/orders/${orderId}/acknowledge`, {}, { headers });
      setAcknowledgedIds(prev => new Set([...prev, orderId]));
      toast.success("Ordine confermato!");
    } catch (error) {
      toast.error("Errore nella conferma dell'ordine");
    }
  };

  // Acknowledge all visible orders and close pop-up
  const acknowledgeAllAndClose = async () => {
    const unackedOrders = unacknowledgedOrders.filter(o => !acknowledgedIds.has(o.id));
    
    for (const order of unackedOrders) {
      try {
        await axios.patch(`${API}/orders/${order.id}/acknowledge`, {}, { headers });
      } catch (error) {
        console.error("Error acknowledging order:", error);
      }
    }
    
    setShowNewOrdersPopup(false);
    setAcknowledgedIds(new Set());
    fetchUnacknowledgedOrders();
    fetchOrders();
    fetchNewOrders();
    toast.success("Tutti gli ordini confermati!");
  };

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`, { headers });
      setStats(response.data);
      
      // Check for new orders
      const newCount = response.data.new_orders_count;
      if (newCount > previousNewCount.current) {
        playNotificationSound();
        toast.info(`${newCount - previousNewCount.current} nuovo/i ordine/i!`, {
          icon: <Bell className="w-5 h-5 text-[#5D1919]" />
        });
        // Fetch unacknowledged orders to show pop-up
        fetchUnacknowledgedOrders();
      }
      previousNewCount.current = newCount;
      setNewOrdersCount(newCount);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [token, fetchUnacknowledgedOrders]);

  useEffect(() => {
    fetchOrders();
    fetchNewOrders();
    fetchStats();
    fetchUnacknowledgedOrders();
    
    // Poll for new orders every 10 seconds
    const interval = setInterval(() => {
      fetchOrders();
      fetchNewOrders();
      fetchStats();
      fetchUnacknowledgedOrders();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchOrders, fetchNewOrders, fetchStats, fetchUnacknowledgedOrders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`${API}/orders/${orderId}/status`, { status: newStatus }, { headers });
      toast.success(`Stato aggiornato: ${getStatusLabel(newStatus)}`);
      fetchOrders();
      fetchNewOrders();
      fetchStats();
      // Aggiorna l'ordine selezionato con il nuovo stato
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
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

  const getStatusColor = (status) => {
    const colors = {
      nuovo: "bg-yellow-100 text-yellow-800 border-yellow-300",
      in_lavorazione: "bg-blue-100 text-blue-800 border-blue-300",
      pronto: "bg-green-100 text-green-800 border-green-300",
      parzialmente_ritirato: "bg-orange-100 text-orange-800 border-orange-300",
      ritirato: "bg-emerald-100 text-emerald-800 border-emerald-300",
      consegnato: "bg-gray-100 text-gray-600 border-gray-300"
    };
    return colors[status] || colors.nuovo;
  };

  const getNextStatus = (currentStatus) => {
    const flow = {
      nuovo: "in_lavorazione",
      in_lavorazione: "pronto",
      pronto: "parzialmente_ritirato",
      parzialmente_ritirato: "ritirato"
    };
    return flow[currentStatus];
  };

  const getStatusIcon = (status) => {
    const icons = {
      nuovo: <AlertCircle className="w-5 h-5" />,
      in_lavorazione: <ChefHat className="w-5 h-5" />,
      pronto: <CheckCircle2 className="w-5 h-5" />,
      parzialmente_ritirato: <Package className="w-5 h-5" />,
      ritirato: <Truck className="w-5 h-5" />,
      consegnato: <Truck className="w-5 h-5" />
    };
    return icons[status] || icons.nuovo;
  };

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
        doc.text(`${format(new Date(mod.date), "dd/MM/yyyy HH:mm")} - ${mod.description}`, 15, y);
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
    const printContent = `
      <html>
        <head>
          <title>Ordine - ${order.customer_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .info { margin: 15px 0; }
            .items { margin-top: 20px; }
            .item { padding: 10px 0; border-bottom: 1px dashed #ccc; }
            .time { font-size: 28px; font-weight: bold; text-align: center; margin: 20px 0; }
            .notes { margin-top: 20px; padding: 10px; background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>MACELLERIA TUMMINELLO</h1>
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
                <strong>${item.product_name}</strong> - ${item.quantity} ${item.unit}
                ${item.notes ? `<br><em>Note: ${item.notes}</em>` : ''}
              </div>
            `).join('')}
          </div>
          ${order.notes ? `<div class="notes"><strong>Note ordine:</strong> ${order.notes}</div>` : ''}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const OrderCard = ({ order }) => {
    const isUrgent = order.status === "nuovo";
    
    return (
      <Card 
        data-testid={`lab-order-${order.id}`}
        className={`border-2 ${isUrgent ? 'border-yellow-400 shadow-lg' : 'border-[#D6CFC7]'} 
          cursor-pointer hover:shadow-xl transition-all`}
        onClick={() => {
          setSelectedOrder(order);
          setShowOrderDetail(true);
        }}
      >
        <CardContent className="p-0">
          {/* Header with status */}
          <div className={`px-4 py-2 flex justify-between items-center ${getStatusColor(order.status)}`}>
            <div className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              <span className="font-bold uppercase text-sm">{getStatusLabel(order.status)}</span>
            </div>
            <div className="flex items-center gap-2">
              {order.order_number && (
                <span className="text-xs font-mono font-bold opacity-75">#{order.order_number}</span>
              )}
              {isUrgent && (
                <span className="pulse-notification">
                  <Bell className="w-5 h-5" />
                </span>
              )}
            </div>
          </div>
          
          {/* Time slot - LARGE */}
          <div className="px-4 py-3 bg-[#5D1919] text-white">
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              <span className="text-2xl font-bold">{order.pickup_time_slot}</span>
            </div>
          </div>
          
          {/* Customer info */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <User className="w-5 h-5 text-[#5D1919]" />
              {order.customer_name}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              {order.customer_phone}
            </div>
            
            {/* Items preview */}
            <div className="border-t border-dashed pt-3 mt-3">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {order.items.length} prodott{order.items.length === 1 ? 'o' : 'i'}:
              </p>
              <ul className="space-y-1">
                {order.items.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="text-sm flex justify-between">
                    <span>{item.product_name}</span>
                    <span className="font-semibold">{item.quantity} {item.unit}</span>
                  </li>
                ))}
                {order.items.length > 3 && (
                  <li className="text-sm text-muted-foreground">
                    +{order.items.length - 3} altri...
                  </li>
                )}
              </ul>
            </div>

            {order.notes && (
              <div className="mt-2 p-2 bg-amber-50 rounded text-sm">
                <strong>Note:</strong> {order.notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex h-screen bg-[#F9F5F0]">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-[#D6CFC7] px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#5D1919]">Dashboard Laboratorio</h1>
              <p className="text-muted-foreground">
                Tutti gli ordini attivi (esclusi ritirati e consegnati)
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* New orders notification */}
              {newOrdersCount > 0 && (
                <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full animate-pulse">
                  <Bell className="w-5 h-5" />
                  <span className="font-bold">{newOrdersCount} nuov{newOrdersCount === 1 ? 'o' : 'i'}</span>
                </div>
              )}
              
              {/* Refresh button */}
              <Button 
                variant="outline" 
                size="icon"
                data-testid="refresh-btn"
                onClick={() => {
                  fetchOrders();
                  fetchNewOrders();
                  fetchStats();
                }}
                className="border-[#D6CFC7]"
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
              
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="status-filter" className="w-[180px] border-[#D6CFC7]">
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti gli stati</SelectItem>
                  <SelectItem value="nuovo">Nuovi</SelectItem>
                  <SelectItem value="in_lavorazione">In Lavorazione</SelectItem>
                  <SelectItem value="pronto">Pronti</SelectItem>
                  <SelectItem value="parzialmente_ritirato">Parz. Ritirati</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Stats bar */}
          {stats && (
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold">{stats.by_status.nuovo || 0} Nuovi</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-lg">
                <ChefHat className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">{stats.by_status.in_lavorazione || 0} In Lavorazione</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-semibold">{stats.by_status.pronto || 0} Pronti</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-lg">
                <Package className="w-5 h-5 text-orange-600" />
                <span className="font-semibold">{stats.by_status.parzialmente_ritirato || 0} Parz. Ritirati</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Orders Grid */}
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-6">
            {/* SEZIONE NUOVI ORDINI */}
            {newOrders.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full">
                    <Bell className="w-5 h-5 animate-pulse" />
                    <span className="font-bold text-lg">{newOrders.length} NUOV{newOrders.length === 1 ? 'O' : 'I'} ORDIN{newOrders.length === 1 ? 'E' : 'I'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {newOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
                <div className="border-b-2 border-dashed border-[#D6CFC7] my-6"></div>
              </div>
            )}

            {/* TUTTI GLI ORDINI ATTIVI */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#5D1919]">
                Ordini Attivi ({orders.filter(o => o.status !== 'nuovo').length})
              </h2>
              <p className="text-sm text-muted-foreground">Esclusi: Ritirati e Consegnati</p>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
              </div>
            ) : orders.filter(o => o.status !== 'nuovo').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Package className="w-20 h-20 text-[#D6CFC7] mb-4" />
                <h3 className="text-xl font-semibold text-[#2D2D2D]">Nessun ordine attivo</h3>
                <p className="text-muted-foreground">
                  Tutti gli ordini sono stati completati
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {orders.filter(o => o.status !== 'nuovo').map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
        <DialogContent className="max-w-lg">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Dettaglio Ordine {selectedOrder.order_number && <span className="text-[#5D1919] font-mono">#{selectedOrder.order_number}</span>}</span>
                  <Badge className={`${getStatusColor(selectedOrder.status)} border`}>
                    {getStatusLabel(selectedOrder.status)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Time slot highlight */}
                <div className="bg-[#5D1919] text-white p-4 rounded-lg text-center">
                  <p className="text-sm opacity-80">Ritiro</p>
                  <p className="text-3xl font-bold">{selectedOrder.pickup_time_slot}</p>
                  <p className="text-sm opacity-80">
                    {format(new Date(selectedOrder.pickup_date), "dd MMMM yyyy", { locale: it })}
                  </p>
                </div>
                
                {/* Customer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-[#5D1919]" />
                    <span className="text-lg font-semibold">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${selectedOrder.customer_phone}`} className="hover:underline">
                      {selectedOrder.customer_phone}
                    </a>
                  </div>
                </div>
                
                {/* Items */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Prodotti Ordinati</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start pb-2 border-b border-dashed last:border-0">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          {item.notes && (
                            <p className="text-sm text-amber-600">→ {item.notes}</p>
                          )}
                        </div>
                        <span className="font-bold text-[#5D1919]">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedOrder.notes && (
                  <div className="bg-amber-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-amber-800">Note ordine:</p>
                    <p className="text-amber-900">{selectedOrder.notes}</p>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Creato da: {selectedOrder.created_by} • {format(new Date(selectedOrder.created_at), "dd/MM/yyyy HH:mm")}
                </div>
              </div>
              
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm font-medium whitespace-nowrap">Stato:</span>
                  <Select 
                    value={selectedOrder.status} 
                    onValueChange={(newStatus) => updateOrderStatus(selectedOrder.id, newStatus)}
                  >
                    <SelectTrigger className="flex-1" data-testid="status-select">
                      <SelectValue />
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
                </div>
                <Button
                  variant="outline"
                  onClick={() => generatePDF(selectedOrder)}
                  data-testid="download-pdf-btn"
                >
                  <FileDown className="w-4 h-4 mr-2" /> PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => printOrder(selectedOrder)}
                  data-testid="print-order-btn"
                >
                  <Printer className="w-4 h-4 mr-2" /> Stampa
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pop-up Nuovi Ordini - Presa Visione */}
      <Dialog open={showNewOrdersPopup} onOpenChange={(open) => {
        // Non permettere di chiudere cliccando fuori se ci sono ordini non confermati
        const unackedCount = unacknowledgedOrders.filter(o => !acknowledgedIds.has(o.id)).length;
        if (!open && unackedCount > 0) {
          toast.error("Conferma tutti gli ordini prima di chiudere!");
          return;
        }
        setShowNewOrdersPopup(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Bell className="w-6 h-6 text-yellow-600 animate-pulse" />
              </div>
              <div>
                <span className="text-[#5D1919]">NUOVI ORDINI IN ARRIVO!</span>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  Conferma la presa visione per ogni ordine
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {unacknowledgedOrders.map(order => {
                const isAcknowledged = acknowledgedIds.has(order.id);
                return (
                  <Card 
                    key={order.id} 
                    className={`border-2 transition-all ${
                      isAcknowledged 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-yellow-300 bg-yellow-50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {order.order_number && (
                              <Badge className="bg-[#5D1919] text-white">
                                #{order.order_number}
                              </Badge>
                            )}
                            <span className="font-bold text-lg">{order.customer_name}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span>{order.customer_phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{order.pickup_time_slot}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                              <span>{format(new Date(order.pickup_date), "dd/MM/yyyy")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span>{order.items.length} prodott{order.items.length === 1 ? 'o' : 'i'}</span>
                            </div>
                          </div>
                          
                          {/* Preview prodotti */}
                          <div className="mt-3 p-2 bg-white/50 rounded text-sm">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>{item.product_name}</span>
                                <span className="font-semibold">{item.quantity} {item.unit}</span>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <span className="text-muted-foreground">+{order.items.length - 3} altri...</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Checkbox Presa Visione */}
                        <div className="ml-4 flex flex-col items-center">
                          <div 
                            className={`w-12 h-12 rounded-full border-3 flex items-center justify-center cursor-pointer transition-all ${
                              isAcknowledged 
                                ? 'bg-green-500 border-green-500' 
                                : 'bg-white border-yellow-400 hover:border-green-400'
                            }`}
                            onClick={() => !isAcknowledged && acknowledgeOrder(order.id)}
                          >
                            {isAcknowledged ? (
                              <Check className="w-7 h-7 text-white" />
                            ) : (
                              <Eye className="w-6 h-6 text-yellow-500" />
                            )}
                          </div>
                          <span className={`text-xs mt-1 font-medium ${
                            isAcknowledged ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {isAcknowledged ? 'VISTO' : 'CLICCA'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
          
          <DialogFooter className="flex-row gap-2 pt-4 border-t">
            <div className="flex-1 text-sm text-muted-foreground">
              {acknowledgedIds.size} di {unacknowledgedOrders.length} confermati
            </div>
            <Button
              onClick={acknowledgeAllAndClose}
              disabled={acknowledgedIds.size < unacknowledgedOrders.length}
              className="bg-[#5D1919] hover:bg-[#4A1212]"
            >
              <Check className="w-4 h-4 mr-2" />
              Conferma Tutti e Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LaboratorioPage;
