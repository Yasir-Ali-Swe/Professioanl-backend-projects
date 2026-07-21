// // pages/invoices/GenerateInvoice.jsx
// import { useState, useRef, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { useAuth } from '@/hooks/useRedux';
// import { getRolePrefix } from '@/lib/rolePaths';
// import * as z from 'zod';
// import {
//     Field,
//     FieldLabel,
//     FieldError,
//     FieldContent,
// } from '@/components/ui/field';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import {
//     Table,
//     TableBody,
//     TableCell,
//     TableHead,
//     TableHeader,
//     TableRow,
// } from '@/components/ui/table';
// import {
//     ArrowLeft,
//     Search,
//     Plus,
//     Loader2,
//     Package,
//     Trash2,
//     X,
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/lib/utils';

// // Dummy Data
// const dummyProducts = [
//     { _id: '1', name: 'Wireless Mouse', sku: 'SKU-001', sellingPrice: 29.99, quantity: 45 },
//     { _id: '2', name: 'USB-C Charger', sku: 'SKU-002', sellingPrice: 19.99, quantity: 8 },
//     { _id: '3', name: 'Bluetooth Speaker', sku: 'SKU-003', sellingPrice: 49.99, quantity: 2 },
//     { _id: '4', name: 'HDMI Cable', sku: 'SKU-004', sellingPrice: 9.99, quantity: 120 },
//     { _id: '5', name: 'Wireless Keyboard', sku: 'SKU-005', sellingPrice: 59.99, quantity: 15 },
// ];

// // Zod schema for validation
// const invoiceSchema = z.object({
//     customerName: z.string().min(2, { message: 'Customer name is required' }),
//     tax: z.string().optional().transform(val => val ? parseFloat(val) : 0),
//     discount: z.string().optional().transform(val => val ? parseFloat(val) : 0),
// });

// const GenerateInvoice = () => {
//     const { user } = useAuth();
//     const role = user?.role || 'admin';
//     const rolePrefix = getRolePrefix(role);
//     const navigate = useNavigate();
//     const [isPending, setIsPending] = useState(false);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [cartItems, setCartItems] = useState([]);
//     const [products] = useState(dummyProducts);
//     const [highlightedIndex, setHighlightedIndex] = useState(-1);
//     const searchInputRef = useRef(null);
//     const resultsRef = useRef(null);

//     const {
//         register,
//         handleSubmit,
//         watch,
//         formState: { errors },
//     } = useForm({
//         resolver: zodResolver(invoiceSchema),
//         defaultValues: {
//             customerName: '',
//             tax: '10',
//             discount: '5',
//         },
//     });

//     const customerName = watch('customerName');
//     const tax = watch('tax');
//     const discount = watch('discount');

//     // Relevance scoring: exact match > starts with > contains
//     const getRelevanceScore = (product, term) => {
//         const name = product.name.toLowerCase();
//         const sku = product.sku.toLowerCase();
//         const q = term.toLowerCase();

//         if (name === q || sku === q) return 3;
//         if (name.startsWith(q) || sku.startsWith(q)) return 2;
//         if (name.includes(q) || sku.includes(q)) return 1;
//         return 0;
//     };

//     // Show all products by default; filter + rank by relevance once the user types
//     const searchResults = searchTerm
//         ? products
//             .map(product => ({ product, score: getRelevanceScore(product, searchTerm) }))
//             .filter(({ score }) => score > 0)
//             .sort((a, b) => b.score - a.score)
//             .map(({ product }) => product)
//         : products;

//     // The single best/most relevant match while searching (always first after sorting)
//     const bestMatchId = searchTerm && searchResults.length > 0 ? searchResults[0]._id : null;

//     // Reset highlight when search changes
//     useEffect(() => {
//         setHighlightedIndex(-1);
//     }, [searchTerm]);

//     // Handle keyboard navigation
//     const handleKeyDown = (e) => {
//         if (searchResults.length === 0) return;

//         if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             setHighlightedIndex((prev) =>
//                 prev < searchResults.length - 1 ? prev + 1 : prev
//             );
//         } else if (e.key === 'ArrowUp') {
//             e.preventDefault();
//             setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
//         } else if (e.key === 'Enter') {
//             e.preventDefault();
//             if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
//                 addToCart(searchResults[highlightedIndex]);
//                 setSearchTerm('');
//                 setHighlightedIndex(-1);
//             } else if (bestMatchId) {
//                 addToCart(searchResults[0]);
//                 setSearchTerm('');
//                 setHighlightedIndex(-1);
//             }
//         } else if (e.key === 'Escape') {
//             setSearchTerm('');
//             setHighlightedIndex(-1);
//             searchInputRef.current?.blur();
//         }
//     };

//     // Scroll highlighted item into view
//     useEffect(() => {
//         if (highlightedIndex >= 0 && resultsRef.current) {
//             const highlightedElement = resultsRef.current.querySelector(
//                 `[data-index="${highlightedIndex}"]`
//             );
//             if (highlightedElement) {
//                 highlightedElement.scrollIntoView({ block: 'nearest' });
//             }
//         }
//     }, [highlightedIndex]);

//     // Add product to cart
//     const addToCart = (product) => {
//         const existingItem = cartItems.find(item => item.productId === product._id);
//         if (existingItem) {
//             toast.info(`${product.name} is already in the cart. Update quantity instead.`);
//             return;
//         }
//         setCartItems([...cartItems, {
//             productId: product._id,
//             name: product.name,
//             sku: product.sku,
//             quantity: 1,
//             sellingPrice: product.sellingPrice,
//             availableStock: product.quantity,
//         }]);
//     };

//     // Remove product from cart
//     const removeFromCart = (productId) => {
//         setCartItems(cartItems.filter(item => item.productId !== productId));
//     };

//     // Update quantity
//     const updateQuantity = (productId, newQuantity) => {
//         if (newQuantity < 1) return;
//         const item = cartItems.find(item => item.productId === productId);
//         if (item && newQuantity > item.availableStock) {
//             toast.error(`Only ${item.availableStock} units available in stock`);
//             return;
//         }
//         setCartItems(cartItems.map(item =>
//             item.productId === productId ? { ...item, quantity: newQuantity } : item
//         ));
//     };

//     // Update selling price
//     const updatePrice = (productId, newPrice) => {
//         if (newPrice < 0) return;
//         setCartItems(cartItems.map(item =>
//             item.productId === productId ? { ...item, sellingPrice: newPrice } : item
//         ));
//     };

//     // Calculate totals
//     const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
//     const taxAmount = (subtotal * (parseFloat(tax) || 0)) / 100;
//     const discountAmountTotal = parseFloat(discount) || 0;
//     const total = subtotal + taxAmount - discountAmountTotal;

//     // Handle form submission
//     const onSubmit = async (values) => {
//         if (cartItems.length === 0) {
//             toast.error('Please add at least one product to the cart');
//             return;
//         }

//         setIsPending(true);

//         const invoiceData = {
//             customerName: values.customerName,
//             products: cartItems.map(item => ({
//                 productId: item.productId,
//                 quantity: item.quantity,
//                 sellingPrice: item.sellingPrice,
//             })),
//             tax: parseFloat(values.tax) || 0,
//             discount: parseFloat(values.discount) || 0,
//         };

//         // Simulate API call
//         try {
//             await new Promise(resolve => setTimeout(resolve, 1500));
//             toast.success(`Invoice created successfully! Total: $${total.toFixed(2)}`);
//             // Reset form and cart after successful creation
//             setCartItems([]);
//             setSearchTerm('');
//             setHighlightedIndex(-1);
//             // Stay on the same page
//         } catch (error) {
//             toast.error(error.message || 'Failed to create invoice. Please try again.');
//         } finally {
//             setIsPending(false);
//         }
//     };

//     return (
//         <div className="space-y-4 sm:space-y-6 pb-8">
//             {/* Page Header */}
//             <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//                 <div className="flex items-center gap-3">
//                     <Button
//                         variant="ghost"
//                         size="icon"
//                         className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
//                         onClick={() => navigate(-1)}
//                     >
//                         <ArrowLeft className="h-4 w-4" />
//                     </Button>
//                     <div>
//                         <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Generate Invoice</h1>
//                         <p className="text-sm text-muted-foreground">Create a new invoice for a customer</p>
//                     </div>
//                 </div>
//             </div>

//             <form onSubmit={handleSubmit(onSubmit)}>
//                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
//                     {/* Left Column - 7 Columns */}
//                     <div className="lg:col-span-7 space-y-4">
//                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                             {/* Customer Name */}
//                             <Field orientation="vertical">
//                                 <FieldLabel htmlFor="customerName" className="text-sm font-medium">
//                                     Customer Name <span className="text-destructive">*</span>
//                                 </FieldLabel>
//                                 <FieldContent>
//                                     <Input
//                                         id="customerName"
//                                         type="text"
//                                         placeholder="Enter customer name"
//                                         className="h-10 text-sm rounded-none"
//                                         {...register("customerName")}
//                                         aria-invalid={errors.customerName ? "true" : "false"}
//                                     />
//                                     {errors.customerName && (
//                                         <FieldError errors={[errors.customerName]} />
//                                     )}
//                                 </FieldContent>
//                             </Field>

//                             {/* Product Search */}
//                             <Field orientation="vertical">
//                                 <FieldLabel className="text-sm font-medium">Search Products</FieldLabel>
//                                 <FieldContent>
//                                     <div className="relative">
//                                         <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
//                                         <Input
//                                             ref={searchInputRef}
//                                             type="text"
//                                             placeholder="Search by name or SKU..."
//                                             value={searchTerm}
//                                             onChange={(e) => setSearchTerm(e.target.value)}
//                                             onKeyDown={handleKeyDown}
//                                             className="pl-8 pr-8 h-10 text-sm rounded-none"
//                                         />
//                                         {searchTerm && (
//                                             <button
//                                                 type="button"
//                                                 onClick={() => setSearchTerm('')}
//                                                 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
//                                             >
//                                                 <X className="h-4 w-4" />
//                                             </button>
//                                         )}
//                                     </div>
//                                 </FieldContent>
//                             </Field>
//                         </div>

//                         {/* Product Results - always visible, shows all products by default */}
//                         <div
//                             ref={resultsRef}
//                             className="rounded-md border overflow-hidden max-h-75 overflow-y-auto"
//                         >
//                             <Table>
//                                 <TableHeader>
//                                     <TableRow>
//                                         <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
//                                         <TableHead className="py-1.5 px-2 text-xs hidden sm:table-cell">SKU</TableHead>
//                                         <TableHead className="py-1.5 px-2 text-xs text-right">Price</TableHead>
//                                         <TableHead className="py-1.5 px-2 text-xs text-right">Stock</TableHead>
//                                         <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
//                                     </TableRow>
//                                 </TableHeader>
//                                 <TableBody>
//                                     {searchResults.length === 0 ? (
//                                         <TableRow>
//                                             <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
//                                                 No products found
//                                             </TableCell>
//                                         </TableRow>
//                                     ) : (
//                                         searchResults.map((product, index) => {
//                                             const isBestMatch = product._id === bestMatchId;
//                                             const isKeyboardHighlighted = highlightedIndex === index;
//                                             return (
//                                                 <TableRow
//                                                     key={product._id}
//                                                     data-index={index}
//                                                     className={cn(
//                                                         "transition-colors cursor-pointer",
//                                                         isBestMatch && "bg-primary/15 hover:bg-primary/20 ring-1 ring-inset ring-primary/40",
//                                                         isKeyboardHighlighted && "bg-primary text-primary-foreground hover:bg-primary"
//                                                     )}
//                                                     onMouseEnter={() => setHighlightedIndex(index)}
//                                                     onMouseLeave={() => setHighlightedIndex(-1)}
//                                                     onClick={() => {
//                                                         addToCart(product);
//                                                         setSearchTerm('');
//                                                         setHighlightedIndex(-1);
//                                                     }}
//                                                 >
//                                                     <TableCell className="py-1.5 px-2 text-xs font-medium">
//                                                         <div className="flex items-center gap-1.5">
//                                                             {product.name}
//                                                         </div>
//                                                     </TableCell>
//                                                     <TableCell className={cn(
//                                                         "py-1.5 px-2 text-xs hidden sm:table-cell",
//                                                         !isKeyboardHighlighted && "text-muted-foreground"
//                                                     )}>
//                                                         {product.sku}
//                                                     </TableCell>
//                                                     <TableCell className="py-1.5 px-2 text-xs text-right">
//                                                         ${product.sellingPrice.toFixed(2)}
//                                                     </TableCell>
//                                                     <TableCell className="py-1.5 px-2 text-xs text-center">
//                                                         {product.quantity}
//                                                     </TableCell>
//                                                     <TableCell className="py-1.5 px-2 text-xs text-center">
//                                                         <Button
//                                                             type="button"
//                                                             size="sm"
//                                                             variant={isKeyboardHighlighted ? "secondary" : "default"}
//                                                             className="h-6 px-2 text-[10px]"
//                                                             onClick={(e) => {
//                                                                 e.stopPropagation();
//                                                                 addToCart(product);
//                                                                 setSearchTerm('');
//                                                                 setHighlightedIndex(-1);
//                                                             }}
//                                                             disabled={product.quantity === 0}
//                                                         >
//                                                             <Plus className="h-3 w-3 mr-0.5" />
//                                                             Add
//                                                         </Button>
//                                                     </TableCell>
//                                                 </TableRow>
//                                             );
//                                         })
//                                     )}
//                                 </TableBody>
//                             </Table>
//                         </div>
//                     </div>

//                     {/* Right Column - 5 Columns */}
//                     <div className="lg:col-span-5 space-y-4">
//                         <div className="rounded-md border p-4">
//                             <div className="flex items-center justify-between mb-4">
//                                 <h3 className="text-sm font-medium">Cart</h3>
//                                 <Badge variant="outline" className="text-[10px]">
//                                     {cartItems.length} items
//                                 </Badge>
//                             </div>

//                             {cartItems.length === 0 ? (
//                                 <div className="text-center py-8 text-muted-foreground">
//                                     <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
//                                     <p className="text-sm">No products added yet</p>
//                                     <p className="text-xs">Search and add products from the left</p>
//                                 </div>
//                             ) : (
//                                 <div className="space-y-3">
//                                     <div className="overflow-x-auto">
//                                         <Table>
//                                             <TableHeader>
//                                                 <TableRow>
//                                                     <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
//                                                     <TableHead className="py-1.5 px-2 text-xs text-center">Qty</TableHead>
//                                                     <TableHead className="py-1.5 px-2 text-xs text-right">Price</TableHead>
//                                                     <TableHead className="py-1.5 px-2 text-xs text-right">Subtotal</TableHead>
//                                                     <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
//                                                 </TableRow>
//                                             </TableHeader>
//                                             <TableBody>
//                                                 {cartItems.map((item) => (
//                                                     <TableRow key={item.productId}>
//                                                         <TableCell className="py-1.5 px-2 text-xs">
//                                                             <div className="font-medium">{item.name}</div>
//                                                             <div className="text-[10px] text-muted-foreground">{item.sku}</div>
//                                                         </TableCell>
//                                                         <TableCell className="py-1.5 px-2 text-xs">
//                                                             <div className="flex items-center justify-center gap-1">
//                                                                 <Button
//                                                                     type="button"
//                                                                     variant="outline"
//                                                                     size="icon"
//                                                                     className="h-5 w-5"
//                                                                     onClick={() => updateQuantity(item.productId, item.quantity - 1)}
//                                                                 >
//                                                                     -
//                                                                 </Button>
//                                                                 <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
//                                                                 <Button
//                                                                     type="button"
//                                                                     variant="outline"
//                                                                     size="icon"
//                                                                     className="h-5 w-5"
//                                                                     onClick={() => updateQuantity(item.productId, item.quantity + 1)}
//                                                                 >
//                                                                     +
//                                                                 </Button>
//                                                             </div>
//                                                         </TableCell>
//                                                         <TableCell className="py-1.5 px-2 text-xs text-right">
//                                                             <Input
//                                                                 type="number"
//                                                                 step="0.01"
//                                                                 value={item.sellingPrice}
//                                                                 onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
//                                                                 className="h-6 w-20 text-xs text-right rounded-none"
//                                                             />
//                                                         </TableCell>
//                                                         <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
//                                                             ${(item.quantity * item.sellingPrice).toFixed(2)}
//                                                         </TableCell>
//                                                         <TableCell className="py-1.5 px-2 text-xs text-center">
//                                                             <Button
//                                                                 type="button"
//                                                                 variant="ghost"
//                                                                 size="icon"
//                                                                 className="h-5 w-5 text-destructive hover:text-destructive"
//                                                                 onClick={() => removeFromCart(item.productId)}
//                                                             >
//                                                                 <Trash2 className="h-3 w-3" />
//                                                             </Button>
//                                                         </TableCell>
//                                                     </TableRow>
//                                                 ))}
//                                             </TableBody>
//                                         </Table>
//                                     </div>

//                                     {/* Summary */}
//                                     <div className="border-t pt-3 space-y-1.5">
//                                         <div className="flex justify-between text-xs">
//                                             <span className="text-muted-foreground">Subtotal</span>
//                                             <span className="font-medium">${subtotal.toFixed(2)}</span>
//                                         </div>
//                                         <div className="flex justify-between text-xs">
//                                             <span className="text-muted-foreground">Tax ({tax || 0}%)</span>
//                                             <span className="font-medium">${taxAmount.toFixed(2)}</span>
//                                         </div>
//                                         <div className="flex justify-between text-xs">
//                                             <span className="text-muted-foreground">Discount</span>
//                                             <span className="font-medium text-red-500">-${discountAmountTotal.toFixed(2)}</span>
//                                         </div>
//                                         <div className="flex justify-between text-sm font-bold pt-1 border-t">
//                                             <span>Total</span>
//                                             <span className="text-primary">${total.toFixed(2)}</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>

//                         {/* Tax & Discount Inputs */}
//                         <div className="grid grid-cols-2 gap-4">
//                             <Field orientation="vertical">
//                                 <FieldLabel htmlFor="tax" className="text-xs font-medium">
//                                     Tax (%)
//                                 </FieldLabel>
//                                 <FieldContent>
//                                     <Input
//                                         id="tax"
//                                         type="number"
//                                         step="0.1"
//                                         placeholder="0"
//                                         className="h-9 text-sm rounded-none"
//                                         {...register("tax")}
//                                     />
//                                 </FieldContent>
//                             </Field>

//                             <Field orientation="vertical">
//                                 <FieldLabel htmlFor="discount" className="text-xs font-medium">
//                                     Discount ($)
//                                 </FieldLabel>
//                                 <FieldContent>
//                                     <Input
//                                         id="discount"
//                                         type="number"
//                                         step="0.01"
//                                         placeholder="0"
//                                         className="h-9 text-sm rounded-none"
//                                         {...register("discount")}
//                                     />
//                                 </FieldContent>
//                             </Field>
//                         </div>

//                         {/* Generate Button */}
//                         <Button
//                             type="submit"
//                             className="w-full h-10 text-sm font-medium"
//                             disabled={cartItems.length === 0 || isPending}
//                         >
//                             {isPending ? (
//                                 <>
//                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                                     Generating Invoice...
//                                 </>
//                             ) : (
//                                 'Generate Invoice'
//                             )}
//                         </Button>
//                     </div>
//                 </div>
//             </form>
//         </div>
//     );
// };

// export default GenerateInvoice;


// pages/invoices/GenerateInvoice.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import * as z from 'zod';
import {
    Field,
    FieldLabel,
    FieldError,
    FieldContent,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    Search,
    Plus,
    Loader2,
    Package,
    Trash2,
    X,
    List,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ROLES } from '@/routes';

// Dummy Data
const dummyProducts = [
    { _id: '1', name: 'Wireless Mouse', sku: 'SKU-001', sellingPrice: 29.99, quantity: 45 },
    { _id: '2', name: 'USB-C Charger', sku: 'SKU-002', sellingPrice: 19.99, quantity: 8 },
    { _id: '3', name: 'Bluetooth Speaker', sku: 'SKU-003', sellingPrice: 49.99, quantity: 2 },
    { _id: '4', name: 'HDMI Cable', sku: 'SKU-004', sellingPrice: 9.99, quantity: 120 },
    { _id: '5', name: 'Wireless Keyboard', sku: 'SKU-005', sellingPrice: 59.99, quantity: 15 },
];

// Zod schema for validation
const invoiceSchema = z.object({
    customerName: z.string().min(2, { message: 'Customer name is required' }),
    tax: z.string().optional().transform(val => val ? parseFloat(val) : 0),
    discount: z.string().optional().transform(val => val ? parseFloat(val) : 0),
});

const GenerateInvoice = () => {
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);
    const navigate = useNavigate();
    const [isPending, setIsPending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [products] = useState(dummyProducts);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const searchInputRef = useRef(null);
    const resultsRef = useRef(null);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            customerName: '',
            tax: '10',
            discount: '5',
        },
    });

    const customerName = watch('customerName');
    const tax = watch('tax');
    const discount = watch('discount');

    // Determine which invoice list link to show
    const isAdminOrManager = role === ROLES.ADMIN || role === ROLES.MANAGER;
    const invoicesListLabel = isAdminOrManager ? 'All Invoices' : 'My Invoices';
    const invoicesListPath = isAdminOrManager ? `/${rolePrefix}/invoices` : `/${rolePrefix}/invoices`;

    // Relevance scoring: exact match > starts with > contains
    const getRelevanceScore = (product, term) => {
        const name = product.name.toLowerCase();
        const sku = product.sku.toLowerCase();
        const q = term.toLowerCase();

        if (name === q || sku === q) return 3;
        if (name.startsWith(q) || sku.startsWith(q)) return 2;
        if (name.includes(q) || sku.includes(q)) return 1;
        return 0;
    };

    // Show all products by default; filter + rank by relevance once the user types
    const searchResults = searchTerm
        ? products
            .map(product => ({ product, score: getRelevanceScore(product, searchTerm) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .map(({ product }) => product)
        : products;

    const bestMatchId = searchTerm && searchResults.length > 0 ? searchResults[0]._id : null;

    // Reset highlight when search changes
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [searchTerm]);

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (searchResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev < searchResults.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
                addToCart(searchResults[highlightedIndex]);
                setSearchTerm('');
                setHighlightedIndex(-1);
            } else if (bestMatchId) {
                addToCart(searchResults[0]);
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        } else if (e.key === 'Escape') {
            setSearchTerm('');
            setHighlightedIndex(-1);
            searchInputRef.current?.blur();
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && resultsRef.current) {
            const highlightedElement = resultsRef.current.querySelector(
                `[data-index="${highlightedIndex}"]`
            );
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    // Add product to cart
    const addToCart = (product) => {
        const existingItem = cartItems.find(item => item.productId === product._id);
        if (existingItem) {
            toast.info(`${product.name} is already in the cart. Update quantity instead.`);
            return;
        }
        setCartItems([...cartItems, {
            productId: product._id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            sellingPrice: product.sellingPrice,
            availableStock: product.quantity,
        }]);
    };

    // Remove product from cart
    const removeFromCart = (productId) => {
        setCartItems(cartItems.filter(item => item.productId !== productId));
    };

    // Update quantity
    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return;
        const item = cartItems.find(item => item.productId === productId);
        if (item && newQuantity > item.availableStock) {
            toast.error(`Only ${item.availableStock} units available in stock`);
            return;
        }
        setCartItems(cartItems.map(item =>
            item.productId === productId ? { ...item, quantity: newQuantity } : item
        ));
    };

    // Update selling price
    const updatePrice = (productId, newPrice) => {
        if (newPrice < 0) return;
        setCartItems(cartItems.map(item =>
            item.productId === productId ? { ...item, sellingPrice: newPrice } : item
        ));
    };

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
    const taxAmount = (subtotal * (parseFloat(tax) || 0)) / 100;
    const discountAmountTotal = parseFloat(discount) || 0;
    const total = subtotal + taxAmount - discountAmountTotal;

    // Handle form submission
    const onSubmit = async (values) => {
        if (cartItems.length === 0) {
            toast.error('Please add at least one product to the cart');
            return;
        }

        setIsPending(true);

        const invoiceData = {
            customerName: values.customerName,
            products: cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                sellingPrice: item.sellingPrice,
            })),
            tax: parseFloat(values.tax) || 0,
            discount: parseFloat(values.discount) || 0,
        };

        // Simulate API call
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success(`Invoice created successfully! Total: $${total.toFixed(2)}`);
            // Reset form and cart after successful creation
            setCartItems([]);
            setSearchTerm('');
            setHighlightedIndex(-1);
        } catch (error) {
            toast.error(error.message || 'Failed to create invoice. Please try again.');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Generate Invoice</h1>
                        <p className="text-sm text-muted-foreground">Create a new invoice for a customer</p>
                    </div>
                </div>

                {/* ✅ Invoice List Link - Admin/Manager see "All Invoices", Staff sees "My Invoices" */}
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                    <Link to={invoicesListPath} className="flex items-center">
                        <List className="mr-2 h-4 w-4" />
                        {invoicesListLabel}
                    </Link>
                </Button>
            </div>

            {/* Rest of the form - same as before */}
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* ... form content remains the same ... */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column - 7 Columns */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Customer Name */}
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="customerName" className="text-sm font-medium">
                                    Customer Name <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="customerName"
                                        type="text"
                                        placeholder="Enter customer name"
                                        className="h-10 text-sm rounded-none"
                                        {...register("customerName")}
                                        aria-invalid={errors.customerName ? "true" : "false"}
                                    />
                                    {errors.customerName && (
                                        <FieldError errors={[errors.customerName]} />
                                    )}
                                </FieldContent>
                            </Field>

                            {/* Product Search */}
                            <Field orientation="vertical">
                                <FieldLabel className="text-sm font-medium">Search Products</FieldLabel>
                                <FieldContent>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="Search by name or SKU..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className="pl-8 pr-8 h-10 text-sm rounded-none"
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Product Results */}
                        <div
                            ref={resultsRef}
                            className="rounded-md border overflow-hidden max-h-75 overflow-y-auto"
                        >
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs hidden sm:table-cell">SKU</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-right">Price</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-right">Stock</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {searchResults.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                                                No products found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        searchResults.map((product, index) => {
                                            const isBestMatch = product._id === bestMatchId;
                                            const isKeyboardHighlighted = highlightedIndex === index;
                                            return (
                                                <TableRow
                                                    key={product._id}
                                                    data-index={index}
                                                    className={cn(
                                                        "transition-colors cursor-pointer",
                                                        isBestMatch && "bg-primary/15 hover:bg-primary/20 ring-1 ring-inset ring-primary/40",
                                                        isKeyboardHighlighted && "bg-primary text-primary-foreground hover:bg-primary"
                                                    )}
                                                    onMouseEnter={() => setHighlightedIndex(index)}
                                                    onMouseLeave={() => setHighlightedIndex(-1)}
                                                    onClick={() => {
                                                        addToCart(product);
                                                        setSearchTerm('');
                                                        setHighlightedIndex(-1);
                                                    }}
                                                >
                                                    <TableCell className="py-1.5 px-2 text-xs font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            {product.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className={cn(
                                                        "py-1.5 px-2 text-xs hidden sm:table-cell",
                                                        !isKeyboardHighlighted && "text-muted-foreground"
                                                    )}>
                                                        {product.sku}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-2 text-xs text-right">
                                                        ${product.sellingPrice.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-2 text-xs text-center">
                                                        {product.quantity}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-2 text-xs text-center">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={isKeyboardHighlighted ? "secondary" : "default"}
                                                            className="h-6 px-2 text-[10px]"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addToCart(product);
                                                                setSearchTerm('');
                                                                setHighlightedIndex(-1);
                                                            }}
                                                            disabled={product.quantity === 0}
                                                        >
                                                            <Plus className="h-3 w-3 mr-0.5" />
                                                            Add
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Right Column - 5 Columns */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="rounded-md border p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium">Cart</h3>
                                <Badge variant="outline" className="text-[10px]">
                                    {cartItems.length} items
                                </Badge>
                            </div>

                            {cartItems.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No products added yet</p>
                                    <p className="text-xs">Search and add products from the left</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
                                                    <TableHead className="py-1.5 px-2 text-xs text-center">Qty</TableHead>
                                                    <TableHead className="py-1.5 px-2 text-xs text-right">Price</TableHead>
                                                    <TableHead className="py-1.5 px-2 text-xs text-right">Subtotal</TableHead>
                                                    <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cartItems.map((item) => (
                                                    <TableRow key={item.productId}>
                                                        <TableCell className="py-1.5 px-2 text-xs">
                                                            <div className="font-medium">{item.name}</div>
                                                            <div className="text-[10px] text-muted-foreground">{item.sku}</div>
                                                        </TableCell>
                                                        <TableCell className="py-1.5 px-2 text-xs">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-5 w-5"
                                                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                                >
                                                                    -
                                                                </Button>
                                                                <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-5 w-5"
                                                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                                >
                                                                    +
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-1.5 px-2 text-xs text-right">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={item.sellingPrice}
                                                                onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                                                                className="h-6 w-20 text-xs text-right rounded-none"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                            ${(item.quantity * item.sellingPrice).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="py-1.5 px-2 text-xs text-center">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 text-destructive hover:text-destructive"
                                                                onClick={() => removeFromCart(item.productId)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Summary */}
                                    <div className="border-t pt-3 space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span className="font-medium">${subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Tax ({tax || 0}%)</span>
                                            <span className="font-medium">${taxAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Discount</span>
                                            <span className="font-medium text-red-500">-${discountAmountTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold pt-1 border-t">
                                            <span>Total</span>
                                            <span className="text-primary">${total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tax & Discount Inputs */}
                        <div className="grid grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="tax" className="text-xs font-medium">
                                    Tax (%)
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="tax"
                                        type="number"
                                        step="0.1"
                                        placeholder="0"
                                        className="h-9 text-sm rounded-none"
                                        {...register("tax")}
                                    />
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="discount" className="text-xs font-medium">
                                    Discount ($)
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="discount"
                                        type="number"
                                        step="0.01"
                                        placeholder="0"
                                        className="h-9 text-sm rounded-none"
                                        {...register("discount")}
                                    />
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Generate Button */}
                        <Button
                            type="submit"
                            className="w-full h-10 text-sm font-medium"
                            disabled={cartItems.length === 0 || isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Invoice...
                                </>
                            ) : (
                                'Generate Invoice'
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default GenerateInvoice;