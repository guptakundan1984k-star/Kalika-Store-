import React, { useState } from 'react';
import { 
  Package, CheckCircle, Truck, Clock, ArrowRight, 
  Trash2, Search, Filter, ShoppingBag, MapPin, Phone
} from 'lucide-react';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface AdminOrderWorkflowProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
}

export const AdminOrderWorkflow: React.FC<AdminOrderWorkflowProps> = ({ orders, onUpdateStatus }) => {
  const [search, setSearch] = useState('');
  
  // Only show orders that are actionable for packing/delivery
  const actionableOrders = orders.filter(o => 
    ['Pending', 'Order Received', 'Packed', 'Out for Delivery'].includes(o.status)
  ).filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.userName || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.userPhone || '').includes(search)
  ).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Order Workflow</h2>
          <p className="text-sm text-gray-500 font-medium">Streamlined view for packing and dispatching orders.</p>
        </div>
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search active orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Step 1: Pending (To be Received) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase tracking-widest text-xs">New Orders ({actionableOrders.filter(o => o.status === 'Pending').length})</h3>
          </div>
          
          <div className="space-y-4">
            {actionableOrders.filter(o => o.status === 'Pending').map(order => (
              <WorkflowCard 
                key={order.id} 
                order={order} 
                nextStatus="Order Received" 
                nextLabel="Receive Order"
                onUpdate={onUpdateStatus}
              />
            ))}
            {actionableOrders.filter(o => o.status === 'Pending').length === 0 && (
              <EmptyState icon={Clock} message="No new orders." />
            )}
          </div>
        </div>

        {/* Step 2: Order Received (To be Packed) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-500">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase tracking-widest text-xs">Ready to Pack ({actionableOrders.filter(o => o.status === 'Order Received').length})</h3>
          </div>

          <div className="space-y-4">
            {actionableOrders.filter(o => o.status === 'Order Received').map(order => (
              <WorkflowCard 
                key={order.id} 
                order={order} 
                nextStatus="Packed" 
                nextLabel="Mark as Packed"
                onUpdate={onUpdateStatus}
              />
            ))}
            {actionableOrders.filter(o => o.status === 'Order Received').length === 0 && (
              <EmptyState icon={Package} message="No orders to pack." />
            )}
          </div>
        </div>

        {/* Step 3: Packed (To be Dispatched) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase tracking-widest text-xs">Ready to Dispatch ({actionableOrders.filter(o => o.status === 'Packed').length})</h3>
          </div>

          <div className="space-y-4">
            {actionableOrders.filter(o => o.status === 'Packed').map(order => (
              <WorkflowCard 
                key={order.id} 
                order={order} 
                nextStatus="Out for Delivery" 
                nextLabel="Dispatch Order"
                onUpdate={onUpdateStatus}
              />
            ))}
            {actionableOrders.filter(o => o.status === 'Packed').length === 0 && (
              <EmptyState icon={Truck} message="No orders ready for dispatch." />
            )}
          </div>
        </div>

        {/* Step 4: Out for Delivery (To be Delivered) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase tracking-widest text-xs">Out for Delivery ({actionableOrders.filter(o => o.status === 'Out for Delivery').length})</h3>
          </div>

          <div className="space-y-4">
            {actionableOrders.filter(o => o.status === 'Out for Delivery').map(order => (
              <WorkflowCard 
                key={order.id} 
                order={order} 
                nextStatus="Delivered" 
                nextLabel="Complete Delivery"
                onUpdate={onUpdateStatus}
              />
            ))}
            {actionableOrders.filter(o => o.status === 'Out for Delivery').length === 0 && (
              <EmptyState icon={CheckCircle} message="No orders in transit." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface WorkflowCardProps {
  order: Order;
  nextStatus: Order['status'];
  nextLabel: string;
  onUpdate: (id: string, status: Order['status']) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ order, nextStatus, nextLabel, onUpdate }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-black text-gray-900">#{order.id.slice(-8).toUpperCase()}</span>
            <span className={cn(
              "text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border",
              order.status === 'Pending' ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-cyan-50 text-cyan-500 border-cyan-100'
            )}>
              {order.status}
            </span>
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {new Date(order.createdAt).toLocaleTimeString()} • {order.items.length} Items
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-primary">₹{order.total}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.deliveryType}</p>
        </div>
      </div>

      <div className="space-y-3 mb-6 bg-gray-50 rounded-2xl p-4">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white overflow-hidden shadow-sm shrink-0">
                <img src={item.image || undefined} alt="" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold text-gray-700">{item.name}</span>
            </div>
            <span className="text-xs font-black text-primary">x{item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <MapPin className="w-4 h-4 text-gray-400" />
        <p className="text-[10px] font-medium text-gray-500 line-clamp-1">{order.address?.manual || 'No address provided'}</p>
      </div>

      <button 
        onClick={() => onUpdate(order.id, nextStatus)}
        className="w-full bg-primary text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2 group-hover:gap-4"
      >
        {nextLabel}
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[40px] p-12 flex flex-col items-center justify-center text-center space-y-4">
    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-gray-200 shadow-inner">
      <Icon className="w-8 h-8" />
    </div>
    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{message}</p>
  </div>
);
